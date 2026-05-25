import { create } from 'zustand';
import { supabase } from '@/src/shared/services/supabase';
import { MacroScalingService } from '@/src/shared/services/MacroScalingService';
import { SupabasePostService } from '@/src/shared/services/SupabasePostService';
import { useAuthStore } from '@/store/AuthStore';

export interface MacroMapPromptPayload {
    id: string; // Subscription ID
    started_at: string; // ISO date string
    creator_id: string;
    creator_name: string;
    bmr_warning: boolean;
    is_outlier_flare: boolean;
    new_macros: {
        p: number;
        c: number;
        f: number;
        calories: number;
    };
    old_macros: {
        p: number;
        c: number;
        f: number;
        calories: number;
    };
}

interface MacroMapPromptState {
    queue: MacroMapPromptPayload[];
    is_macro_locked: boolean;
    activePrompt: MacroMapPromptPayload | null;
    pendingLiveUpdate: MacroMapPromptPayload | null;
    is_live: boolean;
    activeLiveMapId: string | null;
    enqueue: (prompt: MacroMapPromptPayload) => void;
    accept: () => Promise<void>;
    postpone: () => Promise<void>;
    rejectOrSkip: () => Promise<void>;
    revert: () => void;
    fetchActiveResolutions: (userId: string) => Promise<void>;
    toggleLiveBroadcast: () => Promise<void>;
    checkActiveBroadcast: () => Promise<void>;
}

export const useMacroMapPromptStore = create<MacroMapPromptState>((set, get) => ({
    queue: [],
    is_macro_locked: false,
    activePrompt: null,
    pendingLiveUpdate: null,
    is_live: false,
    activeLiveMapId: null,

    fetchActiveResolutions: async (userId: string) => {
        try {
            const { data: subs, error } = await supabase
                .from('macro_map_subscriptions')
                .select(`
                    id,
                    started_at,
                    pending_payload,
                    macro_maps (
                        creator_id,
                        profiles (
                            name
                        )
                    )
                `)
                .eq('user_id', userId)
                .eq('requires_resolution', true)
                .order('started_at', { ascending: true });

            if (error || !subs) {
                console.error('[useMacroMapPromptStore.fetchActiveResolutions]', error);
                return;
            }

            // Fetch user's current profile macro targets & BMR
            const { data: userProfile } = await supabase
                .from('profiles')
                .select('macro_targets')
                .eq('id', userId)
                .single();

            const { data: bmr } = await supabase.rpc('calculate_user_bmr', { p_user_id: userId });

            const subscriberTargetCals = userProfile?.macro_targets?.calories ?? 2000;
            const oldMacros = userProfile?.macro_targets ?? { p: 0, c: 0, f: 0, calories: 2000 };

            const queueList: MacroMapPromptPayload[] = subs.map((sub: any) => {
                const creatorName = sub.macro_maps?.profiles?.name ?? 'Creator';
                const creatorId = sub.macro_maps?.creator_id ?? '';
                const payload = sub.pending_payload ?? {};
                
                // Extract creator macros from pending_payload
                const creatorMacros = payload.macro_targets ?? payload;
                const scaled = MacroScalingService.scaleMacros(subscriberTargetCals, creatorMacros);

                const bmrWarning = bmr ? (scaled.calories < Number(bmr)) : false;
                const isOutlier = payload.is_outlier_flare ?? false;

                return {
                    id: sub.id,
                    started_at: sub.started_at,
                    creator_id: creatorId,
                    creator_name: creatorName,
                    bmr_warning: bmrWarning,
                    is_outlier_flare: isOutlier,
                    new_macros: scaled,
                    old_macros: {
                        p: oldMacros.p ?? 0,
                        c: oldMacros.c ?? 0,
                        f: oldMacros.f ?? 0,
                        calories: oldMacros.calories ?? subscriberTargetCals
                    }
                };
            });

            set({
                queue: queueList,
                activePrompt: queueList.length > 0 ? queueList[0] : null,
                pendingLiveUpdate: queueList.length > 0 ? queueList[0] : null,
                is_macro_locked: queueList.length > 0
            });
        } catch (err) {
            console.error('[useMacroMapPromptStore.fetchActiveResolutions] Caught exception:', err);
        }
    },

    enqueue: (prompt) => {
        set((state) => {
            const newQueue = [...state.queue, prompt];
            newQueue.sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());
            return {
                queue: newQueue,
                activePrompt: newQueue.length > 0 ? newQueue[0] : null,
                pendingLiveUpdate: newQueue.length > 0 ? newQueue[0] : null,
                is_macro_locked: newQueue.length > 0,
            };
        });
    },

    accept: async () => {
        const active = get().activePrompt;
        if (!active) return;

        const userId = useAuthStore.getState().session?.user?.id;
        if (!userId) return;

        try {
            // 1. Applies scaled pending_payload targets to user's active targets
            await SupabasePostService.updateMacroTargetsWithPost(
                userId,
                active.new_macros,
                `Accepted Macro Map Update from ${active.creator_name}!`
            );

            // 2. Update subscription row to set requires_resolution = false
            await supabase
                .from('macro_map_subscriptions')
                .update({
                    requires_resolution: false,
                    pending_payload: null
                })
                .eq('id', active.id);

            // 3. Update active profile state
            await useAuthStore.getState().refreshProfile();

            // 4. Pop item off the queue locally
            set((state) => {
                const newQueue = state.queue.slice(1);
                return {
                    queue: newQueue,
                    activePrompt: newQueue.length > 0 ? newQueue[0] : null,
                    pendingLiveUpdate: newQueue.length > 0 ? newQueue[0] : null,
                    is_macro_locked: newQueue.length > 0,
                };
            });
        } catch (error) {
            console.error('[useMacroMapPromptStore.accept] Error:', error);
        }
    },

    postpone: async () => {
        const active = get().activePrompt;
        if (!active) return;

        const postponedDate = new Date();
        postponedDate.setDate(postponedDate.getDate() + 7);

        try {
            // 1. Sets postponed_until to now() + 7 days
            await supabase
                .from('macro_map_subscriptions')
                .update({
                    requires_resolution: false,
                    postponed_until: postponedDate.toISOString()
                })
                .eq('id', active.id);

            // 2. Pop item off the queue locally (advancing the queue view)
            set((state) => {
                const newQueue = state.queue.slice(1);
                return {
                    queue: newQueue,
                    activePrompt: newQueue.length > 0 ? newQueue[0] : null,
                    pendingLiveUpdate: newQueue.length > 0 ? newQueue[0] : null,
                    is_macro_locked: newQueue.length > 0,
                };
            });
        } catch (error) {
            console.error('[useMacroMapPromptStore.postpone] Error:', error);
        }
    },

    rejectOrSkip: async () => {
        const active = get().activePrompt;
        if (!active) return;

        try {
            // 1. Fetch current indices
            const { data: subData } = await supabase
                .from('macro_map_subscriptions')
                .select('current_weight_checkpoint_index, current_time_checkpoint_index')
                .eq('id', active.id)
                .single();

            const nextWeightIdx = (subData?.current_weight_checkpoint_index ?? 0) + 1;
            const nextTimeIdx = (subData?.current_time_checkpoint_index ?? 0) + 1;

            // 2. Increments the checkpoint index pointer and pops queue
            await supabase
                .from('macro_map_subscriptions')
                .update({
                    current_weight_checkpoint_index: nextWeightIdx,
                    current_time_checkpoint_index: nextTimeIdx,
                    requires_resolution: false,
                    pending_payload: null
                })
                .eq('id', active.id);

            // 3. Pop item off the queue locally
            set((state) => {
                const newQueue = state.queue.slice(1);
                return {
                    queue: newQueue,
                    activePrompt: newQueue.length > 0 ? newQueue[0] : null,
                    pendingLiveUpdate: newQueue.length > 0 ? newQueue[0] : null,
                    is_macro_locked: newQueue.length > 0,
                };
            });
        } catch (error) {
            console.error('[useMacroMapPromptStore.rejectOrSkip] Error:', error);
        }
    },

    revert: () => {
        set((state) => {
            const newQueue = state.queue.slice(1);
            return {
                queue: newQueue,
                activePrompt: newQueue.length > 0 ? newQueue[0] : null,
                pendingLiveUpdate: newQueue.length > 0 ? newQueue[0] : null,
                is_macro_locked: newQueue.length > 0,
            };
        });
    },

    checkActiveBroadcast: async () => {
        const userId = useAuthStore.getState().session?.user?.id;
        if (!userId) return;

        try {
            const { data, error } = await supabase
                .from('macro_maps')
                .select('id, is_live')
                .eq('creator_id', userId)
                .eq('engine_type', 'LIVE')
                .limit(1)
                .maybeSingle();

            if (error) {
                console.error('[checkActiveBroadcast] Error fetching live map:', error);
                return;
            }

            if (data) {
                set({ is_live: data.is_live ?? false, activeLiveMapId: data.id });
            }
        } catch (err) {
            console.error('[checkActiveBroadcast] Exception:', err);
        }
    },

    toggleLiveBroadcast: async () => {
        const userId = useAuthStore.getState().session?.user?.id;
        if (!userId) return;

        const currentIsLive = get().is_live;
        const mapId = get().activeLiveMapId;

        try {
            if (mapId) {
                // Update existing live map status
                const { error } = await supabase
                    .from('macro_maps')
                    .update({ is_live: !currentIsLive })
                    .eq('id', mapId);

                if (error) throw error;
                set({ is_live: !currentIsLive });
            } else {
                // Create a new default LIVE map
                const { data, error } = await supabase
                    .from('macro_maps')
                    .insert({
                        creator_id: userId,
                        name: 'My Live Broadcast',
                        engine_type: 'LIVE',
                        generation_type: 'update',
                        goal_type: 'MAINTENANCE',
                        total_duration_weeks: 12,
                        is_live: true,
                        is_published: true
                    })
                    .select('id')
                    .single();

                if (error) throw error;
                set({ is_live: true, activeLiveMapId: data.id });
            }
        } catch (err) {
            console.error('[toggleLiveBroadcast] Exception:', err);
        }
    }
}));
