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
        // Use SERVICE_ROLE_KEY to bypass RLS for this system job
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Fetch ALGORITHMIC_CREATED active subscriptions
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

        for (const sub of subs || []) {
            const userId = sub.user_id;
            
            // 1. Fetch last 7 days of weight
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            const { data: weights, error: weightsError } = await supabaseAdmin
                .from('weights')
                .select('weight')
                .eq('user_id', userId)
                .gte('date', sevenDaysAgo.toISOString().split('T')[0]);
                
            if (weightsError) {
                console.error(`Error fetching weights for ${userId}:`, weightsError);
                continue;
            }

            if (!weights || weights.length < 2) continue;

            const maxWeight = Math.max(...weights.map(w => Number(w.weight)));
            const minWeight = Math.min(...weights.map(w => Number(w.weight)));
            const variance = maxWeight - minWeight;

            // 2. Detect plateau
            if (variance <= 0.2) {
                const formula = sub.macro_maps?.plateau_formula_json || {};
                
                const currentTargets = sub.profiles?.macro_targets || { p: 0, c: 0, f: 0, calories: 0 };
                const currentCals = currentTargets.calories || ((currentTargets.p * 4) + (currentTargets.c * 4) + (currentTargets.f * 9));
                
                // Adjust active macros based on plateau formula
                let targetCals = currentCals;
                if (formula.calories_delta) {
                    targetCals += formula.calories_delta;
                }
                
                // Base payload to use for ratios
                const creatorPayload = {
                    p: formula.p || currentTargets.p,
                    c: formula.c || currentTargets.c,
                    f: formula.f || currentTargets.f
                };

                const newMacros = MacroScalingService.scaleMacros(targetCals, creatorPayload);

                // 3. BMR Guardrail check via RPC
                const { data: bmrData, error: bmrError } = await supabaseAdmin
                    .rpc('calculate_user_bmr', { p_user_id: userId });
                
                let bmrWarning = false;
                if (!bmrError && bmrData) {
                    const bmr = Number(bmrData);
                    if (newMacros.calories < bmr) {
                        bmrWarning = true;
                    }
                }

                const pendingPayload = {
                    ...newMacros,
                    bmr_warning: bmrWarning,
                    reason: 'ALGORITHMIC_PLATEAU'
                };

                // 4. Update subscription, flag for resolution
                await supabaseAdmin
                    .from('macro_map_subscriptions')
                    .update({
                        requires_resolution: true,
                        pending_payload: pendingPayload
                    })
                    .eq('id', sub.id);
            }
        }

        return new Response(JSON.stringify({ success: true, processed: subs?.length || 0 }), {
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
