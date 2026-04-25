import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

// ─── Auth storage adapter ───────────────────────────────────────────────────
// Values can exceed SecureStore's 2048-byte limit (Supabase JWTs + refresh
// tokens). We chunk into `${key}.${i}` entries and transparently rejoin them.

const CHUNK_SIZE = 1800;

const SecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      const chunks: string[] = [];
      let i = 0;
      while (true) {
        const chunk = await SecureStore.getItemAsync(`${key}.${i}`);
        if (chunk === null) break;
        chunks.push(chunk);
        i++;
      }
      if (chunks.length === 0) {
        // Try legacy single-key format
        return await SecureStore.getItemAsync(key);
      }
      return chunks.join("");
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      // Delete old chunks first
      let i = 0;
      while (true) {
        const existing = await SecureStore.getItemAsync(`${key}.${i}`);
        if (existing === null) break;
        await SecureStore.deleteItemAsync(`${key}.${i}`);
        i++;
      }
      // Write new chunks
      for (let j = 0; j * CHUNK_SIZE < value.length; j++) {
        const chunk = value.slice(j * CHUNK_SIZE, (j + 1) * CHUNK_SIZE);
        await SecureStore.setItemAsync(`${key}.${j}`, chunk);
      }
    } catch (e) {
      console.warn("SecureStore setItem failed:", e);
    }
  },
  removeItem: async (key: string) => {
    try {
      let i = 0;
      while (true) {
        const existing = await SecureStore.getItemAsync(`${key}.${i}`);
        if (existing === null) break;
        await SecureStore.deleteItemAsync(`${key}.${i}`);
        i++;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn("SecureStore removeItem failed:", e);
    }
  },
};

// ─── Client setup ───────────────────────────────────────────────────────────

const extra = Constants.expoConfig?.extra ?? {};
const supabaseUrl: string = extra.supabaseUrl ?? "";
const supabaseAnonKey: string = extra.supabaseAnonKey ?? "";

const isConfigured =
  supabaseUrl.length > 0 &&
  supabaseAnonKey.length > 0 &&
  !supabaseUrl.includes("placeholder");

function buildClient(): SupabaseClient {
  if (!isConfigured) {
    console.warn(
      "[Palvelope] Supabase credentials missing or placeholder — auth features disabled. " +
        "Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env"
    );
  }

  return createClient(
    supabaseUrl || "https://placeholder.supabase.co",
    supabaseAnonKey || "placeholder",
    {
      auth: {
        storage: SecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    }
  );
}

export const supabase = buildClient();
export { isConfigured as supabaseReady };

// ─── Types ──────────────────────────────────────────────────────────────────

export type Profile = {
  id: string;
  display_name: string | null;
  bio: string | null;
  interests: string[];
  intents: string[];
  anonymity_level: "anonymous" | "pen_name" | "open";
  reply_style: "quick" | "thoughtful" | "deep";
  home_region: string | null;
  target_regions: string[];
  show_location: boolean;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
};
// -- Add column: alter table profiles add column if not exists intents text[] default '{}';

export type ConversationMode = "live" | "thoughtful" | "letterlike";

export type Conversation = {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
  // Added in 007_letter_expiry.sql — optional for older rows
  status?: "active" | "archived" | "expired" | null;
  expires_at?: string | null;
  expiry_days?: number | null;
  archived_at?: string | null;
  archived_by?: string | null;
  // Added in 010_memories.sql
  mode?: ConversationMode | null;
  mode_proposed?: ConversationMode | null;
  mode_proposed_by?: string | null;
  mode_proposal_created_at?: string | null;
  last_prompt_sent_at?: string | null;
  message_count?: number | null;
};

export type Moment = {
  id: string;
  conversation_id: string;
  saved_by: string;
  message_id: string | null;
  content: string;
  note: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  // Reserved for future use — not surfaced in UI
  ai_flagged: boolean;
  ai_flag_reason: string | null;
};

export type Match = {
  id: string;
  user_id: string;
  matched_user_id: string;
  compatibility_score: number;
  batch_date: string;
  status: "pending" | "accepted" | "passed";
  created_at: string;
};

// ─── Profile helpers ────────────────────────────────────────────────────────

export async function updateProfile(
  profile: Partial<Profile> & { id: string }
) {
  if (!isConfigured) {
    console.warn(
      "[Palvelope] Supabase not configured — skipping profile upsert"
    );
    return { error: null };
  }

  const { error } = await supabase
    .from("profiles")
    .upsert(profile, { onConflict: "id" });
  return { error };
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return data;
}

// ─── Conversation helpers ───────────────────────────────────────────────────

export async function getConversations(userId: string) {
  // Step 1: get conversations
  const { data: convos, error: convosError } = await supabase
    .from("conversations")
    .select("*")
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
    .order("last_message_at", { ascending: false });

  if (convosError) {
    console.error("[getConversations] error:", convosError);
    return [];
  }
  if (!convos || convos.length === 0) return [];

  // Step 2: get the other participant IDs
  const otherIds = convos.map((c: any) =>
    c.participant_1 === userId ? c.participant_2 : c.participant_1
  );

  // Step 3: fetch their profiles
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, display_name, home_region, reply_style, interests")
    .in("id", otherIds);

  if (profilesError) {
    console.error("[getConversations] profiles error:", profilesError);
  }

  // Step 4: stitch together
  return convos.map((c: any) => {
    const otherId =
      c.participant_1 === userId ? c.participant_2 : c.participant_1;
    const otherProfile = profiles?.find((p: any) => p.id === otherId) ?? null;
    return {
      ...c,
      participant_1_profile:
        c.participant_1 === userId ? null : otherProfile,
      participant_2_profile:
        c.participant_2 === userId ? null : otherProfile,
      other_profile: otherProfile,
    };
  });
}

export async function getOrCreateConversation(
  userId: string,
  palId: string,
  expiryDays: number | null = null
): Promise<string | null> {
  // Check if conversation already exists (either direction)
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .or(
      `and(participant_1.eq.${userId},participant_2.eq.${palId}),and(participant_1.eq.${palId},participant_2.eq.${userId})`
    )
    .maybeSingle();

  if (existing) return existing.id;

  const expiresAt = expiryDays
    ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // Create new conversation
  const { data: created, error: createErr } = await supabase
    .from("conversations")
    .insert({
      participant_1: userId,
      participant_2: palId,
      expires_at: expiresAt,
      expiry_days: expiryDays,
      status: "active",
    })
    .select("id")
    .single();

  if (createErr) {
    console.error("[getOrCreateConversation] insert error:", createErr);
    return null;
  }

  return created?.id ?? null;
}

// ─── Message helpers ────────────────────────────────────────────────────────

export async function getMessages(conversationId: string) {
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
) {
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, content })
    .select()
    .single();
  return { data, error };
}

// ─── Moment helpers ─────────────────────────────────────────────────────────

export async function saveMoment(
  conversationId: string,
  savedBy: string,
  messageId: string,
  content: string,
  note?: string
) {
  const { error } = await supabase.from("moments").insert({
    conversation_id: conversationId,
    saved_by: savedBy,
    message_id: messageId,
    content,
    note: note || null,
  });
  return { error };
}

export async function getMoments(conversationId: string): Promise<Moment[]> {
  const { data } = await supabase
    .from("moments")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Moment[];
}

export async function deleteMoment(momentId: string) {
  const { error } = await supabase
    .from("moments")
    .delete()
    .eq("id", momentId);
  return { error };
}

// ─── Conversation mode helpers ──────────────────────────────────────────────

export async function proposeMode(
  conversationId: string,
  proposedBy: string,
  mode: ConversationMode
) {
  const { error } = await supabase
    .from("conversations")
    .update({
      mode_proposed: mode,
      mode_proposed_by: proposedBy,
      mode_proposal_created_at: new Date().toISOString(),
    })
    .eq("id", conversationId);
  return { error };
}

export async function resolveMode(
  conversationId: string,
  accept: boolean,
  proposedMode: ConversationMode
) {
  const update = accept
    ? {
        mode: proposedMode,
        mode_proposed: null,
        mode_proposed_by: null,
        mode_proposal_created_at: null,
      }
    : {
        mode_proposed: null,
        mode_proposed_by: null,
        mode_proposal_created_at: null,
      };
  const { error } = await supabase
    .from("conversations")
    .update(update)
    .eq("id", conversationId);
  return { error };
}

// ─── Match helpers ──────────────────────────────────────────────────────────

export async function getTodaysMatches(userId: string) {
  // Two-step fetch: matches.matched_user_id references auth.users(id), not
  // profiles(id), so PostgREST can't auto-resolve an embedded profile join.
  // We pull matches first, then profiles by id, and stitch them together.
  const today = new Date().toISOString().split("T")[0];

  const { data: matches, error: matchErr } = await supabase
    .from("matches")
    .select("*")
    .eq("user_id", userId)
    .eq("batch_date", today)
    .eq("status", "pending")
    .order("compatibility_score", { ascending: false });

  if (matchErr) {
    console.warn("[getTodaysMatches] matches query error:", matchErr);
    return [];
  }
  if (!matches || matches.length === 0) return [];

  const matchedIds = matches.map((m: any) => m.matched_user_id);
  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select("*")
    .in("id", matchedIds);

  if (profErr) {
    console.warn("[getTodaysMatches] profiles query error:", profErr);
    return matches.map((m: any) => ({ ...m, matched_profile: null }));
  }

  const byId = new Map<string, any>();
  (profiles ?? []).forEach((p: any) => byId.set(p.id, p));

  return matches.map((m: any) => ({
    ...m,
    matched_profile: byId.get(m.matched_user_id) ?? null,
  }));
}

export async function updateMatchStatus(
  matchId: string,
  status: "accepted" | "passed"
) {
  const { error } = await supabase
    .from("matches")
    .update({ status })
    .eq("id", matchId);
  return { error };
}
