import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state') // Contains user_id
  const errorParam = url.searchParams.get('error')
  const errorDesc = url.searchParams.get('error_description')

  const appRedirectScheme = 'ttlockmobileapp://oauth-callback'

  // Helper to render responsive web redirect page
  const renderResponse = (title: string, message: string, success: boolean, deepLink: string) => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background-color: #F8FAFC;
      color: #0F172A;
      padding: 20px;
    }
    .card {
      background: white;
      padding: 32px 24px;
      border-radius: 16px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
      text-align: center;
      max-width: 400px;
      width: 100%;
      border: 1px solid #E2E8F0;
    }
    .icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 20px;
      margin-bottom: 8px;
      color: ${success ? '#047857' : '#B91C1C'};
    }
    p {
      color: #64748B;
      font-size: 14px;
      line-height: 20px;
      margin-bottom: 24px;
    }
    .btn {
      display: inline-block;
      background: #2563EB;
      color: white;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 10px;
      font-weight: 600;
      font-size: 15px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? '🎉' : '⚠️'}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a class="btn" href="${deepLink}">Return to App</a>
  </div>
  <script>
    // Automatically redirect back to the mobile app
    window.location.href = "${deepLink}";
  </script>
</body>
</html>`

    return new Response(html, {
      status: success ? 200 : 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  // 1. Handle OAuth errors or cancellations from TTLock
  if (errorParam || !code) {
    const errorMsg = errorDesc || errorParam || 'Authorization code was not provided.'
    const failDeepLink = `${appRedirectScheme}?status=error&message=${encodeURIComponent(errorMsg)}`
    return renderResponse('Connection Failed', errorMsg, false, failDeepLink)
  }

  if (!state) {
    const failDeepLink = `${appRedirectScheme}?status=error&message=${encodeURIComponent('User ID state missing')}`
    return renderResponse('Connection Failed', 'State identifier was missing.', false, failDeepLink)
  }

  try {
    const clientId = Deno.env.get('TTLOCK_CLIENT_ID')!
    const clientSecret = Deno.env.get('TTLOCK_CLIENT_SECRET')!
    const redirectUri = Deno.env.get('TTLOCK_REDIRECT_URI')!

    // 2. Exchange authorization code for TTLock tokens
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
    })

    const tokenResponse = await fetch('https://api.ttlock.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.errcode || !tokenData.access_token) {
      const errMsg = tokenData.errmsg || tokenData.error || 'Failed to obtain access token from TTLock'
      const failDeepLink = `${appRedirectScheme}?status=error&message=${encodeURIComponent(errMsg)}`
      return renderResponse('Authentication Error', errMsg, false, failDeepLink)
    }

    // 3. Compute token expiration date
    // TTLock expires_in is typically in seconds (e.g. 7776000 = ~90 days)
    const expiresInSeconds = typeof tokenData.expires_in === 'number' ? tokenData.expires_in : 7776000
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString()

    // 4. Save/Update token in Supabase with admin privileges
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error: dbError } = await supabaseAdmin
      .from('ttlock_tokens')
      .upsert(
        {
          user_id: state,
          ttlock_uid: tokenData.uid,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (dbError) {
      const failDeepLink = `${appRedirectScheme}?status=error&message=${encodeURIComponent(dbError.message)}`
      return renderResponse('Database Error', dbError.message, false, failDeepLink)
    }

    // 5. Success redirect
    const successDeepLink = `${appRedirectScheme}?status=success`
    return renderResponse(
      'TTLock Connected!',
      'Your TTLock account has been successfully connected. You can now return to the app.',
      true,
      successDeepLink
    )

  } catch (err: any) {
    const msg = err?.message || 'An unexpected server error occurred'
    const failDeepLink = `${appRedirectScheme}?status=error&message=${encodeURIComponent(msg)}`
    return renderResponse('Server Error', msg, false, failDeepLink)
  }
})
