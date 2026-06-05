import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    const payload = await req.json()
    const { record, type } = payload

    if (type !== 'INSERT' || !record) {
      return new Response(JSON.stringify({ message: 'Skipping non-insert event' }), { status: 200 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const recipientId = record.recipient_id
    const title = record.title
    const body = record.body
    const data = record.data || {}

    if (!recipientId || !title || !body) {
      throw new Error('Missing required notification fields: recipient_id, title, or body')
    }

    // 1. Fetch recipient's push token
    const { data: recipientProfile, error: profileError } = await supabase
      .from('profiles')
      .select('expo_push_token')
      .eq('id', recipientId)
      .single()

    if (profileError || !recipientProfile) {
      throw new Error(`Failed to find recipient profile: ${profileError?.message}`)
    }

    const expoPushToken = recipientProfile.expo_push_token

    if (!expoPushToken) {
      return new Response(JSON.stringify({ message: 'Recipient does not have a push token registered. Skipping push.' }), { status: 200 })
    }

    // 2. Dispatch the push notification using Expo's API
    // Keep strings EXACTLY as passed without adding emojis.
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: 'default',
        title: title,
        body: body,
        data: data,
      }),
    })

    const responseData = await response.json()
    console.log('[SendSystemPush] Expo push dispatch response:', responseData)

    return new Response(JSON.stringify({ success: true, responseData }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('[SendSystemPush] Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
