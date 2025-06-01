'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/use-require-auth'
import { Loader2, Lock, Globe } from 'lucide-react'
import AppHeader from '@/components/layout/app-header'

interface Category {
  id: number
  name: string
  icon: string
  description: string
}

interface MetadataField {
  key: string
  label: string
  type: 'text' | 'select'
  options?: string[]
  required: boolean
}

interface EvaluationCriteria {
  name: string
  description?: string
}

export default function CreateReviewGroupPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [isPrivate, setIsPrivate] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [metadataFields, setMetadataFields] = useState<MetadataField[]>([])
  const [evaluationCriteria, setEvaluationCriteria] = useState<EvaluationCriteria[]>([
    { name: '総合評価', description: '全体的な満足度' }
  ])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [error, setError] = useState('')
  const { user, loading: authLoading, isAuthenticated } = useRequireAuth()
  const router = useRouter()

  // 認証チェックは useRequireAuth が自動で行う

  // カテゴリを取得
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories')
        const data = await response.json()
        
        if (response.ok) {
          setCategories(data.categories)
        } else {
          setError('カテゴリの取得に失敗しました')
        }
      } catch (error) {
        console.error('Categories fetch error:', error)
        setError('ネットワークエラーが発生しました')
      } finally {
        setCategoriesLoading(false)
      }
    }

    fetchCategories()
  }, [])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      router.push('/login')
      return
    }

    if (!categoryId) {
      setError('カテゴリを選択してください')
      return
    }

    setLoading(true)
    setError('')

    try {
      let uploadedImageUrl = null

      // 画像がある場合は先にアップロード
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

      // グループ作成
      const response = await fetch('/api/review-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          categoryId,
          isPrivate,
          metadataFields: metadataFields.length > 0 ? { fields: metadataFields } : null,
          evaluationCriteria,
          imageUrl: uploadedImageUrl,
          userId: user.id
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'エラーが発生しました')
        return
      }

      // 成功時は作成したグループページにリダイレクト
      router.push(`/review-groups/${data.reviewGroup.id}`)

    } catch (error) {
      console.error('Group creation error:', error)
      setError('ネットワークエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const isValidForm = name.trim().length > 0 && 
                      categoryId !== null && 
                      evaluationCriteria.every(c => c.name.trim().length > 0)

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader 
        title="新しいレビューグループを作成" 
        showBackButton={true}
      />

      {/* メインコンテンツ */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          {/* エラーメッセージ */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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
                placeholder="例: 韓国ドラマレビュー"
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={loading}
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
                説明（任意）
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="グループの目的や対象について説明してください"
                rows={3}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                disabled={loading}
                maxLength={500}
              />
              <p className="mt-1 text-xs text-gray-500">
                {description.length}/500文字
              </p>
            </div>

            {/* ホーム画像 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ホーム画像（任意）
              </label>
              <div className="space-y-4">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="プレビュー"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null)
                        setImagePreview(null)
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-colors"
                      disabled={loading}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                    <div className="space-y-2">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto">
                        📷
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
                          disabled={loading}
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

            {/* カテゴリ選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                カテゴリ <span className="text-red-500">*</span>
              </label>
              {categoriesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setCategoryId(category.id)}
                      className={`p-4 border-2 rounded-lg text-left transition-colors ${
                        categoryId === category.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      disabled={loading}
                    >
                      <div className="flex items-center mb-2">
                        <span className="text-2xl mr-2">{category.icon}</span>
                        <span className="font-medium text-gray-900">{category.name}</span>
                      </div>
                      <p className="text-xs text-gray-500">{category.description}</p>
                    </button>
                  ))}
                </div>
              )}
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
                  disabled={loading}
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
                  disabled={loading}
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

            {/* 評価基準設定 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                評価基準
              </label>
              <p className="text-sm text-gray-500 mb-4">
                レビューで評価する項目を設定してください
              </p>
              <div className="space-y-3">
                {evaluationCriteria.map((criterion, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <input
                      type="text"
                      value={criterion.name}
                      onChange={(e) => {
                        const newCriteria = [...evaluationCriteria]
                        newCriteria[index].name = e.target.value
                        setEvaluationCriteria(newCriteria)
                      }}
                      placeholder="例: おいしさ"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={loading}
                      maxLength={50}
                    />
                    {evaluationCriteria.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newCriteria = evaluationCriteria.filter((_, i) => i !== index)
                          setEvaluationCriteria(newCriteria)
                        }}
                        className="text-red-500 hover:text-red-700 px-2 py-2"
                        disabled={loading}
                      >
                        削除
                      </button>
                    )}
                  </div>
                ))}
                {evaluationCriteria.length < 10 && (
                  <button
                    type="button"
                    onClick={() => {
                      setEvaluationCriteria([...evaluationCriteria, { name: '', description: '' }])
                    }}
                    className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                    disabled={loading}
                  >
                    + 評価基準を追加
                  </button>
                )}
              </div>
            </div>

            {/* レビュー対象項目設定 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                レビュー対象項目（任意）
              </label>
              <p className="text-sm text-gray-500 mb-4">
                レビュー対象に追加情報を設定できます（住所、ジャンル、価格帯など）
              </p>
              <div className="space-y-3">
                {metadataFields.map((field, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => {
                          const newFields = [...metadataFields]
                          newFields[index] = { ...field, label: e.target.value, key: e.target.value.toLowerCase().replace(/\s+/g, '_') }
                          setMetadataFields(newFields)
                        }}
                        placeholder="項目名（例: 住所）"
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        disabled={loading}
                        maxLength={30}
                      />
                      <select
                        value={field.type}
                        onChange={(e) => {
                          const newFields = [...metadataFields]
                          newFields[index] = { ...field, type: e.target.value as 'text' | 'select' }
                          setMetadataFields(newFields)
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        disabled={loading}
                      >
                        <option value="text">テキスト入力</option>
                        <option value="select">選択肢</option>
                      </select>
                    </div>
                    
                    {field.type === 'select' && (
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          選択肢
                        </label>
                        
                        {/* 既存の選択肢一覧 */}
                        {field.options && field.options.length > 0 && (
                          <div className="space-y-2 mb-3">
                            {field.options.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                                <span className="text-gray-900">{option}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newFields = [...metadataFields]
                                    const newOptions = field.options?.filter((_, i) => i !== optionIndex) || []
                                    newFields[index] = { ...field, options: newOptions }
                                    setMetadataFields(newFields)
                                  }}
                                  className="text-red-500 hover:text-red-700 p-1"
                                  disabled={loading}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* 新しい選択肢を追加 */}
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            placeholder="新しい選択肢を入力"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            disabled={loading}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                const input = e.target as HTMLInputElement
                                const value = input.value.trim()
                                if (value) {
                                  const newFields = [...metadataFields]
                                  const currentOptions = field.options || []
                                  if (!currentOptions.includes(value)) {
                                    newFields[index] = { ...field, options: [...currentOptions, value] }
                                    setMetadataFields(newFields)
                                    input.value = ''
                                  }
                                }
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              const input = (e.target as HTMLButtonElement).previousElementSibling as HTMLInputElement
                              const value = input.value.trim()
                              if (value) {
                                const newFields = [...metadataFields]
                                const currentOptions = field.options || []
                                if (!currentOptions.includes(value)) {
                                  newFields[index] = { ...field, options: [...currentOptions, value] }
                                  setMetadataFields(newFields)
                                  input.value = ''
                                }
                              }
                            }}
                            className="px-4 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
                            disabled={loading}
                          >
                            追加
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => {
                            const newFields = [...metadataFields]
                            newFields[index] = { ...field, required: e.target.checked }
                            setMetadataFields(newFields)
                          }}
                          className="mr-2"
                          disabled={loading}
                        />
                        <span className="text-sm text-gray-600">必須項目</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const newFields = metadataFields.filter((_, i) => i !== index)
                          setMetadataFields(newFields)
                        }}
                        className="text-red-500 hover:text-red-700 text-sm font-medium px-3 py-1 rounded-md hover:bg-red-50 transition-colors"
                        disabled={loading}
                      >
                        項目を削除
                      </button>
                    </div>
                  </div>
                ))}
                {metadataFields.length < 5 && (
                  <button
                    type="button"
                    onClick={() => {
                      setMetadataFields([...metadataFields, { key: '', label: '', type: 'text', required: false }])
                    }}
                    className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                    disabled={loading}
                  >
                    + 項目を追加
                  </button>
                )}
              </div>
            </div>

            {/* 作成ボタン */}
            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={loading || !isValidForm}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    作成中...
                  </>
                ) : (
                  'レビューグループを作成'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}