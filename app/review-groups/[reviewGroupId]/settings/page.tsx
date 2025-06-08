'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useRequireAuth } from '@/lib/use-require-auth'
import { 
  Save, 
  Trash2, 
  Loader2, 
  Lock, 
  Globe, 
  Star,
  AlertTriangle,
  X,
  Camera
} from 'lucide-react'
import AppHeader from '@/components/layout/app-header'

interface EvaluationCriteria {
  id: string
  name: string
  order_index: number
}

interface MetadataField {
  key: string
  label: string
  type: 'text' | 'select'
  options?: string[]
  required: boolean
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
  evaluation_criteria: EvaluationCriteria[]
  metadata_fields?: {
    fields?: MetadataField[]
  }
}

export default function ReviewGroupSettingsPage() {
  const { user, loading, isAuthenticated } = useRequireAuth()
  const router = useRouter()
  const params = useParams()
  const groupId = params.reviewGroupId as string

  const [group, setGroup] = useState<ReviewGroupDetail | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(true)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null)
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  
  const [groupLoading, setGroupLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // グループ詳細を取得
  useEffect(() => {
    if (!isAuthenticated || !user || !groupId) return

    const fetchGroupDetail = async () => {
      try {
        const response = await fetch(`/api/review-groups/${groupId}?userId=${user.id}`)
        const data = await response.json()
        
        if (response.ok) {
          setGroup(data.group)
          setName(data.group.name)
          setDescription(data.group.description || '')
          setIsPrivate(data.group.is_private)
          setCurrentImageUrl(data.group.image_url)
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setCurrentImageUrl(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !group) return

    setSaving(true)
    setError('')
    setSuccessMessage('')

    try {
      let uploadedImageUrl = currentImageUrl

      // 新しい画像がある場合はアップロード
      if (imageFile) {
        const imageFormData = new FormData()
        imageFormData.append('file', imageFile)
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

        uploadedImageUrl = imageData.imageUrl
      }

      // グループ設定を更新
      const response = await fetch(`/api/review-groups/${groupId}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          isPrivate,
          imageUrl: uploadedImageUrl,
          userId: user.id
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '設定の更新に失敗しました')
        return
      }

      setSuccessMessage('設定を更新しました')
      setCurrentImageUrl(uploadedImageUrl)
      setImageFile(null)
      setImagePreview(null)

      // グループ詳細ページにリダイレクト
      setTimeout(() => {
        router.push(`/review-groups/${groupId}`)
      }, 2000)

    } catch (error) {
      console.error('Settings update error:', error)
      setError('ネットワークエラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!user || !group || deleteConfirmText !== group.name) return

    setDeleting(true)
    setError('')

    try {
      const response = await fetch(`/api/review-groups/${groupId}/settings?userId=${user.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'グループの削除に失敗しました')
        return
      }

      // ホームページにリダイレクト
      router.push('/home')

    } catch (error) {
      console.error('Group deletion error:', error)
      setError('ネットワークエラーが発生しました')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

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
  if (error && !group) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader showBackButton={true} />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              グループが見つかりません
            </h3>
            <p className="text-gray-600 mb-6">
              このグループは存在しないか、アクセス権限がありません。
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

  // オーナー以外はアクセス禁止
  if (group && group.user_role !== 'owner') {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader showBackButton={true} />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              アクセス権限がありません
            </h3>
            <p className="text-gray-600 mb-6">
              グループの設定はオーナーのみが変更できます。
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

  const isValidForm = name.trim().length > 0 && name.trim().length <= 100

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader 
        title={`${group?.name} - 設定`}
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

          {/* 基本設定 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">基本設定</h2>
            
            <form onSubmit={handleSave} className="space-y-6">
              {/* グループ名 */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  グループ名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={saving}
                  required
                  maxLength={100}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {name.length}/100文字
                </p>
              </div>

              {/* 説明 */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  説明
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  disabled={saving}
                  maxLength={500}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {description.length}/500文字
                </p>
              </div>

              {/* グループ画像 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  グループ画像
                </label>
                <div className="space-y-4">
                  {(imagePreview || currentImageUrl) ? (
                    <div className="relative">
                      <img
                        src={imagePreview || currentImageUrl || ''}
                        alt="グループ画像"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-colors"
                        disabled={saving}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                      <div className="space-y-2">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto">
                          <Camera className="w-6 h-6 text-gray-400" />
                        </div>
                        <div>
                          <label
                            htmlFor="image-upload"
                            className="cursor-pointer text-purple-600 hover:text-purple-700 font-medium"
                          >
                            画像をアップロード
                          </label>
                          <input
                            id="image-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                            disabled={saving}
                          />
                        </div>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, JPEG (最大5MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* プライバシー設定 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  プライバシー設定
                </label>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setIsPrivate(true)}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                      isPrivate
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    disabled={saving}
                  >
                    <div className="flex items-center mb-2">
                      <Lock className="w-5 h-5 text-gray-600 mr-3" />
                      <span className="font-medium text-gray-900">プライベート</span>
                    </div>
                    <p className="text-sm text-gray-500 ml-8">
                      招待されたメンバーのみが参加できます
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPrivate(false)}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                      !isPrivate
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    disabled={saving}
                  >
                    <div className="flex items-center mb-2">
                      <Globe className="w-5 h-5 text-gray-600 mr-3" />
                      <span className="font-medium text-gray-900">パブリック</span>
                    </div>
                    <p className="text-sm text-gray-500 ml-8">
                      誰でも参加できます
                    </p>
                  </button>
                </div>
              </div>

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
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      設定を保存
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* 読み取り専用設定 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              作成時の設定（変更不可）
            </h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-blue-800 text-sm font-medium">
                    評価基準とメタデータフィールドは作成後変更できません
                  </p>
                  <p className="text-blue-700 text-sm mt-1">
                    これらの設定を変更すると、既存のレビューとの整合性が取れなくなるためです。
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* カテゴリ */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">カテゴリ</h3>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-2xl mr-3">{group?.category.icon}</span>
                  <span className="font-medium text-gray-900">{group?.category.name}</span>
                </div>
              </div>

              {/* 評価基準 */}
              {group?.evaluation_criteria && group.evaluation_criteria.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">評価基準</h3>
                  <div className="space-y-2">
                    {group.evaluation_criteria.map((criteria) => (
                      <div key={criteria.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <Star className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0" />
                        <span className="text-gray-900">{criteria.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* メタデータフィールド */}
              {group?.metadata_fields?.fields && group.metadata_fields.fields.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    レビュー対象の項目
                  </h3>
                  <div className="space-y-3">
                    {group.metadata_fields.fields.map((field, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900">{field.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                              {field.type === 'text' ? 'テキスト' : '選択肢'}
                            </span>
                            {field.required && (
                              <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                                必須
                              </span>
                            )}
                          </div>
                        </div>
                        {field.type === 'select' && field.options && (
                          <div className="text-sm text-gray-600">
                            選択肢: {field.options.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 危険な操作 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-red-600 mb-4">危険な操作</h2>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-red-800 text-sm font-medium">
                    グループを削除すると、すべてのデータが永久に失われます
                  </p>
                  <p className="text-red-700 text-sm mt-1">
                    レビュー対象、レビュー、評価、メンバー情報など、すべてのデータが削除されます。この操作は取り消せません。
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
              グループを削除
            </button>
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
                グループを削除
              </h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                この操作は取り消すことができません。グループ「{group?.name}」とすべての関連データが永久に削除されます。
              </p>
              <p className="text-gray-700 mb-4">
                削除を確認するには、下のフィールドにグループ名を正確に入力してください：
              </p>
              <p className="font-medium text-gray-900 mb-2">{group?.name}</p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="グループ名を入力..."
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
                disabled={deleting || deleteConfirmText !== group?.name}
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