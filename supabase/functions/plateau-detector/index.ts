import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

// --- Duplicated MacroScalingService for Deno runtime ---
export interface MacroPayload {
    p: number;
    c: number;
    f: number;
}

export class MacroScalingService {
    static scaleMacros(targetBaselineCalories: number, creatorRawPayload: MacroPayload) {
        const { p, c, f } = creatorRawPayload;
        const bCals = (p * 4) + (c * 4) + (f * 9);
        
        if (bCals <= 0) return { p: 0, c: 0, f: 0, calories: 0 };
        
        const pPct = (p * 4) / bCals;
        const cPct = (c * 4) / bCals;
        const fPct = (f * 9) / bCals;
        
        const scaledP = Math.round((pPct * targetBaselineCalories) / 4);
        const scaledC = Math.round((cPct * targetBaselineCalories) / 4);
        const scaledF = Math.round((fPct * targetBaselineCalories) / 9);
        
        return { 
            p: scaledP, 
            c: scaledC, 
            f: scaledF, 
            calories: (scaledP * 4) + (scaledC * 4) + (scaledF * 9) 
        };
    }
}
// --------------------------------------------------------

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 1. Fetch active subscriptions for ALGORITHMIC_CREATED macro maps
        const { data: subs, error: subsError } = await supabaseAdmin
            .from('macro_map_subscriptions')
            .select(`
                id, user_id, status,
                macro_maps!inner ( id, engine_type, plateau_formula_json ),
                profiles!inner ( id, macro_targets )
            `)
            .eq('status', 'ACTIVE')
            .eq('macro_maps.engine_type', 'ALGORITHMIC_CREATED');

        if (subsError) throw subsError;

        let detectedPlateausCount = 0;

        for (const sub of subs || []) {
            const userId = sub.user_id;

            // 2. Fetch last 7 daily scale weight entries ordered by date desc
            const { data: weights, error: weightsError } = await supabaseAdmin
                .from('weights')
                .select('weight, date')
                .eq('user_id', userId)
                .order('date', { ascending: false })
                .limit(7);

            if (weightsError) {
                console.error(`Error fetching weights for user ${userId}:`, weightsError);
                continue;
            }

            // Ensure we have a strict 7-day rolling snapshot of sequential entries
            if (!weights || weights.length < 7) {
                continue;
            }

            const weightValues = weights.map(w => Number(w.weight));
            const maxWeight = Math.max(...weightValues);
            const minWeight = Math.min(...weightValues);
            const variance = maxWeight - minWeight;

            // Variance <= 0.2 lbs across that entire 7-day snapshot flags a plateau
            if (variance <= 0.2) {
                const formula = sub.macro_maps?.plateau_formula_json || {};
                const currentTargets = sub.profiles?.macro_targets || { p: 0, c: 0, f: 0, calories: 0 };
                const currentCals = currentTargets.calories || ((currentTargets.p * 4) + (currentTargets.c * 4) + (currentTargets.f * 9));

                // Process macro shifts according to plateau_formula_json rules
                let targetP = currentTargets.p;
                let targetC = currentTargets.c;
                let targetF = currentTargets.f;

                if (formula.carbs_drop_pct) {
                    targetC = Math.round(targetC * (1 - Number(formula.carbs_drop_pct)));
                }
                if (formula.protein_drop_pct) {
                    targetP = Math.round(targetP * (1 - Number(formula.protein_drop_pct)));
                }
                if (formula.fats_drop_pct) {
                    targetF = Math.round(targetF * (1 - Number(formula.fats_drop_pct)));
                }

                let targetCals = currentCals;
                if (formula.calories_delta) {
                    targetCals += Number(formula.calories_delta);
                } else {
                    targetCals = (targetP * 4) + (targetC * 4) + (targetF * 9);
                }

                // Apply MacroScalingService calculations
                const creatorPayload = { p: targetP, c: targetC, f: targetF };
                const newMacros = MacroScalingService.scaleMacros(targetCals, creatorPayload);

                // 3. BMR Protection Check via Database RPC
                const { data: bmrData, error: bmrError } = await supabaseAdmin
                    .rpc('calculate_user_bmr', { p_user_id: userId });

                let bmrWarning = false;
                if (!bmrError && bmrData) {
                    const bmr = Number(bmrData);
                    if (newMacros.calories < bmr) {
                        bmrWarning = true;
                    }
                }

                // Staging payload
                const pendingPayload = {
                    ...newMacros,
                    bmr_warning: bmrWarning,
                    reason: 'ALGORITHMIC_PLATEAU'
                };

                // 4. Update the target subscription row
                await supabaseAdmin
                    .from('macro_map_subscriptions')
                    .update({
                        requires_resolution: true,
                        pending_payload: pendingPayload
                    })
                    .eq('id', sub.id);

                detectedPlateausCount++;
            }
        }

        return new Response(JSON.stringify({ success: true, processed: subs?.length || 0, plateaus_flagged: detectedPlateausCount }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
