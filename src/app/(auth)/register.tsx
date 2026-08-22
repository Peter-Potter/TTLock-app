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
import { Link } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../context/auth'
import { useTheme } from '../../context/theme'

export default function RegisterScreen() {
  const { signUp } = useAuth()
  const { isDark, toggleTheme } = useTheme()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  const handleRegister = async () => {
    setErrorMessage(null)
    setInfoMessage(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address.')
      return
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.')
      return
    }

    if (!password) {
      setErrorMessage('Please enter a password.')
      return
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await signUp(trimmedEmail, password)
      if (error) {
        setErrorMessage(error.message || 'Failed to create account.')
      } else if (data?.user && !data?.session) {
        // Confirmation email sent
        setInfoMessage('Account created! Please check your email to confirm your registration.')
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
            <Ionicons name="person-add" size={34} color={primaryColor} />
          </View>
          <Text className="text-[26px] font-bold mb-2 tracking-[-0.5px] text-slate-900 dark:text-gray-50">
            Create Account
          </Text>
          <Text className="text-sm text-center max-w-[280px] leading-5 text-slate-500 dark:text-gray-400">
            Sign up to start managing your TTLock devices
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

          {infoMessage && (
            <View className="flex-row items-center border rounded-[10px] p-3 mb-[18px] border-emerald-200 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-950">
              <Ionicons name="checkmark-circle" size={20} color={isDark ? '#10B981' : '#059669'} className="mr-2" />
              <Text className="flex-1 text-[13px] leading-[18px] text-emerald-700 dark:text-emerald-300">
                {infoMessage}
              </Text>
            </View>
          )}

          {/* Email Field */}
          <View className="mb-[18px]">
            <Text className="text-sm font-semibold mb-1.5 text-slate-900 dark:text-gray-50">
              Email Address
            </Text>
            <View className="flex-row items-center border rounded-[10px] px-3 h-12 border-slate-300 dark:border-gray-700 bg-slate-50 dark:bg-gray-800">
              <Ionicons name="mail-outline" size={20} color={inputIconColor} className="mr-2" />
              <TextInput
                className="flex-1 text-[15px] h-full text-slate-900 dark:text-gray-50"
                placeholder="name@example.com"
                placeholderTextColor={placeholderColor}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                editable={!loading}
              />
            </View>
          </View>

          {/* Password Field */}
          <View className="mb-[18px]">
            <Text className="text-sm font-semibold mb-1.5 text-slate-900 dark:text-gray-50">
              Password
            </Text>
            <View className="flex-row items-center border rounded-[10px] px-3 h-12 border-slate-300 dark:border-gray-700 bg-slate-50 dark:bg-gray-800">
              <Ionicons name="lock-closed-outline" size={20} color={inputIconColor} className="mr-2" />
              <TextInput
                className="flex-1 text-[15px] h-full text-slate-900 dark:text-gray-50"
                placeholder="At least 6 characters"
                placeholderTextColor={placeholderColor}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                textContentType="newPassword"
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

          {/* Confirm Password Field */}
          <View className="mb-[18px]">
            <Text className="text-sm font-semibold mb-1.5 text-slate-900 dark:text-gray-50">
              Confirm Password
            </Text>
            <View className="flex-row items-center border rounded-[10px] px-3 h-12 border-slate-300 dark:border-gray-700 bg-slate-50 dark:bg-gray-800">
              <Ionicons name="shield-checkmark-outline" size={20} color={inputIconColor} className="mr-2" />
              <TextInput
                className="flex-1 text-[15px] h-full text-slate-900 dark:text-gray-50"
                placeholder="Re-enter your password"
                placeholderTextColor={placeholderColor}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                textContentType="newPassword"
                editable={!loading}
              />
              <Pressable
                onPress={() => setShowConfirmPassword((prev) => !prev)}
                className="p-1"
                hitSlop={8}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={inputIconColor}
                />
              </Pressable>
            </View>
          </View>

          {/* Sign Up Action Button */}
          <TouchableOpacity
            className={`rounded-[10px] h-12 items-center justify-center mt-2 bg-blue-600 dark:bg-blue-500${loading ? ' opacity-65' : ''}`}
            onPress={handleRegister}
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
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white text-base font-semibold">Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer / Switch to Login */}
        <View className="flex-row justify-center items-center mt-7">
          <Text className="text-sm text-slate-500 dark:text-gray-400">Already have an account? </Text>
          <Link href={'/(auth)/login' as any} asChild>
            <TouchableOpacity hitSlop={8}>
              <Text className="text-sm font-semibold text-blue-600 dark:text-blue-500">Sign in</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
