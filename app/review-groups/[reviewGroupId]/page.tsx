'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useRequireAuth } from '@/lib/use-require-auth'
import { 
  ArrowLeft, 
  Plus, 
  UserPlus, 
  Settings, 
  Star, 
  Users,
  MessageSquare,
  MoreVertical,
  Loader2
} from 'lucide-react'
import AppHeader from '@/components/layout/app-header'

interface GroupMember {
  id: string
  username: string
  display_id: string
  avatar_url?: string
  role: string
  joined_at: string
}

interface ReviewSubject {
  id: string
  name: string
  images?: string[]
  metadata?: any
  review_count: number
  average_score: number
  latest_review?: {
    comment: string
    total_score: number
    user: {
      username: string
    }
    created_at: string
  }
}

interface ReviewGroupDetail {
  id: string
  name: string
  description?: string
  image_url?: string
  is_private: boolean
  created_at: string
  category: {
    id: number
    name: string
    icon: string
  }
  member_count: number
  user_role: string
  evaluation_criteria: Array<{
    id: string
    name: string
    order_index: number
  }>
}

export default function ReviewGroupDetailPage() {
  const { user, loading, isAuthenticated } = useRequireAuth()
  const router = useRouter()
  const params = useParams()
  const groupId = params.reviewGroupId as string

  const [group, setGroup] = useState<ReviewGroupDetail | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [reviewSubjects, setReviewSubjects] = useState<ReviewSubject[]>([])
  const [groupLoading, setGroupLoading] = useState(true)
  const [membersLoading, setMembersLoading] = useState(true)
  const [subjectsLoading, setSubjectsLoading] = useState(true)
  const [error, setError] = useState('')

  // グループ詳細を取得
  useEffect(() => {
    if (!isAuthenticated || !user || !groupId) return

    const fetchGroupDetail = async () => {
      try {
        const response = await fetch(`/api/review-groups/${groupId}?userId=${user.id}`)
        const data = await response.json()
        
        if (response.ok) {
          setGroup(data.group)
        } else {
          setError(data.error || 'グループの取得に失敗しました')
        }
      } catch (error) {
        console.error('Group fetch error:', error)
        setError('ネットワークエラーが発生しました')
      } finally {
        setGroupLoading(false)
      }
    }

    fetchGroupDetail()
  }, [isAuthenticated, user, groupId])

  // メンバー一覧を取得
  useEffect(() => {
    if (!isAuthenticated || !user || !groupId) return

    const fetchMembers = async () => {
      try {
        const response = await fetch(`/api/review-groups/${groupId}/members`)
        const data = await response.json()
        
        if (response.ok) {
          setMembers(data.members || [])
        } else {
          console.error('Members fetch error:', data.error)
        }
      } catch (error) {
        console.error('Members fetch error:', error)
      } finally {
        setMembersLoading(false)
      }
    }

    fetchMembers()
  }, [isAuthenticated, user, groupId])

  // レビュー対象一覧を取得
  useEffect(() => {
    if (!isAuthenticated || !user || !groupId) return

    const fetchReviewSubjects = async () => {
      try {
        const response = await fetch(`/api/review-groups/${groupId}/subjects`)
        const data = await response.json()
        
        if (response.ok) {
          setReviewSubjects(data.subjects || [])
        } else {
          console.error('Subjects fetch error:', data.error)
        }
      } catch (error) {
        console.error('Subjects fetch error:', error)
      } finally {
        setSubjectsLoading(false)
      }
    }

    fetchReviewSubjects()
  }, [isAuthenticated, user, groupId])

  // ローディング中
  if (loading || groupLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  // 認証されていない場合
  if (!isAuthenticated) {
    return null
  }

  // エラーまたはグループが見つからない場合
  if (error || !group) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader showBackButton={true} />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              グループが見つかりません
            </h3>
            <p className="text-gray-600 mb-6">
              {error || 'このグループは存在しないか、アクセス権限がありません。'}
            </p>
            <button
              onClick={() => router.push('/home')}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              ホームに戻る
            </button>
          </div>
        </main>
      </div>
    )
  }

  const canManage = group.user_role === 'owner' || group.user_role === 'admin'
  const isOwner = group.user_role === 'owner'

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader showBackButton={true} />

      {/* グループヘッダー */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* グループ画像 */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden flex-shrink-0">
              {group.image_url ? (
                <img
                  src={group.image_url}
                  alt={group.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                  <span className="text-3xl">{group.category.icon}</span>
                </div>
              )}
            </div>

            {/* グループ情報 */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                      {group.name}
                    </h1>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {group.category.name}
                    </span>
                    {isOwner && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                        オーナー
                      </span>
                    )}
                  </div>
                  {group.description && (
                    <p className="text-gray-600 mb-3 text-sm sm:text-base">
                      {group.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{group.member_count}名</span>
                    </div>
                    <span>•</span>
                    <span>{group.is_private ? 'プライベート' : 'パブリック'}</span>
                    <span>•</span>
                    <span>作成: {new Date(group.created_at).toLocaleDateString('ja-JP')}</span>
                  </div>
                </div>

                {/* アクションボタン */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => router.push(`/review-groups/${groupId}/subjects/create`)}
                    className="flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">レビュー対象を追加</span>
                    <span className="sm:hidden">追加</span>
                  </button>
                  {canManage && (
                    <button
                      onClick={() => router.push(`/review-groups/${groupId}/invite`)}
                      className="flex items-center px-3 py-2 sm:px-4 sm:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      <UserPlus className="w-4 h-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">メンバー招待</span>
                      <span className="sm:hidden">招待</span>
                    </button>
                  )}
                  {isOwner && (
                    <button
                      onClick={() => router.push(`/review-groups/${groupId}/settings`)}
                      className="flex items-center px-3 py-2 sm:px-4 sm:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      <Settings className="w-4 h-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">設定</span>
                      <span className="sm:hidden">設定</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* レビュー対象一覧 */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">レビュー対象</h2>
              <span className="text-sm text-gray-500">
                {reviewSubjects.length}件
              </span>
            </div>

            {subjectsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
              </div>
            ) : reviewSubjects.length > 0 ? (
              <div className="space-y-4">
                {reviewSubjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push(`/review-groups/${groupId}/subjects/${subject.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {subject.name}
                        </h3>
                        
                        {/* 評価情報 */}
                        <div className="flex items-center gap-4 mb-3">
                          {subject.review_count > 0 ? (
                            <>
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                <span className="font-medium text-gray-900">
                                  {subject.average_score.toFixed(1)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-gray-500">
                                <MessageSquare className="w-4 h-4" />
                                <span className="text-sm">{subject.review_count}件のレビュー</span>
                              </div>
                            </>
                          ) : (
                            <span className="text-sm text-gray-500">まだレビューがありません</span>
                          )}
                        </div>

                        {/* 最新レビュー */}
                        {subject.latest_review && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-900">
                                {subject.latest_review.user.username}
                              </span>
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-yellow-400 fill-current" />
                                <span className="text-sm text-gray-600">
                                  {subject.latest_review.total_score}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {subject.latest_review.comment}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* 対象画像 */}
                      {subject.images && subject.images.length > 0 && (
                        <div className="w-16 h-16 rounded-lg overflow-hidden ml-4 flex-shrink-0">
                          <img
                            src={subject.images[0]}
                            alt={subject.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg border">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  まだレビュー対象がありません
                </h3>
                <p className="text-gray-600 mb-6">
                  最初のレビュー対象を追加して、グループメンバーとレビューを始めましょう！
                </p>
                <button
                  onClick={() => router.push(`/review-groups/${groupId}/subjects/create`)}
                  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  レビュー対象を追加
                </button>
              </div>
            )}
          </div>

          {/* サイドバー */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* メンバー一覧 */}
              <div className="bg-white rounded-lg border p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                  メンバー ({group.member_count}名)
                </h3>
                
                {membersLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {members.slice(0, 5).map((member) => (
                      <div key={member.id} className="flex items-center gap-3">
                        <img
                          src={member.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.username)}&background=8B5CF6&color=fff&size=32&font-size=0.6`}
                          alt={member.username}
                          className="w-8 h-8 rounded-full flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {member.username}
                          </p>
                          {member.role === 'owner' && (
                            <p className="text-xs text-purple-600">オーナー</p>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {members.length > 5 && (
                      <button
                        onClick={() => router.push(`/review-groups/${groupId}/members`)}
                        className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                      >
                        すべてのメンバーを見る
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 評価基準 */}
              {group.evaluation_criteria && group.evaluation_criteria.length > 0 && (
                <div className="bg-white rounded-lg border p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                    評価基準
                  </h3>
                  <div className="space-y-2">
                    {group.evaluation_criteria.map((criteria) => (
                      <div key={criteria.id} className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{criteria.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}