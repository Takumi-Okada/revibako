'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './auth-context'
import { User } from '@supabase/supabase-js'

interface UseRequireAuthLoading {
  user: null
  loading: true
  isAuthenticated: false
}

interface UseRequireAuthAuthenticated {
  user: User
  loading: false
  isAuthenticated: true
}

interface UseRequireAuthUnauthenticated {
  user: null
  loading: false
  isAuthenticated: false
}

type UseRequireAuthResult = 
  | UseRequireAuthLoading 
  | UseRequireAuthAuthenticated 
  | UseRequireAuthUnauthenticated

export function useRequireAuth(): UseRequireAuthResult {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // ローディング完了後、ユーザーが存在しない場合はログインページへ
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return { user: null, loading: true, isAuthenticated: false }
  }

  if (user) {
    return { user, loading: false, isAuthenticated: true }
  }

  return { user: null, loading: false, isAuthenticated: false }
}