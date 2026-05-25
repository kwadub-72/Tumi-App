import { create } from 'zustand';
import { supabase } from '@/src/shared/services/supabase';
import { MacroScalingService, ScaledMacros } from '@/src/shared/services/MacroScalingService';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface LiveMapSubscriberState {
    pendingLiveUpdate: any | null;
    baselineDay1Targets: ScaledMacros | null;
    activeChannel: RealtimeChannel | null;
    
    initializeLiveListener: (activeMapId: string) => void;
    catchUpLateJoiner: (mapId: string, subscriberTargetCals: number) => Promise<void>;
    clearPendingUpdate: () => void;
    disconnect: () => void;
}

export const useLiveMapSubscriberStore = create<LiveMapSubscriberState>((set, get) => ({
    pendingLiveUpdate: null,
    baselineDay1Targets: null,
    activeChannel: null,

    initializeLiveListener: (activeMapId: string) => {
        // Disconnect previous channel if it exists
        const currentChannel = get().activeChannel;
        if (currentChannel) {
            currentChannel.unsubscribe();
        }

        const channel = supabase.channel(`live-map-${activeMapId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'macro_map_live_events',
                    filter: `map_id=eq.${activeMapId}`,
                },
                (payload) => {
                    set({ pendingLiveUpdate: payload.new });
                }
            )
            .subscribe();

        set({ activeChannel: channel });
    },

    catchUpLateJoiner: async (mapId: string, subscriberTargetCals: number) => {
        const { data, error } = await supabase
            .from('macro_map_live_events')
            .select('macro_payload')
            .eq('map_id', mapId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !data) {
            console.error('[catchUpLateJoiner] Error fetching latest live event:', error);
            return;
        }

        const payload = data.macro_payload as { p: number; c: number; f: number };
        
        // Pass retrieved JSONB payload through the Tribe-Copy Scaling Engine
        const scaled = MacroScalingService.scaleMacros(subscriberTargetCals, payload);

        // Apply it as the subscriber's baseline Day 1 targets
        set({ baselineDay1Targets: scaled });
    },

    clearPendingUpdate: () => set({ pendingLiveUpdate: null }),

    disconnect: () => {
        const currentChannel = get().activeChannel;
        if (currentChannel) {
            currentChannel.unsubscribe();
            set({ activeChannel: null });
        }
    }
}));
