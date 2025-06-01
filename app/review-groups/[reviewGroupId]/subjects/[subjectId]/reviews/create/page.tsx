'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useRequireAuth } from '@/lib/use-require-auth'
import { Star, X, Loader2, Camera } from 'lucide-react'
import AppHeader from '@/components/layout/app-header'

interface EvaluationCriteria {
  id: string
  name: string
  order_index: number
}

interface SubjectInfo {
  id: string
  name: string
  images?: string[]
}

interface GroupInfo {
  id: string
  name: string
  evaluation_criteria: EvaluationCriteria[]
}

export default function CreateReviewPage() {
  const { user, loading, isAuthenticated } = useRequireAuth()
  const router = useRouter()
  const params = useParams()
  const reviewGroupId = params.reviewGroupId as string
  const subjectId = params.subjectId as string

  const [subject, setSubject] = useState<SubjectInfo | null>(null)
  const [group, setGroup] = useState<GroupInfo | null>(null)
  const [comment, setComment] = useState('')
  const [scores, setScores] = useState<{ [criteriaId: string]: number }>({})
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  
  const [dataLoading, setDataLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // データを取得
  useEffect(() => {
    if (!isAuthenticated || !user || !reviewGroupId || !subjectId) return

    const fetchData = async () => {
      try {
        const response = await fetch(`/api/review-groups/${reviewGroupId}/subjects/${subjectId}?userId=${user.id}`)
        const data = await response.json()
        
        if (response.ok) {
          setSubject(data.subject)
          setGroup(data.group)
          
          // 評価基準の初期スコアを設定
          const initialScores: { [key: string]: number } = {}
          data.group.evaluation_criteria.forEach((criteria: EvaluationCriteria) => {
            initialScores[criteria.id] = 3 // デフォルトは3点
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
    
    if (images.length + files.length > 5) {
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

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !isValidForm()) return

    setSubmitting(true)
    setError('')

    try {
      const uploadedImageUrls: string[] = []

      // 画像をアップロード
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

      // レビューを作成
      const response = await fetch(`/api/review-groups/${reviewGroupId}/subjects/${subjectId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment: comment.trim() || null,
          scores,
          images: uploadedImageUrls,
          userId: user.id
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'レビューの投稿に失敗しました')
        return
      }

      // 成功時はレビュー対象詳細ページにリダイレクト
      router.push(`/review-groups/${reviewGroupId}/subjects/${subjectId}`)

    } catch (error) {
      console.error('Review creation error:', error)
      setError('ネットワークエラーが発生しました')
    } finally {
      setSubmitting(false)
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
  if (error || !subject || !group) {
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

  const totalScore = calculateTotalScore()

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader 
        title="レビューを投稿"
        showBackButton={true}
      />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          {/* レビュー対象情報 */}
          <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            {subject.images && subject.images.length > 0 && (
              <img
                src={subject.images[0]}
                alt={subject.name}
                className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
              />
            )}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{subject.name}</h2>
              <p className="text-sm text-gray-600">グループ: {group.name}</p>
            </div>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 評価 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">評価</h3>
              <div className="space-y-6">
                {group.evaluation_criteria.map((criteria) => (
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
                disabled={submitting}
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
                {/* 既存の画像プレビュー */}
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img
                          src={preview}
                          alt={`プレビュー ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                          disabled={submitting}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* 画像追加 */}
                {images.length < 5 && (
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
                          disabled={submitting}
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

            {/* 投稿ボタン */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={submitting}
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={submitting || !isValidForm()}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    投稿中...
                  </>
                ) : (
                  'レビューを投稿'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}