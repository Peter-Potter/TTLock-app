import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Get auth token passed from mobile app
    const authHeader = req.headers.get('Authorization')!
    
    // 2. Instantiate Supabase client inside Edge Function
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // 3. Get currently logged in user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Fetch the user's stored TTLock access token from database
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('ttlock_tokens')
      .select('access_token')
      .eq('user_id', user.id)
      .single()

    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({ error: 'TTLock token not found for user' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse payload sent from mobile app
    const { action, lockId, keyboardPwdName, keyboardPwdType, startDate, endDate } = await req.json()

    // 5. Example: Passcode Creation API Request to TTLock
    if (action === 'getPasscode') {
      const clientId = Deno.env.get('TTLOCK_CLIENT_ID')!
      
      const params = new URLSearchParams({
        clientId: clientId,
        accessToken: tokenData.access_token,
        lockId: String(lockId),
        keyboardPwdName: keyboardPwdName || 'Custom Passcode',
        keyboardPwdType: String(keyboardPwdType || 3), // 3 = Period, 2 = Permanent
        startDate: String(startDate),
        endDate: String(endDate),
        date: String(Date.now()),
      })

      const response = await fetch('https://api.ttlock.com/v3/keyboardPwd/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      })

      const result = await response.json()
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})