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
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 1. Query published LIVE macro maps
        const { data: liveMaps, error: mapsError } = await supabaseAdmin
            .from('macro_maps')
            .select('id, creator_id, name')
            .eq('engine_type', 'LIVE')
            .eq('is_published', true);

        if (mapsError) throw mapsError;

        const now = new Date();
        let archivedCount = 0;

        for (const map of liveMaps || []) {
            // 2. Fetch the latest creator's personal macro logging entry
            const { data: history, error: historyError } = await supabaseAdmin
                .from('macro_history')
                .select('created_at')
                .eq('user_id', map.creator_id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (historyError || !history) {
                // If they have no logging entries at all, we can evaluate them as inactive/stale
                // To prevent premature archiving of brand new maps, you could check map.created_at,
                // but let's strictly archive if their last entry is missing or extremely old.
                continue;
            }

            const lastLogDate = new Date(history.created_at);
            const diffTime = Math.abs(now.getTime() - lastLogDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // If greater than 14 days, archive/revoke is_published to false
            if (diffDays > 14) {
                const { error: updateError } = await supabaseAdmin
                    .from('macro_maps')
                    .update({ is_published: false })
                    .eq('id', map.id);

                if (!updateError) {
                    archivedCount++;
                    console.log(`Archived abandoned LIVE map: "${map.name}" (ID: ${map.id}) by Creator: ${map.creator_id}`);
                } else {
                    console.error(`Error updating map ${map.id}:`, updateError);
                }
            }
        }

        return new Response(JSON.stringify({ success: true, processed: liveMaps?.length || 0, archived: archivedCount }), {
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
