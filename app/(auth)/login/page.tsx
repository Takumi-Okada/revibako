'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { Package, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

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

        {/* エラーメッセージ */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">
              {error === 'auth_failed' && 'ログインに失敗しました。もう一度お試しください。'}
              {error === 'unexpected' && '予期しないエラーが発生しました。'}
            </p>
          </div>
        )}

        {/* ログインカード */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                ログイン
              </h2>
              <p className="text-gray-600">
                友達と一緒にレビューを始めよう
              </p>
            </div>

            {/* Googleログインボタン */}
            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Googleでログイン
            </button>

            {/* 説明文 */}
            <div className="text-center text-sm text-gray-500">
              <p>
                ログインすることで、
                <br />
                利用規約とプライバシーポリシーに同意したものとみなします
              </p>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>© 2025 レビバコ. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}