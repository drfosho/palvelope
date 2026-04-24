import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

// ─── Auth storage adapter ───────────────────────────────────────────────────

const SecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.warn("SecureStore setItem failed:", e);
    }
  },
  removeItem: async (key: string) => {
    try {
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

export type Conversation = {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
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
  const { data } = await supabase
    .from("conversations")
    .select(
      `
      *,
      participant_1_profile:profiles!conversations_participant_1_fkey(id, display_name, home_region),
      participant_2_profile:profiles!conversations_participant_2_fkey(id, display_name, home_region)
    `
    )
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
    .order("last_message_at", { ascending: false });
  return data ?? [];
}

export async function getOrCreateConversation(
  userId: string,
  palId: string
): Promise<string | null> {
  // Check if conversation already exists (either direction)
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .or(
      `and(participant_1.eq.${userId},participant_2.eq.${palId}),and(participant_1.eq.${palId},participant_2.eq.${userId})`
    )
    .single();

  if (existing) return existing.id;

  // Create new conversation
  const { data: created } = await supabase
    .from("conversations")
    .insert({ participant_1: userId, participant_2: palId })
    .select("id")
    .single();

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

// ─── Match helpers ──────────────────────────────────────────────────────────

export async function getTodaysMatches(userId: string) {
  const { data } = await supabase
    .from("matches")
    .select(
      `
      *,
      matched_profile:profiles!matches_matched_user_id_fkey(*)
    `
    )
    .eq("user_id", userId)
    .eq("batch_date", new Date().toISOString().split("T")[0])
    .eq("status", "pending")
    .order("compatibility_score", { ascending: false });
  return data ?? [];
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
