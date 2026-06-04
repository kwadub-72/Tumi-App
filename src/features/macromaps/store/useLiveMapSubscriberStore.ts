import { create } from 'zustand';
import { supabase } from '@/src/shared/services/supabase';
import { MacroScalingService, ScaledMacros } from '@/src/shared/services/MacroScalingService';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useAuthStore } from '@/store/AuthStore';
import { useUserStore } from '@/store/UserStore';
import { router } from 'expo-router';

export interface LiveMapSubscriberState {
    pendingLiveUpdate: any | null;
    baselineDay1Targets: ScaledMacros | null;
    activeChannel: RealtimeChannel | null;
    
    initializeLiveListener: (activeMapId: string) => void;
    catchUpLateJoiner: (mapId: string, subscriberTargetCals: number) => Promise<void>;
    clearPendingUpdate: () => void;
    disconnect: () => void;
    subscribeToMap: (mapId: string) => Promise<void>;
    unsubscribeFromMap: (mapId: string) => Promise<void>;
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
    },

    subscribeToMap: async (mapId: string) => {
        const userId = useAuthStore.getState().session?.user?.id;
        if (!userId) return;

        try {
            // 1. Pause active subscriptions
            await supabase
                .from('macro_map_subscriptions')
                .update({ status: 'PAUSED' })
                .eq('user_id', userId)
                .eq('status', 'ACTIVE');

            // 2. Insert new subscription
            const { error: subError } = await supabase
                .from('macro_map_subscriptions')
                .insert({
                    map_id: mapId,
                    user_id: userId,
                    status: 'ACTIVE'
                });
                
            if (subError) throw subError;

            // 3. Fetch first checkpoint
            const { data: checkpoint, error: cpError } = await supabase
                .from('macro_map_checkpoints')
                .select('protein_ratio, carbs_ratio, fats_ratio, calorie_delta_pct')
                .eq('map_id', mapId)
                .order('created_at', { ascending: true })
                .limit(1)
                .single();

            if (cpError || !checkpoint) {
                console.warn('[subscribeToMap] No initial checkpoint found. Subscription saved, but macros not updated.');
                return;
            }

            // 4. Calculate day 1 macros
            const targetCalories = useUserStore.getState().macroTargets.calories;
            const scaled = MacroScalingService.scaleCheckpointMacros(targetCalories, checkpoint);

            // 5. Provision the tracker (update Supabase profiles)
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ macro_targets: scaled })
                .eq('id', userId);

            if (profileError) throw profileError;

            // 6. Update local Zustand state
            useUserStore.getState().setProfile({ macroTargets: scaled });

            // 7. Route to macro update
            router.push('/macro-update');

        } catch (error) {
            console.error('[subscribeToMap] Failed:', error);
        }
    },

    unsubscribeFromMap: async (mapId: string) => {
        const userId = useAuthStore.getState().session?.user?.id;
        if (!userId) return;

        try {
            const { error } = await supabase
                .from('macro_map_subscriptions')
                .update({ status: 'PAUSED' })
                .eq('map_id', mapId)
                .eq('user_id', userId);

            if (error) throw error;
        } catch (error) {
            console.error('[unsubscribeFromMap] Failed:', error);
            throw error;
        }
    }
}));
