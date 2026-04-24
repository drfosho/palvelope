import { create } from "zustand";

export type NotificationPrefKey =
  | "newLetter"
  | "letterReplied"
  | "newMatch"
  | "matchAccepted"
  | "replyReminder"
  | "dailyBatch";

interface NotificationPrefs {
  newLetter: boolean;
  letterReplied: boolean;
  newMatch: boolean;
  matchAccepted: boolean;
  replyReminder: boolean;
  dailyBatch: boolean;
  setPreference: (key: NotificationPrefKey, value: boolean) => void;
}

// TODO: Create notification_preferences table and sync these to Supabase
export const useNotificationStore = create<NotificationPrefs>((set) => ({
  newLetter: true,
  letterReplied: true,
  newMatch: true,
  matchAccepted: true,
  replyReminder: false,
  dailyBatch: true,
  setPreference: (key, value) => set({ [key]: value } as Partial<NotificationPrefs>),
}));
