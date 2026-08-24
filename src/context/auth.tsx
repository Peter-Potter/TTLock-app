import { Session, User } from '@supabase/supabase-js'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { loginWithTTLock as loginWithTTLockLib } from '../lib/ttlock'

interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  loginWithTTLock: (username: string, password: string) => Promise<{ data: any; error: any }>
  signOut: () => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  loginWithTTLock: async () => ({ data: null, error: null }),
  signOut: async () => ({ error: null }),
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Fetch the initial active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // 2. Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const loginWithTTLock = async (username: string, password: string) => {
    try {
      const data = await loginWithTTLockLib(username, password)
      if (data?.session) {
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        })
        
        if (sessionError) {
          return { data: null, error: sessionError }
        }
        setSession(sessionData.session)
        setUser(sessionData.user)
      }
      return { data, error: null }
    } catch (err: any) {
      console.log("Inside the second block")
      return { data: null, error: err }
    }
  }

  const signOut = async () => {
    const response = await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    return response
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        loginWithTTLock,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
