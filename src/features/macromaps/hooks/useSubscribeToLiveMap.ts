import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/src/shared/services/supabase';
import { MacroScalingService, ScaledMacros } from '@/src/shared/services/MacroScalingService';

interface SubscribeArgs {
    subscriberId: string;
    creatorId?: string;
    mapId?: string;
    subscriberTargetCals: number;
}

export function useSubscribeToLiveMap() {
    return useMutation({
        mutationFn: async ({ subscriberId, creatorId, mapId, subscriberTargetCals }: SubscribeArgs) => {
            let targetMapId = mapId;
            let engineType: 'LIVE' | 'ALGORITHMIC_CREATED' | 'EXPERIENTIAL' = 'LIVE';
            let targetCreatorId = creatorId;

            // 1. Resolve mapId if not explicitly provided (backward compatibility for creatorId subscription)
            if (!targetMapId) {
                if (!creatorId) {
                    throw new Error("Either mapId or creatorId must be provided to subscribe.");
                }
                const { data: map, error: mapError } = await supabase
                    .from('macro_maps')
                    .select('id, engine_type, creator_id')
                    .eq('creator_id', creatorId)
                    .eq('engine_type', 'LIVE')
                    .eq('is_published', true)
                    .single();

                if (mapError || !map) {
                    throw new Error("Could not find an active published LIVE map for this creator.");
                }
                targetMapId = map.id;
                engineType = map.engine_type;
                targetCreatorId = map.creator_id;
            } else {
                // If mapId is provided, query structural metadata (especially engine_type)
                const { data: map, error: mapError } = await supabase
                    .from('macro_maps')
                    .select('engine_type, creator_id')
                    .eq('id', targetMapId)
                    .single();

                if (mapError || !map) {
                    throw new Error("Could not fetch details for the requested map.");
                }
                engineType = map.engine_type;
                targetCreatorId = map.creator_id;
            }

            let scaledMacros: ScaledMacros;

            if (engineType === 'LIVE') {
                // LIVE map logic: fetch creator's current macro targets, scale, and subscribe
                const { data: creatorProfile, error: profileError } = await supabase
                    .from('profiles')
                    .select('macro_targets')
                    .eq('id', targetCreatorId)
                    .single();

                if (profileError || !creatorProfile?.macro_targets) {
                    throw new Error("Could not fetch creator's active macro targets.");
                }

                const creatorMacros = creatorProfile.macro_targets as { p: number; c: number; f: number };
                scaledMacros = MacroScalingService.scaleMacros(subscriberTargetCals, creatorMacros);

                // Insert/Upsert subscription record for LIVE
                const { error: subError } = await supabase
                    .from('macro_map_subscriptions')
                    .upsert({
                        user_id: subscriberId,
                        map_id: targetMapId,
                        status: 'ACTIVE',
                        holding_status: 'NONE',
                        requires_resolution: false
                    }, { onConflict: 'user_id,map_id' });

                if (subError) throw subError;

            } else {
                // ALGORITHMIC_CREATED or EXPERIENTIAL map logic:
                // Skip real-time push routing, properly initialize parameters:
                // current_weight_checkpoint_index = 0, current_time_checkpoint_index = 0
                
                // Fetch the starting checkpoint for this map to initialize user's macro targets
                const { data: initialCheckpoint, error: cpError } = await supabase
                    .from('macro_map_checkpoints')
                    .select('protein_ratio, carbs_ratio, fats_ratio, calorie_delta_pct')
                    .eq('map_id', targetMapId)
                    .order('sequence_index', { ascending: true })
                    .limit(1)
                    .single();

                if (cpError || !initialCheckpoint) {
                    throw new Error(`Could not fetch the starting checkpoint for map: ${targetMapId}`);
                }

                scaledMacros = MacroScalingService.scaleCheckpointMacros(subscriberTargetCals, initialCheckpoint);

                // Insert subscription with base parameters explicitly initialized
                const { error: subError } = await supabase
                    .from('macro_map_subscriptions')
                    .upsert({
                        user_id: subscriberId,
                        map_id: targetMapId,
                        status: 'ACTIVE',
                        holding_status: 'NONE',
                        current_weight_checkpoint_index: 0,
                        current_time_checkpoint_index: 0,
                        requires_resolution: false
                    }, { onConflict: 'user_id,map_id' });

                if (subError) throw subError;
            }

            // 2. Set as subscriber's active targets silently (no feed post)
            const { data: currentProfile } = await supabase
                .from('profiles')
                .select('macro_targets, update_count')
                .eq('id', subscriberId)
                .single();

            if (currentProfile?.macro_targets) {
                await supabase
                    .from('macro_history')
                    .insert({
                        user_id: subscriberId,
                        macro_targets: currentProfile.macro_targets
                    });
            }

            const currentUpdateCount = currentProfile?.update_count ?? 0;

            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    macro_targets: scaledMacros,
                    last_macro_update: new Date().toISOString().split('T')[0],
                    update_count: currentUpdateCount + 1
                })
                .eq('id', subscriberId);

            if (profileError) {
                console.error('[useSubscribeToLiveMap] profile update error:', profileError.message);
                throw profileError;
            }

            return scaledMacros;
        },
    });
}
