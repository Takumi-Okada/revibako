'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useRequireAuth } from '@/lib/use-require-auth'
import { 
  Star, 
  MessageSquare, 
  Edit,
  MoreVertical,
  Loader2,
  Plus,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import AppHeader from '@/components/layout/app-header'

interface EvaluationScore {
  criteria_id: string
  criteria_name: string
  score: number
}

interface Review {
  id: string
  comment: string
  total_score: number
  evaluation_scores: EvaluationScore[]
  images?: string[]
  created_at: string
  updated_at: string
  user: {
    id: string
    username: string
    display_id: string
    avatar_url?: string
  }
}

interface ReviewSubjectDetail {
  id: string
  name: string
  images?: string[]
  metadata?: { [key: string]: string }
  created_by: string
  created_at: string
  review_count: number
  average_score: number
  score_breakdown: Array<{
    criteria_id: string
    criteria_name: string
    average_score: number
  }>
}

interface GroupInfo {
  id: string
  name: string
  user_role: string
  evaluation_criteria: Array<{
    id: string
    name: string
    order_index: number
  }>
}

export default function ReviewSubjectDetailPage() {
  const { user, loading, isAuthenticated } = useRequireAuth()
  const router = useRouter()
  const params = useParams()
  const groupId = params.reviewGroupId as string
  const subjectId = params.subjectId as string

  const [subject, setSubject] = useState<ReviewSubjectDetail | null>(null)
  const [group, setGroup] = useState<GroupInfo | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [userReview, setUserReview] = useState<Review | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [showImageModal, setShowImageModal] = useState(false)
  
  const [subjectLoading, setSubjectLoading] = useState(true)
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [error, setError] = useState('')

  // レビュー対象詳細を取得
  useEffect(() => {
    if (!isAuthenticated || !user || !groupId || !subjectId) return

    const fetchSubjectDetail = async () => {
      try {
        const response = await fetch(`/api/review-groups/${groupId}/subjects/${subjectId}?userId=${user.id}`)
        const data = await response.json()
        
        if (response.ok) {
          setSubject(data.subject)
          setGroup(data.group)
        } else {
          setError(data.error || 'レビュー対象の取得に失敗しました')
        }
      } catch (error) {
        console.error('Subject fetch error:', error)
        setError('ネットワークエラーが発生しました')
      } finally {
        setSubjectLoading(false)
      }
    }

    fetchSubjectDetail()
  }, [isAuthenticated, user, groupId, subjectId])

  // レビュー一覧を取得
  useEffect(() => {
    if (!isAuthenticated || !user || !groupId || !subjectId) return

    const fetchReviews = async () => {
      try {
        const response = await fetch(`/api/review-groups/${groupId}/subjects/${subjectId}/reviews`)
        const data = await response.json()
        
        if (response.ok) {
          const allReviews = data.reviews || []
          const currentUserReview = allReviews.find((review: Review) => review.user.id === user.id)
          const otherReviews = allReviews.filter((review: Review) => review.user.id !== user.id)
          
          setUserReview(currentUserReview || null)
          setReviews(otherReviews)
        } else {
          console.error('Reviews fetch error:', data.error)
        }
      } catch (error) {
        console.error('Reviews fetch error:', error)
      } finally {
        setReviewsLoading(false)
      }
    }

    fetchReviews()
  }, [isAuthenticated, user, groupId, subjectId])

  const handleImageNavigation = (direction: 'prev' | 'next') => {
    if (!subject?.images) return
    
    if (direction === 'prev') {
      setSelectedImageIndex(prev => 
        prev === 0 ? subject.images!.length - 1 : prev - 1
      )
    } else {
      setSelectedImageIndex(prev => 
        prev === subject.images!.length - 1 ? 0 : prev + 1
      )
    }
  }

  const renderStars = (score: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-3 h-3',
      md: 'w-4 h-4',
      lg: 'w-5 h-5'
    }
    
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= score ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
        <span className={`ml-1 font-medium ${size === 'lg' ? 'text-lg' : 'text-sm'}`}>
          {score.toFixed(1)}
        </span>
      </div>
    )
  }

  // ローディング中
  if (loading || subjectLoading) {
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

  // エラーまたは対象が見つからない場合
  if (error || !subject || !group) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader showBackButton={true} />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              レビュー対象が見つかりません
            </h3>
            <p className="text-gray-600 mb-6">
              {error || 'このレビュー対象は存在しないか、アクセス権限がありません。'}
            </p>
            <button
              onClick={() => router.push(`/review-groups/${groupId}`)}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              グループに戻る
            </button>
          </div>
        </main>
      </div>
    )
  }

  const canEdit = group.user_role === 'owner' || group.user_role === 'admin' || subject.created_by === user?.id

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader 
        title={subject.name}
        showBackButton={true}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* メインコンテンツ */}
          <div className="lg:col-span-2 space-y-6">
            {/* レビュー対象情報 */}
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {subject.name}
                  </h1>
                  
                  {/* 評価サマリー */}
                  <div className="flex items-center gap-4 mb-4">
                    {subject.review_count > 0 ? (
                      <>
                        {renderStars(subject.average_score, 'lg')}
                        <div className="flex items-center gap-1 text-gray-500">
                          <MessageSquare className="w-4 h-4" />
                          <span className="text-sm">{subject.review_count}件のレビュー</span>
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-500">まだレビューがありません</span>
                    )}
                  </div>
                </div>

                {canEdit && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/review-groups/${groupId}/subjects/${subjectId}/edit`)}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* 画像ギャラリー */}
              {subject.images && subject.images.length > 0 && (
                <div className="mb-6">
                  <div className="relative">
                    <img
                      src={subject.images[selectedImageIndex]}
                      alt={subject.name}
                      className="w-full h-64 sm:h-80 object-cover rounded-lg cursor-pointer"
                      onClick={() => setShowImageModal(true)}
                    />
                    
                    {subject.images.length > 1 && (
                      <>
                        <button
                          onClick={() => handleImageNavigation('prev')}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleImageNavigation('next')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                          {subject.images.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setSelectedImageIndex(index)}
                              className={`w-2 h-2 rounded-full transition-colors ${
                                index === selectedImageIndex ? 'bg-white' : 'bg-white/50'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  
                  {subject.images.length > 1 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto">
                      {subject.images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`${subject.name} ${index + 1}`}
                          className={`w-16 h-16 object-cover rounded-lg cursor-pointer flex-shrink-0 border-2 transition-colors ${
                            index === selectedImageIndex ? 'border-purple-500' : 'border-transparent'
                          }`}
                          onClick={() => setSelectedImageIndex(index)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* メタデータ */}
              {subject.metadata && Object.keys(subject.metadata).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">詳細情報</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(subject.metadata).map(([key, value]) => (
                      <div key={key} className="bg-gray-50 rounded-lg p-3">
                        <dt className="text-sm font-medium text-gray-600 mb-1">
                          {key}
                        </dt>
                        <dd className="text-sm text-gray-900">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 自分のレビュー */}
            {userReview ? (
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">あなたのレビュー</h3>
                  <button
                    onClick={() => router.push(`/review-groups/${groupId}/subjects/${subjectId}/review/edit`)}
                    className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                  >
                    編集
                  </button>
                </div>
                
                <div className="space-y-4">
                  {/* 総合評価 */}
                  <div className="flex items-center gap-3">
                    {renderStars(userReview.total_score, 'md')}
                    <span className="text-sm text-gray-500">
                      {new Date(userReview.updated_at).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                  
                  {/* 項目別評価 */}
                  {userReview.evaluation_scores && userReview.evaluation_scores.length > 0 && (
                    <div className="space-y-2">
                      {userReview.evaluation_scores.map((score) => (
                        <div key={score.criteria_id} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{score.criteria_name}</span>
                          {renderStars(score.score, 'sm')}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* コメント */}
                  {userReview.comment && (
                    <p className="text-gray-700 leading-relaxed">
                      {userReview.comment}
                    </p>
                  )}
                  
                  {/* レビュー画像 */}
                  {userReview.images && userReview.images.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto">
                      {userReview.images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`レビュー画像 ${index + 1}`}
                          className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border p-6 text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  レビューを書きませんか？
                </h3>
                <p className="text-gray-600 mb-6">
                  あなたの体験をシェアして、他のメンバーの参考になる情報を提供しましょう。
                </p>
                <button
                  onClick={() => router.push(`/review-groups/${groupId}/subjects/${subjectId}/reviews/create`)}
                  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  レビューを書く
                </button>
              </div>
            )}

            {/* 他のメンバーのレビュー */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                メンバーのレビュー ({reviews.length}件)
              </h3>
              
              {reviewsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                </div>
              ) : reviews.length > 0 ? (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-200 last:border-b-0 pb-6 last:pb-0">
                      <div className="flex items-start gap-4">
                        <img
                          src={review.user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.user.username)}&background=8B5CF6&color=fff&size=40&font-size=0.6`}
                          alt={review.user.username}
                          className="w-10 h-10 rounded-full flex-shrink-0"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-medium text-gray-900">
                              {review.user.username}
                            </span>
                            {renderStars(review.total_score, 'sm')}
                            <span className="text-xs text-gray-500">
                              {new Date(review.created_at).toLocaleDateString('ja-JP')}
                            </span>
                          </div>
                          
                          {/* 項目別評価 */}
                          {review.evaluation_scores && review.evaluation_scores.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                              {review.evaluation_scores.map((score) => (
                                <div key={score.criteria_id} className="flex items-center justify-between">
                                  <span className="text-gray-600">{score.criteria_name}</span>
                                  <div className="flex items-center gap-1">
                                    <Star className="w-3 h-3 text-yellow-400 fill-current" />
                                    <span>{score.score}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* コメント */}
                          {review.comment && (
                            <p className="text-gray-700 leading-relaxed mb-3">
                              {review.comment}
                            </p>
                          )}
                          
                          {/* レビュー画像 */}
                          {review.images && review.images.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto">
                              {review.images.map((image, index) => (
                                <img
                                  key={index}
                                  src={image}
                                  alt={`レビュー画像 ${index + 1}`}
                                  className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">まだ他のメンバーのレビューがありません</p>
                </div>
              )}
            </div>
          </div>

          {/* サイドバー */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* 評価基準別平均スコア */}
              {subject.score_breakdown && subject.score_breakdown.length > 0 && (
                <div className="bg-white rounded-lg border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    評価詳細
                  </h3>
                  <div className="space-y-3">
                    {subject.score_breakdown.map((breakdown) => (
                      <div key={breakdown.criteria_id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            {breakdown.criteria_name}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {breakdown.average_score.toFixed(1)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${(breakdown.average_score / 5) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* グループ情報 */}
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  グループ情報
                </h3>
                <button
                  onClick={() => router.push(`/review-groups/${groupId}`)}
                  className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">{group.name}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    グループページを見る →
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 画像モーダル */}
      {showImageModal && subject.images && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={subject.images[selectedImageIndex]}
              alt={subject.name}
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}