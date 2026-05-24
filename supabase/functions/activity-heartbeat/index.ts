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
        // Use SERVICE_ROLE_KEY to bypass RLS for this system job
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Fetch LIVE maps that are published
        const { data: liveMaps, error: mapsError } = await supabaseAdmin
            .from('macro_maps')
            .select('id, creator_id')
            .eq('engine_type', 'LIVE')
            .eq('is_published', true);

        if (mapsError) throw mapsError;

        const now = new Date();
        let unpublishCount = 0;

        for (const map of liveMaps || []) {
            // Fetch the creator's most recent macro log
            // Assuming `created_at` represents the time the log was made (which behaves as updated_at for append-only logs)
            const { data: history, error: historyError } = await supabaseAdmin
                .from('macro_history')
                .select('created_at')
                .eq('user_id', map.creator_id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            
            if (historyError || !history) {
                // If they have NO logs, skip or handle accordingly. For safety, we skip.
                continue;
            }

            const lastUpdateDate = new Date(history.created_at);
            const diffTime = Math.abs(now.getTime() - lastUpdateDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            
            // If delta > 14 days, set map's is_published = false
            if (diffDays > 14) {
                await supabaseAdmin
                    .from('macro_maps')
                    .update({ is_published: false })
                    .eq('id', map.id);
                
                unpublishCount++;
            }
        }

        return new Response(JSON.stringify({ success: true, processed: liveMaps?.length || 0, unpublished: unpublishCount }), {
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
