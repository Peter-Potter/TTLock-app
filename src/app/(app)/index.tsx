import { Ionicons } from '@expo/vector-icons'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useAuth } from '../../context/auth'
import { useTheme } from '../../context/theme'
import {
  checkTTLockConnection,
  disconnectTTLock,
  generateTTLockPasscode,
  linkTTLockAccount,
  TTLockTokenInfo,
} from '../../lib/ttlock'

type PasscodeOption = 'one_time' | 'permanent' | '1_hour' | '24_hours'

interface PasscodeOptionConfig {
  label: string
  description: string
  type: number
  durationMs?: number
  badgeText: string
}

const PASSCODE_CONFIGS: Record<PasscodeOption, PasscodeOptionConfig> = {
  'one_time': {
    label: 'One-Time Passcode',
    description: 'Valid for 1 single unlock (within 6h)',
    type: 1,
    badgeText: 'One-Time',
  },
  'permanent': {
    label: 'Permanent Passcode',
    description: 'Never expires (activate within 24h)',
    type: 2,
    badgeText: 'Permanent',
  },
  '1_hour': {
    label: '1 Hour Period',
    description: 'Temporary passcode valid for 1 hour',
    type: 3,
    durationMs: 1 * 60 * 60 * 1000,
    badgeText: '1 Hour',
  },
  '24_hours': {
    label: '24-Hour Period',
    description: 'Temporary passcode valid for 24 hours',
    type: 3,
    durationMs: 24 * 60 * 60 * 1000,
    badgeText: '24-Hour',
  },
}

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
  const [passcodeOption, setPasscodeOption] = useState<PasscodeOption>('24_hours')
  const [showTypeSelector, setShowTypeSelector] = useState(false)
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
      const config = PASSCODE_CONFIGS[passcodeOption]
      const now = Date.now()
      const endDate = config.durationMs ? now + config.durationMs : now

      const result = await generateTTLockPasscode({
        lockId: 26242093,
        keyboardPwdName: `Passcode (${config.badgeText})`,
        keyboardPwdType: config.type,
        startDate: now,
        endDate: endDate,
      })

      if (result?.keyboardPwd) {
        setPasscode(result.keyboardPwd)
        if (config.type === 1) {
          setPasscodeExpiry('One-time use (within 6 hours)')
        } else if (config.type === 2) {
          setPasscodeExpiry('Permanent (activate within 24 hours)')
        } else {
          setPasscodeExpiry(`Valid until: ${new Date(endDate).toLocaleString()}`)
        }
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

  // Non-className props that require raw color values
  const placeholderColor = isDark ? '#6B7280' : '#94A3B8'
  const inputIconColor = isDark ? '#9CA3AF' : '#64748B'
  const primaryColor = isDark ? '#3B82F6' : '#2563EB'
  const errorColor = isDark ? '#EF4444' : '#DC2626'
  const successColor = isDark ? '#10B981' : '#059669'

  const userInitial = (user?.email?.[0] || 'U').toUpperCase()

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-[#0B0F19]">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: Platform.OS === 'android' ? 40 : 20,
            paddingBottom: 40,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* User Profile Bar & Theme Switcher */}
          <View
            className="rounded-2xl p-4 mb-6 border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <View className="flex-row items-center">
              <View className="w-11 h-11 rounded-full border items-center justify-center mr-3 border-blue-100 dark:border-slate-700 bg-blue-50 dark:bg-slate-800">
                <Text className="text-[18px] font-bold text-blue-600 dark:text-blue-500">
                  {userInitial}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs font-medium text-slate-500 dark:text-gray-400">
                  Logged in as host
                </Text>
                <Text className="text-[15px] font-semibold text-slate-900 dark:text-gray-50" numberOfLines={1}>
                  {user?.email || 'Authenticated User'}
                </Text>
              </View>

              {/* Theme Toggle Button */}
              <TouchableOpacity
                className="w-10 h-10 rounded-[10px] items-center justify-center border mr-2 border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-800"
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
                className="w-10 h-10 rounded-[10px] items-center justify-center border border-red-300 dark:border-red-800 bg-red-50 dark:bg-[#450A0A]"
                onPress={handleSignOut}
                disabled={signingOut}
                hitSlop={8}
                accessibilityLabel="Sign Out"
              >
                {signingOut ? (
                  <ActivityIndicator size="small" color={errorColor} />
                ) : (
                  <Ionicons name="log-out-outline" size={20} color={errorColor} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {checkingConnection ? (
            <View className="py-16 items-center justify-center">
              <ActivityIndicator size="large" color={primaryColor} />
              <Text className="mt-3.5 text-sm text-slate-500 dark:text-gray-400">
                Checking TTLock connection...
              </Text>
            </View>
          ) : !tokenInfo ? (
            /* ================= NOT CONNECTED STATE (DIRECT IN-APP LINK) ================= */
            <View
              className="rounded-2xl p-6 border mt-2.5 border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.06,
                shadowRadius: 12,
                elevation: 2,
              }}
            >
              <View className="w-16 h-16 rounded-[20px] border self-center items-center justify-center mb-4 border-blue-100 dark:border-slate-700 bg-blue-50 dark:bg-slate-800">
                <Ionicons name="keypad-outline" size={32} color={primaryColor} />
              </View>
              <Text className="text-xl font-bold mb-2 text-center text-slate-900 dark:text-gray-50">
                Connect TTLock Account
              </Text>
              <Text className="text-sm text-center leading-[22px] mb-5 text-slate-500 dark:text-gray-400">
                Enter the credentials you use in the official TTLock mobile app to link your locks and issue passcodes.
              </Text>

              {linkError && (
                <View className="flex-row items-center border rounded-[10px] p-3 mb-4 border-red-300 dark:border-red-800 bg-red-50 dark:bg-[#450A0A]">
                  <Ionicons name="alert-circle" size={20} color={errorColor} className="mr-2" />
                  <Text className="flex-1 text-[13px] leading-[18px] text-red-700 dark:text-red-300">
                    {linkError}
                  </Text>
                </View>
              )}

              {/* TTLock Username */}
              <View className="mb-4">
                <Text className="text-sm font-semibold mb-1.5 text-slate-900 dark:text-gray-50">
                  TTLock Account / Email / Phone
                </Text>
                <View className="flex-row items-center border rounded-[10px] px-3 h-12 border-slate-300 dark:border-gray-700 bg-slate-50 dark:bg-gray-800">
                  <Ionicons name="person-outline" size={20} color={inputIconColor} className="mr-2" />
                  <TextInput
                    className="flex-1 text-[15px] h-full text-slate-900 dark:text-gray-50"
                    placeholder="e.g. your_ttlock_username"
                    placeholderTextColor={placeholderColor}
                    value={ttlockUsername}
                    onChangeText={setTtlockUsername}
                    autoCapitalize="none"
                    editable={!linking}
                  />
                </View>
              </View>

              {/* TTLock Password */}
              <View className="mb-4">
                <Text className="text-sm font-semibold mb-1.5 text-slate-900 dark:text-gray-50">
                  TTLock Password
                </Text>
                <View className="flex-row items-center border rounded-[10px] px-3 h-12 border-slate-300 dark:border-gray-700 bg-slate-50 dark:bg-gray-800">
                  <Ionicons name="lock-closed-outline" size={20} color={inputIconColor} className="mr-2" />
                  <TextInput
                    className="flex-1 text-[15px] h-full text-slate-900 dark:text-gray-50"
                    placeholder="Enter TTLock password"
                    placeholderTextColor={placeholderColor}
                    value={ttlockPassword}
                    onChangeText={setTtlockPassword}
                    secureTextEntry={!showTtlockPassword}
                    autoCapitalize="none"
                    editable={!linking}
                  />
                  <Pressable
                    onPress={() => setShowTtlockPassword((prev) => !prev)}
                    className="p-1"
                    hitSlop={8}
                  >
                    <Ionicons
                      name={showTtlockPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={inputIconColor}
                    />
                  </Pressable>
                </View>
              </View>

              <TouchableOpacity
                className={`rounded-xl h-12 px-5 items-center justify-center w-full mt-2 bg-blue-600 dark:bg-blue-500${linking ? ' opacity-65' : ''}`}
                onPress={handleLinkAccount}
                disabled={linking}
                activeOpacity={0.8}
                style={{
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 6,
                  elevation: 2,
                }}
              >
                {linking ? (
                  <View className="flex-row items-center justify-center">
                    <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
                    <Text className="text-white text-[15px] font-semibold">Linking TTLock Account...</Text>
                  </View>
                ) : (
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="link" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text className="text-white text-[15px] font-semibold">Link TTLock Account</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* ================= CONNECTED STATE (LOCK DASHBOARD) ================= */
            <>
              <View className="flex-row justify-between items-center mb-3.5">
                <Text className="text-lg font-bold text-slate-900 dark:text-gray-50">
                  Smart Lock Dashboard
                </Text>
                <View className="flex-row items-center px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-950">
                  <View className="w-1.5 h-1.5 rounded-full mr-1 bg-emerald-500 dark:bg-emerald-400" />
                  <Text className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    TTLock Linked
                  </Text>
                </View>
              </View>

              <View
                className="rounded-2xl p-5 border mb-5 border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.05,
                  shadowRadius: 10,
                  elevation: 2,
                }}
              >
                <View className="flex-row items-center">
                  <View className="w-[50px] h-[50px] rounded-[14px] items-center justify-center mr-3.5 border border-blue-100 dark:border-slate-700 bg-blue-50 dark:bg-slate-800">
                    <Ionicons name="keypad" size={26} color={primaryColor} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold mb-0.5 text-slate-900 dark:text-gray-50">
                      Main Entrance Lock
                    </Text>
                    <Text className="text-[13px] text-slate-500 dark:text-gray-400">
                      Lock ID: 26242093
                    </Text>
                  </View>
                </View>

                <View className="h-px my-4 bg-slate-100 dark:bg-gray-800" />

                <View className="flex-row justify-between mb-4 items-center">
                  <View className="flex-1">
                    <Text className="text-xs mb-1 text-slate-500 dark:text-gray-400">TTLock UID</Text>
                    <Text className="text-sm font-semibold text-slate-900 dark:text-gray-50">
                      {tokenInfo.ttlock_uid || 'Linked'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    className="items-end"
                    onPress={() => setShowTypeSelector((prev) => !prev)}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center mb-1">
                      <Text className="text-xs text-slate-500 dark:text-gray-400 mr-1">Passcode Type</Text>
                      <Ionicons
                        name={showTypeSelector ? 'chevron-up' : 'chevron-down'}
                        size={12}
                        color={inputIconColor}
                      />
                    </View>
                    <View className="flex-row items-center px-2.5 py-1 rounded-lg border border-blue-200 dark:border-slate-700 bg-blue-50 dark:bg-slate-800">
                      <Text className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                        {PASSCODE_CONFIGS[passcodeOption].badgeText}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Inline Dropdown Options */}
                {showTypeSelector && (
                  <View className="mb-4 rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50/80 dark:bg-gray-800/50 p-1.5 overflow-hidden">
                    <Text className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-400 px-2 py-1 mb-0.5">
                      Select Type / Duration
                    </Text>
                    {(Object.keys(PASSCODE_CONFIGS) as PasscodeOption[]).map((key) => {
                      const item = PASSCODE_CONFIGS[key]
                      const isSelected = passcodeOption === key
                      return (
                        <TouchableOpacity
                          key={key}
                          className={`flex-row items-center justify-between py-2 px-2.5 rounded-lg mb-1 ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800'
                              : 'bg-transparent'
                          }`}
                          onPress={() => {
                            setPasscodeOption(key)
                            setShowTypeSelector(false)
                          }}
                          activeOpacity={0.7}
                        >
                          <View className="flex-1 mr-2">
                            <Text
                              className={`text-[13px] font-semibold ${
                                isSelected
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-slate-800 dark:text-gray-200'
                              }`}
                            >
                              {item.label}
                            </Text>
                            <Text className="text-[11px] text-slate-500 dark:text-gray-400">
                              {item.description}
                            </Text>
                          </View>
                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={18} color={primaryColor} />
                          )}
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                )}

                {/* Passcode Generation Action */}
                <TouchableOpacity
                  className={`rounded-xl h-12 items-center justify-center bg-blue-600 dark:bg-blue-500${generating ? ' opacity-65' : ''}`}
                  onPress={handleGeneratePasscode}
                  disabled={generating}
                  activeOpacity={0.8}
                  style={{
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 6,
                    elevation: 2,
                  }}
                >
                  {generating ? (
                    <View className="flex-row items-center justify-center">
                      <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
                      <Text className="text-white text-[15px] font-semibold">Generating Passcode...</Text>
                    </View>
                  ) : (
                    <View className="flex-row items-center justify-center">
                      <Ionicons name="key-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text className="text-white text-[15px] font-semibold">Generate Passcode</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Generated Passcode Result Card */}
              {passcode && (
                <View
                  className="rounded-2xl p-5 border mb-5 items-center border-emerald-200 dark:border-emerald-600 bg-white dark:bg-gray-900"
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.08,
                    shadowRadius: 10,
                    elevation: 2,
                  }}
                >
                  <View className="flex-row items-center mb-3">
                    <Ionicons name="checkmark-circle" size={22} color={successColor} />
                    <Text className="text-[15px] font-semibold ml-1.5 text-emerald-700 dark:text-emerald-300">
                      Passcode Ready
                    </Text>
                  </View>

                  <View className="rounded-xl px-7 py-3.5 border-2 border-dashed my-2 border-emerald-200 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-950">
                    <Text className="text-[28px] font-extrabold tracking-[4px] text-center text-emerald-700 dark:text-emerald-300">
                      {passcode}
                    </Text>
                  </View>

                  {passcodeExpiry && (
                    <Text className="text-[13px] mt-1.5 text-slate-500 dark:text-gray-400">
                      {passcodeExpiry.startsWith('Valid until:') ? passcodeExpiry : `Validity: ${passcodeExpiry}`}
                    </Text>
                  )}
                </View>
              )}

              {/* Unlink Account Option */}
              <TouchableOpacity
                className="flex-row items-center justify-center py-3"
                onPress={handleDisconnect}
                activeOpacity={0.7}
              >
                <Ionicons name="unlink-outline" size={16} color={errorColor} style={{ marginRight: 6 }} />
                <Text className="text-sm font-semibold text-red-600 dark:text-red-500">
                  Unlink TTLock Account
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
