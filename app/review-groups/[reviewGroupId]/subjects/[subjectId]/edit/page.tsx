'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useRequireAuth } from '@/lib/use-require-auth'
import { 
  Save, 
  Trash2, 
  Loader2, 
  X, 
  AlertTriangle,
  Camera
} from 'lucide-react'
import AppHeader from '@/components/layout/app-header'

interface MetadataField {
  key: string
  label: string
  type: 'text' | 'select'
  options?: string[]
  required: boolean
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
  metadata_fields?: {
    fields?: MetadataField[]
  }
}

export default function EditReviewSubjectPage() {
  const { user, loading, isAuthenticated } = useRequireAuth()
  const router = useRouter()
  const params = useParams()
  const reviewGroupId = params.reviewGroupId as string
  const subjectId = params.subjectId as string

  const [subject, setSubject] = useState<ReviewSubjectDetail | null>(null)
  const [group, setGroup] = useState<GroupInfo | null>(null)
  const [name, setName] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [metadata, setMetadata] = useState<{ [key: string]: string }>({})
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  
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
        const response = await fetch(`/api/review-groups/${reviewGroupId}/subjects/${subjectId}?userId=${user.id}`)
        const data = await response.json()
        
        if (response.ok) {
          setSubject(data.subject)
          setGroup(data.group)
          setName(data.subject.name)
          setExistingImages(data.subject.images || [])
          setMetadata(data.subject.metadata || {})
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

  const handleMetadataChange = (key: string, value: string) => {
    setMetadata(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !subject || !group) return

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

      // レビュー対象を更新
      const response = await fetch(`/api/review-groups/${reviewGroupId}/subjects/${subjectId}/edit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          images: allImageUrls.length > 0 ? allImageUrls : null,
          metadata: Object.keys(metadata).length > 0 ? metadata : null,
          userId: user.id
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'レビュー対象の更新に失敗しました')
        return
      }

      setSuccessMessage('レビュー対象を更新しました')
      
      // 成功時はレビュー対象詳細ページにリダイレクト
      setTimeout(() => {
        router.push(`/review-groups/${reviewGroupId}/subjects/${subjectId}`)
      }, 2000)

    } catch (error) {
      console.error('Subject update error:', error)
      setError('ネットワークエラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!user || !subject || deleteConfirmText !== subject.name) return

    setDeleting(true)
    setError('')

    try {
      const response = await fetch(`/api/review-groups/${reviewGroupId}/subjects/${subjectId}/edit?userId=${user.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'レビュー対象の削除に失敗しました')
        return
      }

      // グループページにリダイレクト
      router.push(`/review-groups/${reviewGroupId}`)

    } catch (error) {
      console.error('Subject deletion error:', error)
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
  if (error && (!subject || !group)) {
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

  // 編集権限チェック
  const canEdit = group?.user_role === 'owner' || 
                  group?.user_role === 'admin' || 
                  subject?.created_by === user?.id

  if (!canEdit) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader showBackButton={true} />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              編集権限がありません
            </h3>
            <p className="text-gray-600 mb-6">
              このレビュー対象は作成者、グループオーナー、または管理者のみが編集できます。
            </p>
            <button
              onClick={() => router.push(`/review-groups/${reviewGroupId}/subjects/${subjectId}`)}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              レビュー対象に戻る
            </button>
          </div>
        </main>
      </div>
    )
  }

  const metadataFields = group?.metadata_fields?.fields || []
  const isValidForm = name.trim().length > 0 && name.trim().length <= 200
  const hasReviews = subject ? subject.review_count > 0 : false

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader 
        title="レビュー対象を編集"
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

          {/* レビューがある場合の警告 */}
          {hasReviews && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-blue-800 text-sm font-medium">
                    このレビュー対象には {subject?.review_count} 件のレビューがあります
                  </p>
                  <p className="text-blue-700 text-sm mt-1">
                    編集内容がレビューの内容と合わなくなる可能性があります。慎重に編集してください。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 編集フォーム */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">基本情報</h2>
            
            <form onSubmit={handleSave} className="space-y-6">
              {/* 名前 */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  名前 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={saving}
                  required
                  maxLength={200}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {name.length}/200文字
                </p>
              </div>

              {/* 画像 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  画像
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
                            alt={`画像 ${index + 1}`}
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
                            alt={`新しい画像 ${index + 1}`}
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

              {/* メタデータフィールド */}
              {metadataFields.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    詳細情報
                  </h3>
                  <div className="space-y-4">
                    {metadataFields.map((field) => (
                      <div key={field.key}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        
                        {field.type === 'text' ? (
                          <textarea
                            value={metadata[field.key] || ''}
                            onChange={(e) => handleMetadataChange(field.key, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                            disabled={saving}
                            required={field.required}
                            maxLength={100}
                            rows={3}
                          />
                        ) : (
                          <select
                            value={metadata[field.key] || ''}
                            onChange={(e) => handleMetadataChange(field.key, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            disabled={saving}
                            required={field.required}
                          >
                            <option value="">選択してください</option>
                            {field.options?.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 保存ボタン */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving || !isValidForm}
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
            </form>
          </div>

          {/* 危険な操作 */}
          {!hasReviews && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-red-600 mb-4">危険な操作</h2>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-red-800 text-sm font-medium">
                      レビュー対象を削除すると復元できません
                    </p>
                    <p className="text-red-700 text-sm mt-1">
                      この操作は取り消すことができません。
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                disabled={saving || deleting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                レビュー対象を削除
              </button>
            </div>
          )}

          {/* レビューがある場合の削除制限メッセージ */}
          {hasReviews && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-600 mb-4">削除について</h2>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-gray-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-700 text-sm font-medium">
                      このレビュー対象にはレビューが投稿されているため削除できません
                    </p>
                    <p className="text-gray-600 text-sm mt-1">
                      レビューデータの整合性を保つため、レビューがあるレビュー対象は削除できません。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 削除確認モーダル */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">
                レビュー対象を削除
              </h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                この操作は取り消すことができません。レビュー対象「{subject?.name}」が永久に削除されます。
              </p>
              <p className="text-gray-700 mb-4">
                削除を確認するには、下のフィールドにレビュー対象名を正確に入力してください：
              </p>
              <p className="font-medium text-gray-900 mb-2">{subject?.name}</p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="レビュー対象名を入力..."
                disabled={deleting}
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteConfirmText('')
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={deleting}
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || deleteConfirmText !== subject?.name}
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