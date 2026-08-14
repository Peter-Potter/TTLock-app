import React, { createContext, useContext, useEffect, useState } from 'react'
import { useColorScheme as useNativeColorScheme, Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

export type ThemeMode = 'light' | 'dark' | 'system'

export interface ThemeColors {
  background: string
  card: string
  cardBorder: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  primary: string
  primaryHover: string
  primaryBadgeBg: string
  primaryBadgeBorder: string
  inputBg: string
  inputBorder: string
  inputIcon: string
  divider: string
  success: string
  successBg: string
  successBorder: string
  successText: string
  error: string
  errorBg: string
  errorBorder: string
  errorText: string
  headerCardBg: string
  headerCardBorder: string
  iconButtonBg: string
  iconButtonBorder: string
}

export const lightColors: ThemeColors = {
  background: '#F8FAFC',
  card: '#FFFFFF',
  cardBorder: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  primary: '#2563EB',
  primaryHover: '#1D4ED8',
  primaryBadgeBg: '#EFF6FF',
  primaryBadgeBorder: '#DBEAFE',
  inputBg: '#F8FAFC',
  inputBorder: '#CBD5E1',
  inputIcon: '#64748B',
  divider: '#F1F5F9',
  success: '#059669',
  successBg: '#ECFDF5',
  successBorder: '#A7F3D0',
  successText: '#047857',
  error: '#DC2626',
  errorBg: '#FEF2F2',
  errorBorder: '#FCA5A5',
  errorText: '#B91C1C',
  headerCardBg: '#FFFFFF',
  headerCardBorder: '#E2E8F0',
  iconButtonBg: '#F1F5F9',
  iconButtonBorder: '#E2E8F0',
}

export const darkColors: ThemeColors = {
  background: '#0B0F19',
  card: '#111827',
  cardBorder: '#1F2937',
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  primary: '#3B82F6',
  primaryHover: '#2563EB',
  primaryBadgeBg: '#1E293B',
  primaryBadgeBorder: '#334155',
  inputBg: '#1F2937',
  inputBorder: '#374151',
  inputIcon: '#9CA3AF',
  divider: '#1F2937',
  success: '#10B981',
  successBg: '#064E3B',
  successBorder: '#059669',
  successText: '#6EE7B7',
  error: '#EF4444',
  errorBg: '#450A0A',
  errorBorder: '#991B1B',
  errorText: '#FCA5A5',
  headerCardBg: '#111827',
  headerCardBorder: '#1F2937',
  iconButtonBg: '#1F2937',
  iconButtonBorder: '#374151',
}

interface ThemeContextType {
  themeMode: ThemeMode
  isDark: boolean
  colors: ThemeColors
  setThemeMode: (mode: ThemeMode) => Promise<void>
  toggleTheme: () => Promise<void>
}

const STORAGE_KEY = 'user_theme_preference'

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'system',
  isDark: false,
  colors: lightColors,
  setThemeMode: async () => {},
  toggleTheme: async () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useNativeColorScheme()
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system')

  // Load saved preference on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        let saved: string | null = null
        if (Platform.OS === 'web') {
          saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
        } else {
          saved = await SecureStore.getItemAsync(STORAGE_KEY)
        }

        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setThemeModeState(saved)
        }
      } catch (e) {
        console.error('Failed to load theme preference', e)
      }
    }
    loadTheme()
  }, [])

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode)
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, mode)
      } else {
        await SecureStore.setItemAsync(STORAGE_KEY, mode)
      }
    } catch (e) {
      console.error('Failed to save theme preference', e)
    }
  }

  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark')

  const toggleTheme = async () => {
    const nextMode: ThemeMode = isDark ? 'light' : 'dark'
    await setThemeMode(nextMode)
  }

  const colors = isDark ? darkColors : lightColors

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        isDark,
        colors,
        setThemeMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
