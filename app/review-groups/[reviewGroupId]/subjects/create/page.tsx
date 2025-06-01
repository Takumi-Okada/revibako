'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useRequireAuth } from '@/lib/use-require-auth'
import { Plus, Loader2, X } from 'lucide-react'
import AppHeader from '@/components/layout/app-header'

interface MetadataField {
  key: string
  label: string
  type: 'text' | 'select'
  options?: string[]
  required: boolean
}

interface GroupInfo {
  id: string
  name: string
  metadata_fields?: {
    fields?: MetadataField[]
  }
}

export default function CreateReviewSubjectPage() {
  const { user, loading, isAuthenticated } = useRequireAuth()
  const router = useRouter()
  const params = useParams()
  const groupId = params.reviewGroupId as string

  const [name, setName] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [metadata, setMetadata] = useState<{ [key: string]: string }>({})
  const [group, setGroup] = useState<GroupInfo | null>(null)
  
  const [formLoading, setFormLoading] = useState(false)
  const [groupLoading, setGroupLoading] = useState(true)
  const [error, setError] = useState('')

  // グループ情報を取得
  useEffect(() => {
    if (!isAuthenticated || !user || !groupId) return

    const fetchGroup = async () => {
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

    fetchGroup()
  }, [isAuthenticated, user, groupId])

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

  const handleMetadataChange = (key: string, value: string) => {
    setMetadata(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !groupId) return

    setFormLoading(true)
    setError('')

    try {
      let uploadedImageUrls: string[] = []

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

      // レビュー対象を作成
      const response = await fetch(`/api/review-groups/${groupId}/subjects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          images: uploadedImageUrls,
          metadata: Object.keys(metadata).length > 0 ? metadata : null,
          userId: user.id
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'エラーが発生しました')
        return
      }

      // 成功時はグループ詳細ページにリダイレクト
      router.push(`/review-groups/${groupId}`)

    } catch (error) {
      console.error('Subject creation error:', error)
      setError('ネットワークエラーが発生しました')
    } finally {
      setFormLoading(false)
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
  if (error || !group) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader showBackButton={true} />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              エラーが発生しました
            </h3>
            <p className="text-gray-600 mb-6">
              {error || 'グループが見つかりません'}
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

  const metadataFields = group.metadata_fields?.fields || []
  const isValidForm = name.trim().length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader 
        title={`${group.name} - レビュー対象を追加`}
        showBackButton={true}
      />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          {/* エラーメッセージ */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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
                placeholder="例: 愛の不時着"
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={formLoading}
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
                          disabled={formLoading}
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
                        <Plus className="w-6 h-6 text-gray-400" />
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
                          disabled={formLoading}
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
                          disabled={formLoading}
                          required={field.required}
                          maxLength={100}
                          rows={3}
                          placeholder="詳細を入力してください"
                        />
                      ) : (
                        <select
                          value={metadata[field.key] || ''}
                          onChange={(e) => handleMetadataChange(field.key, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          disabled={formLoading}
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

            {/* 作成ボタン */}
            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={formLoading}
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={formLoading || !isValidForm}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center"
              >
                {formLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    作成中...
                  </>
                ) : (
                  'レビュー対象を追加'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}