import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, pageSize, dataType } = await req.json()
    const apiKey = Deno.env.get('USDA_API_KEY')

    if (!apiKey) throw new Error("Missing USDA_API_KEY environment variable")
    if (!query) throw new Error("Missing query string in request payload")

    // Implement 5-second AbortController timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    // Build the USDA query URL with optional parameters
    let usdaUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(query)}`;
    if (pageSize) {
      usdaUrl += `&pageSize=${pageSize}`;
    }
    if (dataType) {
      if (Array.isArray(dataType)) {
        dataType.forEach(dt => {
          usdaUrl += `&dataType=${encodeURIComponent(String(dt))}`;
        });
      } else {
        usdaUrl += `&dataType=${encodeURIComponent(String(dataType))}`;
      }
    }

    // Make the fetch call to https://api.nal.usda.gov/fdc/v1/foods/search
    const usdaResponse = await fetch(
      usdaUrl, 
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      }
    )

    clearTimeout(timeoutId)

    if (!usdaResponse.ok) {
      const errorText = await usdaResponse.text()
      console.error(`USDA API Error Status: ${usdaResponse.status} ${usdaResponse.statusText}`)
      console.error(`USDA API Raw Response: ${errorText}`)
      throw new Error(`USDA API Error: ${usdaResponse.status} - ${errorText}`)
    }

    const data = await usdaResponse.json()

    // Return the JSON response with corsHeaders applied
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    const isTimeout = error.name === 'AbortError'
    return new Response(JSON.stringify({ 
      error: isTimeout ? 'USDA API request timed out after 5 seconds' : error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: isTimeout ? 504 : 400,
    })
  }
})
