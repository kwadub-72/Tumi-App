import { create } from 'zustand';
import { supabase } from '@/src/shared/services/supabase';
import { useAuthStore } from '../../../store/AuthStore';

export interface Notification {
  id: string;
  recipient_id: string;
  sender_id: string | null;
  type: string;
  title: string;
  body: string;
  data: any;
  is_read: boolean;
  created_at: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;

  // Actions
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,

  fetchNotifications: async () => {
    const session = useAuthStore.getState().session;
    const userId = session?.user?.id;
    if (!userId) return;

    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const notifications = (data || []) as Notification[];
      const unreadCount = notifications.filter(n => !n.is_read).length;

      set({ notifications, unreadCount, loading: false });
    } catch (err: any) {
      console.error('[NotificationStore] fetchNotifications error:', err);
      set({ error: err.message, loading: false });
    }
  },

  markAsRead: async (id: string) => {
    set({ error: null });
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;

      const notifications = get().notifications.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      );
      const unreadCount = notifications.filter(n => !n.is_read).length;

      set({ notifications, unreadCount });
    } catch (err: any) {
      console.error('[NotificationStore] markAsRead error:', err);
      set({ error: err.message });
    }
  },

  markAllAsRead: async () => {
    const session = useAuthStore.getState().session;
    const userId = session?.user?.id;
    if (!userId) return;

    set({ error: null });
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', userId)
        .eq('is_read', false);

      if (error) throw error;

      const notifications = get().notifications.map(n => ({ ...n, is_read: true }));
      set({ notifications, unreadCount: 0 });
    } catch (err: any) {
      console.error('[NotificationStore] markAllAsRead error:', err);
      set({ error: err.message });
    }
  },
}));
