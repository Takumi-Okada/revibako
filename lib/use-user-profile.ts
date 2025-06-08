'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './auth-context'

interface UserProfile {
  id: string
  username: string
  display_id: string
  avatar_url?: string
}

export function useUserProfile() {
  const { user: authUser, loading: authLoading } = useAuth()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authUser || authLoading) {
      setLoading(authLoading)
      return
    }

    const fetchUserProfile = async () => {
      try {
        const response = await fetch(`/api/user/profile?userId=${authUser.id}`)
        const data = await response.json()
        
        if (response.ok) {
          setUserProfile(data.profile)
        } else {
          setError(data.error || 'ユーザー情報の取得に失敗しました')
        }
      } catch (error) {
        console.error('User profile fetch error:', error)
        setError('ネットワークエラーが発生しました')
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [authUser, authLoading])

  return {
    userProfile,
    loading,
    error,
    authUser
  }
}