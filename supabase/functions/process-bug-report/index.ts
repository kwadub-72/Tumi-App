import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. Extract and validate authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Validate the session with Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Session validation failed:', userError);
      return new Response(JSON.stringify({ error: 'Invalid or expired session token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Parse and validate the request body
    const body = await req.json();
    const { message, appVersion, devicePlatform } = body;

    if (!message || !appVersion || !devicePlatform) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: message, appVersion, and devicePlatform are all required.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 4. Retrieve Linear Webhook URL from environment variables
    const linearWebhookUrl = Deno.env.get('LINEAR_WEBHOOK_URL');
    if (!linearWebhookUrl) {
      console.error('LINEAR_WEBHOOK_URL is not set in the environment.');
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Webhook target is not defined.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 5. Build enriched payload to send to Linear
    const linearPayload = {
      message,
      appVersion,
      devicePlatform,
      reporter: {
        id: user.id,
        email: user.email,
      },
    };

    // 6. Forward payload to Linear webhook
    const linearResponse = await fetch(linearWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(linearPayload),
    });

    if (!linearResponse.ok) {
      const errorText = await linearResponse.text();
      console.error('Failed to forward report to Linear webhook:', linearResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `Failed to forward report: ${linearResponse.statusText}` }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Bug report successfully forwarded to Linear.' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error processing bug report:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
