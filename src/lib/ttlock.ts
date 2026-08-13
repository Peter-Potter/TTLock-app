import { supabase } from './supabase'

interface PasscodeParams {
  lockId: number
  keyboardPwdName: string
  keyboardPwdType?: number // 3 = Temporary/Period, 2 = Permanent
  startDate: number       // Unix timestamp in milliseconds
  endDate: number         // Unix timestamp in milliseconds
}

export const generateTTLockPasscode = async (params: PasscodeParams) => {
  const { data, error } = await supabase.functions.invoke('ttlock-api', {
    body: {
      action: 'getPasscode',
      ...params,
    },
  })

  if (error) {
    // Extract the actual error payload returned by the Edge Function
    let detailedError = error.message
    try {
      if ('context' in error && error.context) {
        const responseBody = await (error.context as Response).json()
        detailedError = responseBody.error || JSON.stringify(responseBody)
      }
    } catch (_) {
      // Fallback to error.message if body isn't JSON
    }
    throw new Error(detailedError)
  }

  return data
}