import { supabase } from './supabase'

interface PasscodeParams {
  lockId: number
  keyboardPwdName: string
  keyboardPwdType?: number // 3 = Temporary/Period, 2 = Permanent
  startDate: number       // Unix timestamp in milliseconds
  endDate: number         // Unix timestamp in milliseconds
}

export interface TTLockTokenInfo {
  id: string
  ttlock_uid: number
  expires_at: string
}

// 1. Check if the currently logged in user has an active TTLock token
export const checkTTLockConnection = async (): Promise<TTLockTokenInfo | null> => {
  const { data, error } = await supabase
    .from('ttlock_tokens')
    .select('id, ttlock_uid, expires_at')
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data as TTLockTokenInfo
}

// 2. Disconnect/remove TTLock token for the current user
export const disconnectTTLock = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await supabase
      .from('ttlock_tokens')
      .delete()
      .eq('user_id', user.id)
  }
  await supabase.auth.signOut()
}

// 3. Log In with TTLock Account via Direct OAuth2 API & Provision Session
export const loginWithTTLock = async (username: string, password: string) => {
  const { data, error } = await supabase.functions.invoke('ttlock-api', {
    body: {
      action: 'loginWithTTLock',
      username,
      password,
    },
  })

  if (error) {
    let detailedError = error.message
    try {
      if ('context' in error && error.context) {
        const responseBody = await (error.context as Response).json()
        detailedError = responseBody.error || JSON.stringify(responseBody)
      }
    } catch {
      // Fallback
    }
    throw new Error(detailedError)
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  return data
}

export const linkTTLockAccount = loginWithTTLock

// 4. Call Edge Function to generate passcodes using the connected account's token
export const generateTTLockPasscode = async (params: PasscodeParams) => {
  const { data, error } = await supabase.functions.invoke('ttlock-api', {
    body: {
      action: 'getPasscode',
      ...params,
    },
  })

  if (error) {
    let detailedError = error.message
    try {
      if ('context' in error && error.context) {
        const responseBody = await (error.context as Response).json()
        detailedError = responseBody.error || JSON.stringify(responseBody)
      }
    } catch {
      // Fallback
    }
    throw new Error(detailedError)
  }

  return data
}