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
    const subscriberId = record.user_id
    const mapId = record.map_id

    // 1. Fetch map metadata
    const { data: mapData, error: mapError } = await supabase
      .from('macro_maps')
      .select('name, creator_id')
      .eq('id', mapId)
      .single()

    if (mapError || !mapData) {
      throw new Error(`Failed to find macro map: ${mapError?.message}`)
    }

    // Safeguard: Don't notify if the user subscribes to their own map
    if (subscriberId === mapData.creator_id) {
      return new Response(JSON.stringify({ message: 'Self-subscription detected. Skipping push.' }), { status: 200 })
    }

    // 2. Fetch Subscriber's details
    const { data: subscriberProfile, error: subError } = await supabase
      .from('profiles')
      .select('name, handle')
      .eq('id', subscriberId)
      .single()

    if (subError || !subscriberProfile) {
      throw new Error(`Failed to find subscriber profile: ${subError?.message}`)
    }

    // 3. Fetch Creator's token
    const { data: creatorProfile, error: creatorError } = await supabase
      .from('profiles')
      .select('expo_push_token')
      .eq('id', mapData.creator_id)
      .single()

    if (creatorError || !creatorProfile) {
      throw new Error(`Failed to find creator profile: ${creatorError?.message}`)
    }

    const expoPushToken = creatorProfile.expo_push_token

    if (!expoPushToken) {
      return new Response(JSON.stringify({ message: 'Creator does not have a push token registered. Skipping push.' }), { status: 200 })
    }

    // 4. Dispatch the push notification using Expo's API
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
        title: 'New Map Subscriber! 🗺️',
        body: `${subscriberProfile.name} (@${subscriberProfile.handle.replace('@', '')}) just subscribed to your map "${mapData.name}"!`,
        data: { mapId, subscriberId },
      }),
    })

    const responseData = await response.json()
    console.log('[MapSubscriptionNotification] Push dispatch response:', responseData)

    return new Response(JSON.stringify({ success: true, responseData }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('[MapSubscriptionNotification] Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
