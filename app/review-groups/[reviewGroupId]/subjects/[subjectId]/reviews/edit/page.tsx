'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useRequireAuth } from '@/lib/use-require-auth'
import { 
  Save, 
  Trash2, 
  Star, 
  X, 
  Loader2, 
  Camera,
  AlertTriangle
} from 'lucide-react'
import AppHeader from '@/components/layout/app-header'

interface EvaluationCriteria {
  id: string
  name: string
  order_index: number
}

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

interface SubjectInfo {
  id: string
  name: string
  images?: string[]
}

interface GroupInfo {
  id: string
  name: string
  user_role: string
  evaluation_criteria: EvaluationCriteria[]
}

export default function EditReviewPage() {
  const { user, loading, isAuthenticated } = useRequireAuth()
  const router = useRouter()
  const params = useParams()
  const reviewGroupId = params.reviewGroupId as string
  const subjectId = params.subjectId as string

  const [review, setReview] = useState<Review | null>(null)
  const [subject, setSubject] = useState<SubjectInfo | null>(null)
  const [group, setGroup] = useState<GroupInfo | null>(null)
  const [comment, setComment] = useState('')
  const [scores, setScores] = useState<{ [criteriaId: string]: number }>({})
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [existingImages, setExistingImages] = useState<string[]>([])
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  const [dataLoading, setDataLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // データを取得
  useEffect(() => {
    if (!isAuthenticated || !user || !reviewGroupId || !subjectId) return

    const fetchData = async () => {
      try {
        const response = await fetch(`/api/review-groups/${reviewGroupId}/subjects/${subjectId}/reviews/edit?userId=${user.id}`)
        const data = await response.json()
        
        if (response.ok) {
          setReview(data.review)
          setSubject(data.subject)
          setGroup(data.group)
          setComment(data.review.comment || '')
          setExistingImages(data.review.images || [])
          
          // 評価スコアを設定
          const initialScores: { [key: string]: number } = {}
          data.review.evaluation_scores.forEach((score: EvaluationScore) => {
            initialScores[score.criteria_id] = score.score
          })
          setScores(initialScores)
        } else {
          setError(data.error || 'データの取得に失敗しました')
        }
      } catch (error) {
        console.error('Data fetch error:', error)
        setError('ネットワークエラーが発生しました')
      } finally {
        setDataLoading(false)
      }
    }

    fetchData()
  }, [isAuthenticated, user, reviewGroupId, subjectId])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    const totalImages = existingImages.length + images.length + files.length
    if (totalImages > 5) {
      setError('画像は最大5枚まで選択できます')
      return
    }

    setImages(prev => [...prev, ...files])
    
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreviews(prev => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeNewImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleScoreChange = (criteriaId: string, score: number) => {
    setScores(prev => ({
      ...prev,
      [criteriaId]: score
    }))
  }

  const renderStarRating = (criteriaId: string, currentScore: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleScoreChange(criteriaId, star)}
            className="p-1 hover:scale-110 transition-transform"
          >
            <Star
              className={`w-6 h-6 ${
                star <= currentScore 
                  ? 'text-yellow-400 fill-current' 
                  : 'text-gray-300 hover:text-yellow-200'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm font-medium text-gray-700">
          {currentScore}/5
        </span>
      </div>
    )
  }

  const calculateTotalScore = () => {
    const scoreValues = Object.values(scores)
    if (scoreValues.length === 0) return 0
    return scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length
  }

  const isValidForm = () => {
    if (!group) return false
    
    // すべての評価基準にスコアが設定されているかチェック
    return group.evaluation_criteria.every(criteria => 
      scores[criteria.id] && scores[criteria.id] > 0
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !isValidForm()) return

    setSaving(true)
    setError('')
    setSuccessMessage('')

    try {
      const uploadedImageUrls: string[] = []

      // 新しい画像をアップロード
      if (images.length > 0) {
        for (const image of images) {
          const imageFormData = new FormData()
          imageFormData.append('file', image)
          imageFormData.append('userId', user.id)

          const imageResponse = await fetch('/api/upload/image', {
            method: 'POST',
            body: imageFormData,
          })

          const imageData = await imageResponse.json()

          if (!imageResponse.ok) {
            setError(imageData.error || '画像のアップロードに失敗しました')
            return
          }

          uploadedImageUrls.push(imageData.imageUrl)
        }
      }

      // すべての画像URL（既存 + 新規）
      const allImageUrls = [...existingImages, ...uploadedImageUrls]

      // レビューを更新
      const response = await fetch(`/api/review-groups/${reviewGroupId}/subjects/${subjectId}/reviews/edit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment: comment.trim() || null,
          scores,
          images: allImageUrls.length > 0 ? allImageUrls : null,
          userId: user.id
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'レビューの更新に失敗しました')
        return
      }

      setSuccessMessage('レビューを更新しました')

      // 成功時はレビュー対象詳細ページにリダイレクト
      setTimeout(() => {
        router.push(`/review-groups/${reviewGroupId}/subjects/${subjectId}`)
      }, 2000)

    } catch (error) {
      console.error('Review update error:', error)
      setError('ネットワークエラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!user) return

    setDeleting(true)
    setError('')

    try {
      const response = await fetch(`/api/review-groups/${reviewGroupId}/subjects/${subjectId}/reviews/edit?userId=${user.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'レビューの削除に失敗しました')
        return
      }

      // レビュー対象詳細ページにリダイレクト
      router.push(`/review-groups/${reviewGroupId}/subjects/${subjectId}`)

    } catch (error) {
      console.error('Review deletion error:', error)
      setError('ネットワークエラーが発生しました')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // ローディング中
  if (loading || dataLoading) {
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

  // エラーまたはデータが見つからない場合
  if (error && (!review || !subject || !group)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader showBackButton={true} />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              エラーが発生しました
            </h3>
            <p className="text-gray-600 mb-6">
              {error || 'データの取得に失敗しました'}
            </p>
            <button
              onClick={() => router.back()}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              戻る
            </button>
          </div>
        </main>
      </div>
    )
  }

  // 編集権限チェック（自分のレビューが存在するかのみチェック）
  if (!review) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader showBackButton={true} />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              レビューが見つかりません
            </h3>
            <p className="text-gray-600 mb-6">
              まだこのレビュー対象にレビューを投稿していません。
            </p>
            <button
              onClick={() => router.push(`/review-groups/${reviewGroupId}/subjects/${subjectId}/reviews/create`)}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              レビューを投稿する
            </button>
          </div>
        </main>
      </div>
    )
  }

  const totalScore = calculateTotalScore()

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader 
        title="レビューを編集"
        showBackButton={true}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* 成功・エラーメッセージ */}
          {successMessage && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-600 text-sm">{successMessage}</p>
            </div>
          )}
          
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* レビュー対象情報 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              {subject?.images && subject.images.length > 0 && (
                <img
                  src={subject.images[0]}
                  alt={subject.name}
                  className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                />
              )}
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{subject?.name}</h2>
                <p className="text-sm text-gray-600">グループ: {group?.name}</p>
                <p className="text-xs text-gray-500">
                  作成日: {review ? new Date(review.created_at).toLocaleDateString('ja-JP') : ''}
                  {review && review.updated_at !== review.created_at && (
                    <span> • 最終更新: {new Date(review.updated_at).toLocaleDateString('ja-JP')}</span>
                  )}
                </p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              {/* 評価 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">評価</h3>
                <div className="space-y-6">
                  {group?.evaluation_criteria.map((criteria) => (
                    <div key={criteria.id} className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">
                        {criteria.name}
                      </label>
                      {renderStarRating(criteria.id, scores[criteria.id] || 0)}
                    </div>
                  ))}
                  
                  {/* 総合評価表示 */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-semibold text-gray-900">
                        総合評価
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-5 h-5 ${
                                star <= totalScore 
                                  ? 'text-yellow-400 fill-current' 
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-lg font-bold text-gray-900">
                          {totalScore.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* コメント */}
              <div>
                <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                  コメント（任意）
                </label>
                <textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="このレビュー対象についての感想や詳細な評価を書いてください"
                  rows={4}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  disabled={saving}
                  maxLength={1000}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {comment.length}/1000文字
                </p>
              </div>

              {/* 画像 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  画像（任意）
                </label>
                <div className="space-y-4">
                  {/* 既存画像と新規画像の表示 */}
                  {(existingImages.length > 0 || imagePreviews.length > 0) && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {/* 既存画像 */}
                      {existingImages.map((image, index) => (
                        <div key={`existing-${index}`} className="relative">
                          <img
                            src={image}
                            alt={`レビュー画像 ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeExistingImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                            disabled={saving}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      
                      {/* 新規画像 */}
                      {imagePreviews.map((preview, index) => (
                        <div key={`new-${index}`} className="relative">
                          <img
                            src={preview}
                            alt={`新しいレビュー画像 ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border-2 border-blue-300"
                          />
                          <button
                            type="button"
                            onClick={() => removeNewImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                            disabled={saving}
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <div className="absolute bottom-1 left-1 bg-blue-600 text-white text-xs px-1 rounded">
                            新規
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* 画像追加 */}
                  {(existingImages.length + images.length) < 5 && (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <div className="space-y-2">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto">
                          <Camera className="w-6 h-6 text-gray-400" />
                        </div>
                        <div>
                          <label
                            htmlFor="image-upload"
                            className="cursor-pointer text-purple-600 hover:text-purple-700 font-medium"
                          >
                            画像を追加
                          </label>
                          <input
                            id="image-upload"
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageChange}
                            className="hidden"
                            disabled={saving}
                          />
                        </div>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, JPEG (最大5枚、各5MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 保存・削除ボタン */}
              <div className="flex justify-between pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                  disabled={saving || deleting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  レビューを削除
                </button>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    disabled={saving}
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !isValidForm()}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        更新中...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        変更を保存
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* 削除確認モーダル */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">
                レビューを削除
              </h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                この操作は取り消すことができません。あなたのレビューが永久に削除されます。
              </p>
              <p className="text-gray-600 text-sm">
                削除すると、評価スコアやコメント、画像などすべての情報が失われます。
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={deleting}
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    削除中...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    削除する
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}