import { useEffect, useState } from 'react'
import { Button, Platform, StyleSheet, Text, View } from 'react-native'
import { supabase } from '../lib/supabase'
import { generateTTLockPasscode } from '../lib/ttlock'

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`)
  } else {
    const { Alert } = require('react-native')
    Alert.alert(title, message)
  }
}

export default function HomeScreen() {
  const [loading, setLoading] = useState(false)
  const [passcode, setPasscode] = useState<string | null>(null)
  const [userStatus, setUserStatus] = useState<string>('Logging in...')

  useEffect(() => {
    // Automatically log in as test user on startup
    const autoLogin = async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123',
      })

      if (error) {
        setUserStatus(`Auth Error: ${error.message}`)
      } else {
        setUserStatus(`Logged in as: ${data.user.email}`)
      }
    }

    autoLogin()
  }, [])

  const handleGeneratePasscode = async () => {
    console.log("1. Button pressed")
    setLoading(true)
    try {
      console.log("2. Calling generateTTLockPasscode...")
      const now = Date.now()
      const oneDay = 24 * 60 * 60 * 1000

      const result = await generateTTLockPasscode({
        lockId: 26242093,
        keyboardPwdName: 'Guest Passcode',
        keyboardPwdType: 3,
        startDate: now,
        endDate: now + oneDay,
      })

      console.log("3. Edge Function Response:", result)

      if (result?.keyboardPwd) {
        setPasscode(result.keyboardPwd)
      } else {
        const errorMsg = result?.errmsg || result?.error || JSON.stringify(result)
        showAlert('TTLock Error', errorMsg)
      }
    } catch (err: any) {
      console.error("4. Caught Exception:", err)
      showAlert('Network/App Error', err?.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TTLock Management</Text>
      <Text style={styles.status}>{userStatus}</Text>
      <Button
        title={loading ? 'Generating...' : 'Generate Passcode'}
        onPress={handleGeneratePasscode}
        disabled={loading}
      />
      {passcode && <Text style={styles.result}>Generated Passcode: {passcode}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  status: { fontSize: 14, color: '#666', marginBottom: 20 },
  result: { marginTop: 20, fontSize: 18, color: 'green', fontWeight: 'bold' },
})