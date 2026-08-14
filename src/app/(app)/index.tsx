import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../context/auth'
import {
  checkTTLockConnection,
  disconnectTTLock,
  generateTTLockPasscode,
  linkTTLockAccount,
  TTLockTokenInfo,
} from '../../lib/ttlock'

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`)
  } else {
    Alert.alert(title, message)
  }
}

export default function HomeScreen() {
  const { user, signOut } = useAuth()

  const [checkingConnection, setCheckingConnection] = useState(true)
  const [tokenInfo, setTokenInfo] = useState<TTLockTokenInfo | null>(null)

  // TTLock Linking form state
  const [ttlockUsername, setTtlockUsername] = useState('')
  const [ttlockPassword, setTtlockPassword] = useState('')
  const [showTtlockPassword, setShowTtlockPassword] = useState(false)
  const [linking, setLinking] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)

  // Passcode generation state
  const [generating, setGenerating] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [passcode, setPasscode] = useState<string | null>(null)
  const [passcodeExpiry, setPasscodeExpiry] = useState<string | null>(null)

  const refreshStatus = async () => {
    try {
      const info = await checkTTLockConnection()
      setTokenInfo(info)
    } catch (err: any) {
      console.error('Error checking TTLock token status:', err)
    } finally {
      setCheckingConnection(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    const loadStatus = async () => {
      try {
        const info = await checkTTLockConnection()
        if (isMounted) {
          setTokenInfo(info)
        }
      } catch (err: any) {
        console.error('Error checking TTLock token status:', err)
      } finally {
        if (isMounted) {
          setCheckingConnection(false)
        }
      }
    }

    loadStatus()
    return () => {
      isMounted = false
    }
  }, [])

  // Handle Link TTLock Account
  const handleLinkAccount = async () => {
    setLinkError(null)

    const trimmedUsername = ttlockUsername.trim()
    if (!trimmedUsername) {
      setLinkError('Please enter your TTLock username or email.')
      return
    }
    if (!ttlockPassword) {
      setLinkError('Please enter your TTLock password.')
      return
    }

    setLinking(true)
    try {
      await linkTTLockAccount(trimmedUsername, ttlockPassword)
      setTtlockPassword('')
      await refreshStatus()
      showAlert('Success', 'Your TTLock account has been successfully linked!')
    } catch (err: any) {
      setLinkError(err?.message || 'Failed to link TTLock account.')
    } finally {
      setLinking(false)
    }
  }

  // Handle Disconnect TTLock
  const handleDisconnect = async () => {
    const performDisconnect = async () => {
      try {
        await disconnectTTLock()
        setTokenInfo(null)
        setPasscode(null)
        showAlert('Disconnected', 'Your TTLock account has been unlinked.')
      } catch (err: any) {
        showAlert('Error', err?.message || 'Failed to disconnect account.')
      }
    }

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to unlink your TTLock account?')) {
        await performDisconnect()
      }
    } else {
      Alert.alert(
        'Disconnect TTLock',
        'Are you sure you want to unlink your TTLock account?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Disconnect', style: 'destructive', onPress: performDisconnect },
        ]
      )
    }
  }

  // Handle Passcode Generation
  const handleGeneratePasscode = async () => {
    setGenerating(true)
    try {
      const now = Date.now()
      const oneDay = 24 * 60 * 60 * 1000
      const expiryTime = now + oneDay

      const result = await generateTTLockPasscode({
        lockId: 26242093,
        keyboardPwdName: `Passcode for ${user?.email || 'Guest'}`,
        keyboardPwdType: 3,
        startDate: now,
        endDate: expiryTime,
      })

      if (result?.keyboardPwd) {
        setPasscode(result.keyboardPwd)
        setPasscodeExpiry(new Date(expiryTime).toLocaleString())
      } else {
        const errorMsg = result?.errmsg || result?.error || JSON.stringify(result)
        showAlert('TTLock Error', errorMsg)
      }
    } catch (err: any) {
      showAlert('Error', err?.message || 'Failed to generate passcode.')
    } finally {
      setGenerating(false)
    }
  }

  // Handle Sign Out
  const handleSignOut = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        setSigningOut(true)
        await signOut()
      }
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true)
            await signOut()
          },
        },
      ])
    }
  }

  const userInitial = (user?.email?.[0] || 'U').toUpperCase()

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* User Profile Bar */}
          <View style={styles.headerCard}>
            <View style={styles.userInfoRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{userInitial}</Text>
              </View>
              <View style={styles.userTextContainer}>
                <Text style={styles.greetingText}>Logged in as host</Text>
                <Text style={styles.emailText} numberOfLines={1}>
                  {user?.email || 'Authenticated User'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.signOutButton}
                onPress={handleSignOut}
                disabled={signingOut}
                hitSlop={8}
              >
                {signingOut ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <Ionicons name="log-out-outline" size={22} color="#DC2626" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {checkingConnection ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loadingText}>Checking TTLock connection...</Text>
            </View>
          ) : !tokenInfo ? (
            /* ================= NOT CONNECTED STATE (DIRECT IN-APP LINK) ================= */
            <View style={styles.connectCard}>
              <View style={styles.connectIconBadge}>
                <Ionicons name="keypad-outline" size={32} color="#2563EB" />
              </View>
              <Text style={styles.connectTitle}>Connect TTLock Account</Text>
              <Text style={styles.connectDescription}>
                Enter the credentials you use in the official TTLock mobile app to link your locks and issue passcodes.
              </Text>

              {linkError && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={20} color="#DC2626" style={styles.errorIcon} />
                  <Text style={styles.errorText}>{linkError}</Text>
                </View>
              )}

              {/* TTLock Username */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>TTLock Account / Email / Phone</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. your_ttlock_username"
                    placeholderTextColor="#94A3B8"
                    value={ttlockUsername}
                    onChangeText={setTtlockUsername}
                    autoCapitalize="none"
                    editable={!linking}
                  />
                </View>
              </View>

              {/* TTLock Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>TTLock Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter TTLock password"
                    placeholderTextColor="#94A3B8"
                    value={ttlockPassword}
                    onChangeText={setTtlockPassword}
                    secureTextEntry={!showTtlockPassword}
                    autoCapitalize="none"
                    editable={!linking}
                  />
                  <Pressable
                    onPress={() => setShowTtlockPassword((prev) => !prev)}
                    style={styles.eyeIconButton}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={showTtlockPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#64748B"
                    />
                  </Pressable>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, linking && styles.buttonDisabled]}
                onPress={handleLinkAccount}
                disabled={linking}
                activeOpacity={0.8}
              >
                {linking ? (
                  <View style={styles.buttonInnerRow}>
                    <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryButtonText}>Linking TTLock Account...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonInnerRow}>
                    <Ionicons name="link" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryButtonText}>Link TTLock Account</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* ================= CONNECTED STATE (LOCK DASHBOARD) ================= */
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Smart Lock Dashboard</Text>
                <View style={styles.connectedBadge}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.connectedText}>TTLock Linked</Text>
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.lockInfoRow}>
                  <View style={styles.lockIconContainer}>
                    <Ionicons name="keypad" size={26} color="#2563EB" />
                  </View>
                  <View style={styles.lockDetails}>
                    <Text style={styles.lockName}>Main Entrance Lock</Text>
                    <Text style={styles.lockId}>Lock ID: 26242093</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.specGrid}>
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>TTLock UID</Text>
                    <Text style={styles.specValue}>{tokenInfo.ttlock_uid || 'Linked'}</Text>
                  </View>
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>Passcode Type</Text>
                    <Text style={styles.specValue}>24-Hour Period</Text>
                  </View>
                </View>

                {/* Passcode Generation Action */}
                <TouchableOpacity
                  style={[styles.generateButton, generating && styles.buttonDisabled]}
                  onPress={handleGeneratePasscode}
                  disabled={generating}
                  activeOpacity={0.8}
                >
                  {generating ? (
                    <View style={styles.buttonInnerRow}>
                      <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
                      <Text style={styles.generateButtonText}>Generating Passcode...</Text>
                    </View>
                  ) : (
                    <View style={styles.buttonInnerRow}>
                      <Ionicons name="key-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.generateButtonText}>Generate Passcode</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Generated Passcode Result Card */}
              {passcode && (
                <View style={styles.resultCard}>
                  <View style={styles.resultHeader}>
                    <Ionicons name="checkmark-circle" size={22} color="#059669" />
                    <Text style={styles.resultTitle}>Passcode Ready</Text>
                  </View>

                  <View style={styles.passcodeBox}>
                    <Text style={styles.passcodeCode}>{passcode}</Text>
                  </View>

                  {passcodeExpiry && (
                    <Text style={styles.expiryText}>Valid until: {passcodeExpiry}</Text>
                  )}
                </View>
              )}

              {/* Unlink Account Option */}
              <TouchableOpacity
                style={styles.disconnectButton}
                onPress={handleDisconnect}
                activeOpacity={0.7}
              >
                <Ionicons name="unlink-outline" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={styles.disconnectButtonText}>Unlink TTLock Account</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563EB',
  },
  userTextContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  emailText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  signOutButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 14,
    color: '#64748B',
    fontSize: 14,
  },
  connectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    marginTop: 10,
  },
  connectIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  connectTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  connectDescription: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#B91C1C',
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    height: '100%',
  },
  eyeIconButton: {
    padding: 4,
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  connectedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 20,
  },
  lockInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  lockDetails: {
    flex: 1,
  },
  lockName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  lockId: {
    fontSize: 13,
    color: '#64748B',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  specGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  specItem: {
    flex: 1,
  },
  specLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  specValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  generateButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
    alignItems: 'center',
    marginBottom: 20,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#065F46',
    marginLeft: 6,
  },
  passcodeBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderWidth: 2,
    borderColor: '#86EFAC',
    borderStyle: 'dashed',
    marginVertical: 8,
  },
  passcodeCode: {
    fontSize: 28,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 4,
    textAlign: 'center',
  },
  expiryText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  disconnectButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
})
