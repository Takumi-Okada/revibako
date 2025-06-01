'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import LoginForm from '@/components/auth/login-form'

export default function LoginPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // 既にログインしている場合はホームにリダイレクト
  useEffect(() => {
    if (user && !loading) {
      router.push('/home')
    }
  }, [user, loading, router])

  // ローディング中の表示
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  // 既にログインしている場合は何も表示しない
  if (user) {
    return null
  }

  return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* ロゴエリア */}
          <div className="text-center mb-8">
            <div className="mb-4">
              <img 
                src="/logo.png" 
                alt="レビバコ" 
                className="h-60 mx-auto"
              />
            </div>
          </div>
          {/* ログインフォーム */}
          {/* useSearchParams() を使用する際にSuspenseでラップする必要がある（Vercelデプロイ時にエラー） */}
          <Suspense>
            <LoginForm />
          </Suspense>
          {/* フッター */}
          <div className="text-center mt-8 text-sm text-gray-500">
            <p>© 2025 レビバコ. All rights reserved.</p>
          </div>
        </div>
      </div>
  )
}