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
        const { 
            report_id,
            reporter_id,
            reportee_id,
            tribe_id,
            league_type,
            requested_penalty,
            local_week_start,
            local_week_end
        } = await req.json();

        if (!report_id || !reporter_id || !reportee_id || !tribe_id || !league_type || !requested_penalty) {
            throw new Error('Missing required fields for resolving report.');
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 1. Update the report status to accepted
        const { error: reportError } = await supabaseAdmin
            .from('tribe_reports')
            .update({ status: 'accepted', resolved_at: new Date().toISOString() })
            .eq('id', report_id);

        if (reportError) throw reportError;

        // 2. Apply Penalty
        if (league_type === 'PREMIER') {
            // Deduct requested_penalty directly from total_score running tally
            const { data: member, error: memberError } = await supabaseAdmin
                .from('tribe_members')
                .select('id, total_score')
                .eq('tribe_id', tribe_id)
                .eq('user_id', reportee_id)
                .single();

            if (memberError) throw memberError;

            if (member) {
                const newScore = Math.max(0, (member.total_score || 0) - requested_penalty);
                await supabaseAdmin
                    .from('tribe_members')
                    .update({ total_score: newScore })
                    .eq('id', member.id);
            }

        } else if (league_type === 'FACEOFF') {
            if (!local_week_start || !local_week_end) {
                throw new Error('local_week_start and local_week_end are required for Faceoff penalty application.');
            }

            // Query weekly_matchups for the user's current active week
            // Note: The prompt uses 'faceoff_matchups' and 'weekly_matchups' interchangeably, 
            // but earlier we used faceoff_matchups. We will query faceoff_matchups.
            // Deduct points strictly from current_week_score.
            
            // Where reportee is user_id
            const { data: matchesAsUser } = await supabaseAdmin
                .from('faceoff_matchups')
                .select('id, current_week_score')
                .eq('tribe_id', tribe_id)
                .eq('user_id', reportee_id)
                .lte('week_start_date', local_week_start)
                .gte('week_end_date', local_week_start); // Or exact match if dates align exactly

            if (matchesAsUser && matchesAsUser.length > 0) {
                for (const match of matchesAsUser) {
                    const newScore = Math.max(0, (match.current_week_score || 0) - requested_penalty);
                    await supabaseAdmin
                        .from('faceoff_matchups')
                        .update({ current_week_score: newScore })
                        .eq('id', match.id);
                }
            } else {
                // Where reportee is opponent_id
                // Assuming current_week_score applies to the matchup itself, we might need a separate opponent_score
                // or if it's stored differently. Assuming standard structure:
                const { data: matchesAsOpponent } = await supabaseAdmin
                    .from('faceoff_matchups')
                    .select('id, opponent_week_score')
                    .eq('tribe_id', tribe_id)
                    .eq('opponent_id', reportee_id)
                    .lte('week_start_date', local_week_start)
                    .gte('week_end_date', local_week_start);

                if (matchesAsOpponent && matchesAsOpponent.length > 0) {
                    for (const match of matchesAsOpponent) {
                        const newScore = Math.max(0, (match.opponent_week_score || 0) - requested_penalty);
                        await supabaseAdmin
                            .from('faceoff_matchups')
                            .update({ opponent_week_score: newScore })
                            .eq('id', match.id);
                    }
                }
            }
        }

        // 3. Trigger Push Notification / Insert into Notifications Table
        const verdictMessageReporter = `Your report has been reviewed and accepted. A penalty of ${requested_penalty} points was applied.`;
        const verdictMessageReportee = `A report against you was accepted by the Tribe Chief. You have been penalized ${requested_penalty} points.`;

        const notifications = [
            {
                user_id: reporter_id,
                title: 'Report Accepted',
                body: verdictMessageReporter,
                type: 'TRIBE_REPORT_VERDICT',
                read: false,
                created_at: new Date().toISOString()
            },
            {
                user_id: reportee_id,
                title: 'Tribe Penalty Applied',
                body: verdictMessageReportee,
                type: 'TRIBE_PENALTY',
                read: false,
                created_at: new Date().toISOString()
            }
        ];

        await supabaseAdmin.from('notifications').insert(notifications);

        return new Response(JSON.stringify({ success: true, message: 'Penalty applied and notifications sent.' }), {
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
