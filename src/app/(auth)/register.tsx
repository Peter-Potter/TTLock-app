import React from 'react'
import {
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Link, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../context/theme'

export default function RegisterScreen() {
  const { isDark, toggleTheme } = useTheme()
  const router = useRouter()
  const primaryColor = isDark ? '#3B82F6' : '#2563EB'

  return (
    <View className="flex-1 bg-slate-50 dark:bg-[#0B0F19]">
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
        showsVerticalScrollIndicator={false}
      >
        {/* Card */}
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
          <View
            className="w-16 h-16 rounded-[20px] items-center justify-center mb-4 self-center border border-blue-100 dark:border-slate-700 bg-blue-50 dark:bg-slate-800"
          >
            <Ionicons name="information-circle" size={32} color={primaryColor} />
          </View>

          <Text className="text-xl font-bold mb-2 text-center text-slate-900 dark:text-gray-50">
            No Extra Registration Needed
          </Text>

          <Text className="text-sm text-center leading-6 mb-6 text-slate-500 dark:text-gray-400">
            This app connects directly to your existing TTLock account. If you do not have an account yet, download the official TTLock app from Google Play or Apple App Store to register your lock, then sign in here.
          </Text>

          <TouchableOpacity
            className="rounded-[10px] h-12 items-center justify-center bg-blue-600 dark:bg-blue-500"
            onPress={() => router.replace('/(auth)/login' as any)}
            activeOpacity={0.8}
          >
            <Text className="text-white text-base font-semibold">Back to Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View className="flex-row justify-center items-center mt-7">
          <Link href={'/(auth)/login' as any} asChild>
            <TouchableOpacity hitSlop={8}>
              <Text className="text-sm font-semibold text-blue-600 dark:text-blue-500">
                Go to TTLock Sign In
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </View>
  )
}
