import { supabase } from './supabase';

export interface Message {
    id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    created_at: string;
}

export const SupabaseMessageService = {
    async getConversation(userId1: string, userId2: string): Promise<Message[]> {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
            .order('created_at', { ascending: true }); // Oldest first for chat UI

        if (error) {
            console.error('[SupabaseMessageService.getConversation]', error.message);
            return [];
        }

        return data as Message[];
    },

    async sendMessage(senderId: string, receiverId: string, content: string): Promise<Message | null> {
        const { data, error } = await supabase
            .from('messages')
            .insert({ sender_id: senderId, receiver_id: receiverId, content })
            .select('*')
            .single();

        if (error) {
            console.error('[SupabaseMessageService.sendMessage]', error.message);
            return null;
        }

        return data as Message;
    }
};
