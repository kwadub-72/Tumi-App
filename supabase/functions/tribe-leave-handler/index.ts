import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { tribe_id, user_id, league_type } = await req.json();

        if (!tribe_id || !user_id || !league_type) {
            throw new Error('Missing required fields: tribe_id, user_id, league_type');
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        if (league_type === 'PREMIER') {
            // Recalculate ranks for remaining members
            const { data: members, error: fetchError } = await supabaseAdmin
                .from('tribe_members')
                .select('id, user_id, total_score')
                .eq('tribe_id', tribe_id)
                .order('total_score', { ascending: false });

            if (fetchError) throw fetchError;

            // Filter out the leaving user just in case they haven't been deleted yet
            const remainingMembers = (members || []).filter(m => m.user_id !== user_id);

            // Compact ranks sequentially starting from 1
            const updates = remainingMembers.map((m, index) => {
                return supabaseAdmin
                    .from('tribe_members')
                    .update({ rank: index + 1 })
                    .eq('id', m.id);
            });

            await Promise.all(updates);

        } else if (league_type === 'FACEOFF') {
            const today = new Date().toISOString().split('T')[0];

            // 1. Future weeks: set opponent_id to NULL and status to BYE_WEEK
            
            // Where the leaver was the opponent (so user_id is the remaining player)
            await supabaseAdmin
                .from('faceoff_matchups')
                .update({ opponent_id: null, status: 'BYE_WEEK' })
                .eq('tribe_id', tribe_id)
                .eq('opponent_id', user_id)
                .gt('week_start_date', today);

            // Where the leaver was the main user (so opponent_id is the remaining player)
            // We need to swap them to make user_id the remaining player, opponent_id null, and status BYE_WEEK
            const { data: futureMatchesAsUser } = await supabaseAdmin
                .from('faceoff_matchups')
                .select('*')
                .eq('tribe_id', tribe_id)
                .eq('user_id', user_id)
                .gt('week_start_date', today);

            if (futureMatchesAsUser && futureMatchesAsUser.length > 0) {
                const swapUpdates = futureMatchesAsUser.map(match => {
                    return supabaseAdmin
                        .from('faceoff_matchups')
                        .update({
                            user_id: match.opponent_id,
                            opponent_id: null,
                            status: 'BYE_WEEK'
                        })
                        .eq('id', match.id);
                });
                await Promise.all(swapUpdates);
            }

            // 2. Current active week: instantly set the opponent's status to VICTORY and award standard win points (e.g. 3)
            
            // Where leaver is opponent
            await supabaseAdmin
                .from('faceoff_matchups')
                .update({ status: 'VICTORY', current_week_score: 3 })
                .eq('tribe_id', tribe_id)
                .eq('opponent_id', user_id)
                .lte('week_start_date', today)
                .gte('week_end_date', today);

            // Where leaver is user (remaining player is opponent)
            const { data: currentMatchesAsUser } = await supabaseAdmin
                .from('faceoff_matchups')
                .select('*')
                .eq('tribe_id', tribe_id)
                .eq('user_id', user_id)
                .lte('week_start_date', today)
                .gte('week_end_date', today);

            if (currentMatchesAsUser && currentMatchesAsUser.length > 0) {
                const victoryUpdates = currentMatchesAsUser.map(match => {
                    return supabaseAdmin
                        .from('faceoff_matchups')
                        .update({
                            user_id: match.opponent_id,
                            opponent_id: null, // Optional, could keep them for record
                            status: 'VICTORY',
                            current_week_score: 3
                        })
                        .eq('id', match.id);
                });
                await Promise.all(victoryUpdates);
            }
        }

        return new Response(JSON.stringify({ success: true }), {
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
