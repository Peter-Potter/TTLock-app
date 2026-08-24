import React, { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../context/auth'
import { useTheme } from '../../context/theme'

export default function LoginScreen() {
  const { loginWithTTLock } = useAuth()
  const { isDark, toggleTheme } = useTheme()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleLogin = async () => {
    setErrorMessage(null)

    const trimmedUsername = username.trim()
    if (!trimmedUsername) {
      setErrorMessage('Please enter your TTLock username, email, or phone.')
      return
    }
    if (!password) {
      setErrorMessage('Please enter your TTLock password.')
      return
    }

    setLoading(true)
    try {
      const { error } = await loginWithTTLock(trimmedUsername, password)
      if (error) {
        setErrorMessage(error.message || 'Invalid TTLock credentials. Please try again.')
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Non-className props that require raw color values
  const placeholderColor = isDark ? '#6B7280' : '#94A3B8'
  const inputIconColor = isDark ? '#9CA3AF' : '#64748B'
  const primaryColor = isDark ? '#3B82F6' : '#2563EB'

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-50 dark:bg-[#0B0F19]"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Floating Theme Switcher */}
      <View className="items-end px-6 ios:pt-5 android:pt-11">
        <TouchableOpacity
          className="w-9 h-9 rounded-full items-center justify-center border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-gray-800"
          onPress={toggleTheme}
          hitSlop={8}
          accessibilityLabel="Toggle Theme"
        >
          <Ionicons
            name={isDark ? 'sunny' : 'moon'}
            size={18}
            color={isDark ? '#FBBF24' : '#64748B'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerClassName="flex-grow justify-center px-6 pb-10"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View className="items-center mb-8">
          <View
            className="w-[72px] h-[72px] rounded-[20px] items-center justify-center mb-4 border border-blue-100 dark:border-slate-700 bg-blue-50 dark:bg-slate-800"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Ionicons name="keypad" size={36} color={primaryColor} />
          </View>
          <Text className="text-[26px] font-bold mb-2 tracking-[-0.5px] text-slate-900 dark:text-gray-50">
            TTLock Passcode Manager
          </Text>
          <Text className="text-sm text-center max-w-[300px] leading-5 text-slate-500 dark:text-gray-400">
            Sign in with your official TTLock account to manage locks and generate instant passcodes
          </Text>
        </View>

        {/* Card Form */}
        <View
          className="rounded-2xl p-6 border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          {errorMessage && (
            <View className="flex-row items-center border rounded-[10px] p-3 mb-[18px] border-red-300 dark:border-red-800 bg-red-50 dark:bg-[#450A0A]">
              <Ionicons name="alert-circle" size={20} color={isDark ? '#EF4444' : '#DC2626'} className="mr-2" />
              <Text className="flex-1 text-[13px] leading-[18px] text-red-700 dark:text-red-300">
                {errorMessage}
              </Text>
            </View>
          )}

          {/* TTLock Username / Email Field */}
          <View className="mb-[18px]">
            <Text className="text-sm font-semibold mb-1.5 text-slate-900 dark:text-gray-50">
              TTLock Username / Email / Phone
            </Text>
            <View className="flex-row items-center border rounded-[10px] px-3 h-12 border-slate-300 dark:border-gray-700 bg-slate-50 dark:bg-gray-800">
              <Ionicons name="person-outline" size={20} color={inputIconColor} className="mr-2" />
              <TextInput
                className="flex-1 text-[15px] h-full text-slate-900 dark:text-gray-50"
                placeholder="e.g. user@example.com or phone"
                placeholderTextColor={placeholderColor}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoComplete="username"
                editable={!loading}
              />
            </View>
          </View>

          {/* Password Field */}
          <View className="mb-[18px]">
            <Text className="text-sm font-semibold mb-1.5 text-slate-900 dark:text-gray-50">
              TTLock Password
            </Text>
            <View className="flex-row items-center border rounded-[10px] px-3 h-12 border-slate-300 dark:border-gray-700 bg-slate-50 dark:bg-gray-800">
              <Ionicons name="lock-closed-outline" size={20} color={inputIconColor} className="mr-2" />
              <TextInput
                className="flex-1 text-[15px] h-full text-slate-900 dark:text-gray-50"
                placeholder="Enter TTLock password"
                placeholderTextColor={placeholderColor}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                textContentType="password"
                editable={!loading}
              />
              <Pressable
                onPress={() => setShowPassword((prev) => !prev)}
                className="p-1"
                hitSlop={8}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={inputIconColor}
                />
              </Pressable>
            </View>
          </View>

          {/* Sign In Action Button */}
          <TouchableOpacity
            className={`rounded-[10px] h-12 items-center justify-center mt-2 bg-blue-600 dark:bg-blue-500${loading ? ' opacity-65' : ''}`}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
            style={{
              shadowColor: '#2563EB',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            {loading ? (
              <View className="flex-row items-center justify-center">
                <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
                <Text className="text-white text-base font-semibold">Signing into TTLock...</Text>
              </View>
            ) : (
              <View className="flex-row items-center justify-center">
                <Ionicons name="log-in-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text className="text-white text-base font-semibold">Sign In with TTLock</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Informational Help Note */}
        <View className="items-center mt-7 px-4">
          <Text className="text-xs text-center text-slate-400 dark:text-gray-500 leading-5">
            Use the credentials from your official TTLock application. Your password is securely encrypted via MD5 OAuth before transmission.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
