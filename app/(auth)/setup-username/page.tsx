'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Package, Loader2, User } from 'lucide-react'

export default function UsernameSetupPage() {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      router.push('/login')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          username: username.trim()
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'エラーが発生しました')
        return
      }

      // 成功時はホームにリダイレクト
      router.push('/home')

    } catch (error) {
      console.error('Registration error:', error)
      setError('ネットワークエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const isValidUsername = (username: string) => {
    const trimmed = username.trim()
    return trimmed.length >= 1 && trimmed.length <= 10
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* ロゴエリア */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-2xl mb-4">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">レビバコ</h1>
          <p className="text-gray-600">ユーザー名を設定してください</p>
        </div>

        {/* セットアップカード */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-6 h-6 text-purple-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                ユーザー名を設定
              </h2>
              <p className="text-gray-600">
                友達が見つけやすいユーザー名を設定しましょう
              </p>
            </div>

            {/* エラーメッセージ */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* フォーム */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  ユーザー名
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="例: レビュー太郎"
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={loading}
                  required
                />
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-gray-500">
                    • 1-10文字で入力してください
                  </p>
                  <p className="text-xs text-gray-500">
                    • 日本語、英数字、記号が使用可能
                  </p>
                  {username && !isValidUsername(username) && (
                    <p className="text-xs text-red-500">
                      ユーザー名は1-10文字で入力してください
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !username || !isValidUsername(username)}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    設定中...
                  </>
                ) : (
                  '設定を完了'
                )}
              </button>
            </form>

            {/* 注意事項 */}
            <div className="text-center text-xs text-gray-500">
              <p>※ ユーザー名は後で変更することができます</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}