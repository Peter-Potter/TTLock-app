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
import { useTheme } from '../../context/theme'
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
  const { isDark, toggleTheme, colors } = useTheme()

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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* User Profile Bar & Theme Switcher */}
          <View
            style={[
              styles.headerCard,
              {
                backgroundColor: colors.headerCardBg,
                borderColor: colors.headerCardBorder,
              },
            ]}
          >
            <View style={styles.userInfoRow}>
              <View
                style={[
                  styles.avatarCircle,
                  {
                    backgroundColor: colors.primaryBadgeBg,
                    borderColor: colors.primaryBadgeBorder,
                  },
                ]}
              >
                <Text style={[styles.avatarText, { color: colors.primary }]}>{userInitial}</Text>
              </View>
              <View style={styles.userTextContainer}>
                <Text style={[styles.greetingText, { color: colors.textSecondary }]}>Logged in as host</Text>
                <Text style={[styles.emailText, { color: colors.textPrimary }]} numberOfLines={1}>
                  {user?.email || 'Authenticated User'}
                </Text>
              </View>

              {/* Theme Toggle Button */}
              <TouchableOpacity
                style={[
                  styles.iconButton,
                  {
                    backgroundColor: colors.iconButtonBg,
                    borderColor: colors.iconButtonBorder,
                    marginRight: 8,
                  },
                ]}
                onPress={toggleTheme}
                hitSlop={8}
                accessibilityLabel="Toggle Theme"
              >
                <Ionicons
                  name={isDark ? 'sunny' : 'moon'}
                  size={20}
                  color={isDark ? '#FBBF24' : '#64748B'}
                />
              </TouchableOpacity>

              {/* Sign Out Button */}
              <TouchableOpacity
                style={[
                  styles.iconButton,
                  {
                    backgroundColor: colors.errorBg,
                    borderColor: colors.errorBorder,
                  },
                ]}
                onPress={handleSignOut}
                disabled={signingOut}
                hitSlop={8}
                accessibilityLabel="Sign Out"
              >
                {signingOut ? (
                  <ActivityIndicator size="small" color={colors.error} />
                ) : (
                  <Ionicons name="log-out-outline" size={20} color={colors.error} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {checkingConnection ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Checking TTLock connection...
              </Text>
            </View>
          ) : !tokenInfo ? (
            /* ================= NOT CONNECTED STATE (DIRECT IN-APP LINK) ================= */
            <View
              style={[
                styles.connectCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <View
                style={[
                  styles.connectIconBadge,
                  {
                    backgroundColor: colors.primaryBadgeBg,
                    borderColor: colors.primaryBadgeBorder,
                  },
                ]}
              >
                <Ionicons name="keypad-outline" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.connectTitle, { color: colors.textPrimary }]}>
                Connect TTLock Account
              </Text>
              <Text style={[styles.connectDescription, { color: colors.textSecondary }]}>
                Enter the credentials you use in the official TTLock mobile app to link your locks and issue passcodes.
              </Text>

              {linkError && (
                <View
                  style={[
                    styles.errorContainer,
                    {
                      backgroundColor: colors.errorBg,
                      borderColor: colors.errorBorder,
                    },
                  ]}
                >
                  <Ionicons name="alert-circle" size={20} color={colors.error} style={styles.errorIcon} />
                  <Text style={[styles.errorText, { color: colors.errorText }]}>{linkError}</Text>
                </View>
              )}

              {/* TTLock Username */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>TTLock Account / Email / Phone</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                    },
                  ]}
                >
                  <Ionicons name="person-outline" size={20} color={colors.inputIcon} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    placeholder="e.g. your_ttlock_username"
                    placeholderTextColor={colors.textMuted}
                    value={ttlockUsername}
                    onChangeText={setTtlockUsername}
                    autoCapitalize="none"
                    editable={!linking}
                  />
                </View>
              </View>

              {/* TTLock Password */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>TTLock Password</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                    },
                  ]}
                >
                  <Ionicons name="lock-closed-outline" size={20} color={colors.inputIcon} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    placeholder="Enter TTLock password"
                    placeholderTextColor={colors.textMuted}
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
                      color={colors.inputIcon}
                    />
                  </Pressable>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.primary },
                  linking && styles.buttonDisabled,
                ]}
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
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Smart Lock Dashboard</Text>
                <View
                  style={[
                    styles.connectedBadge,
                    {
                      backgroundColor: colors.successBg,
                      borderColor: colors.successBorder,
                    },
                  ]}
                >
                  <View style={[styles.onlineDot, { backgroundColor: colors.success }]} />
                  <Text style={[styles.connectedText, { color: colors.successText }]}>TTLock Linked</Text>
                </View>
              </View>

              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <View style={styles.lockInfoRow}>
                  <View
                    style={[
                      styles.lockIconContainer,
                      {
                        backgroundColor: colors.primaryBadgeBg,
                        borderColor: colors.primaryBadgeBorder,
                      },
                    ]}
                  >
                    <Ionicons name="keypad" size={26} color={colors.primary} />
                  </View>
                  <View style={styles.lockDetails}>
                    <Text style={[styles.lockName, { color: colors.textPrimary }]}>Main Entrance Lock</Text>
                    <Text style={[styles.lockId, { color: colors.textSecondary }]}>Lock ID: 26242093</Text>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.divider }]} />

                <View style={styles.specGrid}>
                  <View style={styles.specItem}>
                    <Text style={[styles.specLabel, { color: colors.textSecondary }]}>TTLock UID</Text>
                    <Text style={[styles.specValue, { color: colors.textPrimary }]}>{tokenInfo.ttlock_uid || 'Linked'}</Text>
                  </View>
                  <View style={styles.specItem}>
                    <Text style={[styles.specLabel, { color: colors.textSecondary }]}>Passcode Type</Text>
                    <Text style={[styles.specValue, { color: colors.textPrimary }]}>24-Hour Period</Text>
                  </View>
                </View>

                {/* Passcode Generation Action */}
                <TouchableOpacity
                  style={[
                    styles.generateButton,
                    { backgroundColor: colors.primary },
                    generating && styles.buttonDisabled,
                  ]}
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
                <View
                  style={[
                    styles.resultCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.successBorder,
                    },
                  ]}
                >
                  <View style={styles.resultHeader}>
                    <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                    <Text style={[styles.resultTitle, { color: colors.successText }]}>Passcode Ready</Text>
                  </View>

                  <View
                    style={[
                      styles.passcodeBox,
                      {
                        backgroundColor: colors.successBg,
                        borderColor: colors.successBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.passcodeCode, { color: colors.successText }]}>{passcode}</Text>
                  </View>

                  {passcodeExpiry && (
                    <Text style={[styles.expiryText, { color: colors.textSecondary }]}>Valid until: {passcodeExpiry}</Text>
                  )}
                </View>
              )}

              {/* Unlink Account Option */}
              <TouchableOpacity
                style={styles.disconnectButton}
                onPress={handleDisconnect}
                activeOpacity={0.7}
              >
                <Ionicons name="unlink-outline" size={16} color={colors.error} style={{ marginRight: 6 }} />
                <Text style={[styles.disconnectButtonText, { color: colors.error }]}>Unlink TTLock Account</Text>
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
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 40,
  },
  headerCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    shadowColor: '#000',
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
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  userTextContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emailText: {
    fontSize: 15,
    fontWeight: '600',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
  },
  connectCard: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
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
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  connectTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  connectDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
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
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  eyeIconButton: {
    padding: 4,
  },
  primaryButton: {
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
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
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  connectedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
  },
  lockDetails: {
    flex: 1,
  },
  lockName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  lockId: {
    fontSize: 13,
  },
  divider: {
    height: 1,
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
    marginBottom: 4,
  },
  specValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  generateButton: {
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
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
    marginLeft: 6,
  },
  passcodeBox: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginVertical: 8,
  },
  passcodeCode: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 4,
    textAlign: 'center',
  },
  expiryText: {
    fontSize: 13,
    marginTop: 6,
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  disconnectButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
})
