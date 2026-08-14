import React, { useEffect } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { AuthProvider, useAuth } from '../context/auth'

function RootNavigation() {
  const { session, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    const inAuthGroup = (segments as string[])[0] === '(auth)'

    if (!session && !inAuthGroup) {
      // User is not authenticated and trying to access protected area
      router.replace('/(auth)/login' as any)
    } else if (session && inAuthGroup) {
      // User is authenticated but still on auth pages
      router.replace('/(app)' as any)
    }
  }, [session, loading, segments, router])

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    )
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(app)" options={{ headerShown: false }} />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigation />
    </AuthProvider>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
