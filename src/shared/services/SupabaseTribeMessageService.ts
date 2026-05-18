import { supabase } from './supabase';

export interface TribeMessage {
    id: string;
    tribe_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    sender?: {
        handle: string;
        name: string;
        avatar_url: string;
        status?: string;
        activity?: string;
        activity_icon?: string;
    };
}

export const SupabaseTribeMessageService = {
    async getTribeMessages(tribeId: string, limit: number = 25, offset: number = 0): Promise<TribeMessage[]> {
        const { data, error } = await supabase
            .from('tribe_messages')
            .select('*, sender:profiles!sender_id(handle, name, avatar_url, status, activity, activity_icon)')
            .eq('tribe_id', tribeId)
            .order('created_at', { ascending: false }) // Newest first for fetching
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('[SupabaseTribeMessageService.getTribeMessages]', error.message);
            return [];
        }

        // Return reversed to show oldest first in chat UI
        return (data as TribeMessage[]).reverse();
    },

    async sendTribeMessage(tribeId: string, senderId: string, content: string): Promise<TribeMessage | null> {
        const { data, error } = await supabase
            .from('tribe_messages')
            .insert({ tribe_id: tribeId, sender_id: senderId, content })
            .select('*, sender:profiles!sender_id(handle, name, avatar_url, status, activity, activity_icon)')
            .single();

        if (error) {
            console.error('[SupabaseTribeMessageService.sendTribeMessage]', error.message);
            return null;
        }

        return data as TribeMessage;
    }
};
