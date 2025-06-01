'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

export default function AuthCallback() {
  const router = useRouter()
  const supabase = createSupabaseClient()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // URLのハッシュから認証情報を取得
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('認証エラー:', error)
          router.push('/login?error=auth_failed')
          return
        }

        if (data.session) {
          // ログイン成功時の処理
          console.log('ログイン成功:', data.session.user.email)
          
          // ユーザー登録状況をチェック
          const checkResponse = await fetch(`/api/auth/register?userId=${data.session.user.id}`)
          const checkData = await checkResponse.json()

          if (!checkResponse.ok) {
            console.error('ユーザーチェックエラー:', checkData.error)
            router.push('/login?error=user_check_failed')
            return
          }

          // username設定が必要かチェック
          if (checkData.needsUsername) {
            router.push('/setup-username')
          } else {
            // 設定済みならホームへ
            router.push('/home')
          }
        } else {
          // セッションがない場合はログインページに
          router.push('/login')
        }
      } catch (error) {
        console.error('予期しないエラー:', error)
        router.push('/login?error=unexpected')
      }
    }

    handleAuthCallback()
  }, [router, supabase.auth])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
        <p className="mt-4 text-gray-600">認証処理中...</p>
      </div>
    </div>
  )
}