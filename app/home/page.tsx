'use client'

import { useRequireAuth } from '@/lib/use-require-auth'
import { Users, Star, Edit, Plus, Link, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import AppHeader from '@/components/layout/app-header'

interface ReviewGroup {
  id: string
  name: string
  description: string
  is_private: boolean
  created_at: string
  role: string
  image_url?: string
  category: {
    id: number
    name: string
    icon: string
  }
}

export default function HomePage() {
  const { user, loading, isAuthenticated } = useRequireAuth()
  const router = useRouter()
  const [reviewGroups, setReviewGroups] = useState<ReviewGroup[]>([])
  const [groupsLoading, setGroupsLoading] = useState(true)
  const [error, setError] = useState('')

  // レビューグループを取得
  useEffect(() => {
    if (!isAuthenticated || !user) return
    
    const fetchReviewGroups = async () => {
      try {
        const response = await fetch(`/api/review-groups?userId=${user.id}`)
        const data = await response.json()
        
        if (response.ok) {
          setReviewGroups(data.reviewGroups || [])
        } else {
          setError('レビューグループの取得に失敗しました')
        }
      } catch (error) {
        console.error('Groups fetch error:', error)
        setError('ネットワークエラーが発生しました')
      } finally {
        setGroupsLoading(false)
      }
    }

    fetchReviewGroups()
  }, [isAuthenticated, user])

  // ローディング中の表示
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  // 認証されていない場合は何も表示しない（リダイレクト処理中）
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            レビューグループ
          </h1>
          <p className="text-gray-600">
            参加中のグループ一覧
          </p>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* レビューグループ一覧 */}
        {groupsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : reviewGroups.length > 0 ? (
          <div className="space-y-4 mb-8">
            {reviewGroups.map((group) => (
              <div
                key={group.id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/review-groups/${group.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    {/* グループ画像 */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      {group.image_url ? (
                        <img
                          src={group.image_url}
                          alt={group.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                          <span className="text-2xl">{group.category.icon}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {group.name}
                        </h3>
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          {group.category.name}
                        </span>
                        {group.role === 'owner' && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                            オーナー
                          </span>
                        )}
                      </div>
                      {group.description && (
                        <p className="text-gray-600 text-sm mb-2">
                          {group.description}
                        </p>
                      )}
                      <p className="text-gray-400 text-xs">
                        作成日: {new Date(group.created_at).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center text-gray-400">
                    {group.is_private ? (
                      <span className="text-xs">プライベート</span>
                    ) : (
                      <span className="text-xs">パブリック</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // グループがない場合の表示
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              まだレビューグループがありません
            </h3>
            <p className="text-gray-600 mb-6">
              最初のレビューグループを作成して、友達とレビューを始めましょう！
            </p>
          </div>
        )}

        {/* グループ作成ボタン */}
        <div className="bg-white rounded-lg shadow p-6">
          <button 
            onClick={() => router.push('/review-groups/create')}
            className="w-full flex items-center justify-center p-4 border-2 border-dashed border-purple-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors group"
          >
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4 group-hover:bg-purple-200 transition-colors">
                <Plus className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">新しいレビューグループを作成</p>
                <p className="text-sm text-gray-500">友達とレビューを始めよう</p>
              </div>
            </div>
          </button>
        </div>
      </main>
    </div>
  )
}