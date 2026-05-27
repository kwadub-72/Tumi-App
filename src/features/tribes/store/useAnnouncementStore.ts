import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/shared/services/supabase';

export interface TribeAnnouncement {
    id: string;
    tribe_id: string;
    title: string;
    message: string;
    created_at: string;
}

interface AnnouncementStore {
    activeAnnouncement: TribeAnnouncement | null;
    isModalVisible: boolean;
    checkAnnouncements: (tribeId: string) => Promise<void>;
    markAsRead: () => Promise<void>;
    closeModal: () => void;
}

const STORAGE_KEY = '@tumi_last_tribe_announcement_read_at';

export const useAnnouncementStore = create<AnnouncementStore>((set, get) => ({
    activeAnnouncement: null,
    isModalVisible: false,
    
    checkAnnouncements: async (tribeId: string) => {
        if (!tribeId) return;
        
        try {
            const lastReadStr = await AsyncStorage.getItem(STORAGE_KEY);
            let lastReadDate = 0;
            if (lastReadStr) {
                lastReadDate = new Date(lastReadStr).getTime();
            }
            
            // Assume the existence of a feed or announcement channel
            // In the absence of a dedicated table, we can simulate an announcement based on competitions or feed events
            // We'll query a generic 'tribe_announcements' table for now
            const { data, error } = await supabase
                .from('tribe_announcements')
                .select('*')
                .eq('tribe_id', tribeId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            
            if (data && !error) {
                const announcementDate = new Date(data.created_at).getTime();
                if (announcementDate > lastReadDate) {
                    set({ activeAnnouncement: data as TribeAnnouncement, isModalVisible: true });
                }
            } else {
                // Mock behavior if the table does not exist
                const mockAnnouncement: TribeAnnouncement = {
                    id: 'mock-123',
                    tribe_id: tribeId,
                    title: 'Welcome to the new Season!',
                    message: 'Get ready for our new Faceoff competition starting this week. Log your meals early.',
                    created_at: new Date().toISOString()
                };
                
                // If it's the very first time the user opens the app, we can show a mock announcement
                if (!lastReadStr) {
                    set({ activeAnnouncement: mockAnnouncement, isModalVisible: true });
                }
            }
        } catch (e) {
            console.error('[useAnnouncementStore.checkAnnouncements] Failed', e);
        }
    },
    
    markAsRead: async () => {
        const { activeAnnouncement } = get();
        if (activeAnnouncement) {
            await AsyncStorage.setItem(STORAGE_KEY, new Date().toISOString());
            set({ isModalVisible: false, activeAnnouncement: null });
        }
    },
    
    closeModal: () => set({ isModalVisible: false })
}));
