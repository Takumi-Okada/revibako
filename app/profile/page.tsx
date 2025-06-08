'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/use-require-auth'
import { 
  User, 
  Edit3, 
  Save, 
  X, 
  Camera,
  Loader2,
  Check,
  AlertCircle
} from 'lucide-react'
import AppHeader from '@/components/layout/app-header'

interface UserProfile {
  id: string
  display_id: string
  email: string
  username: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export default function ProfilePage() {
  const { user, loading, isAuthenticated } = useRequireAuth()
  const router = useRouter()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [username, setUsername] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>('')
  
  const [profileLoading, setProfileLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // プロフィール情報を取得
  useEffect(() => {
    if (!isAuthenticated || !user) return

    const fetchProfile = async () => {
      try {
        const response = await fetch(`/api/user/profile?userId=${user.id}`)
        const data = await response.json()
        
        if (response.ok) {
          setProfile(data.profile)
          setUsername(data.profile.username)
          setAvatarPreview(data.profile.avatar_url || '')
        } else {
          setError(data.error || 'プロフィールの取得に失敗しました')
        }
      } catch (error) {
        console.error('Profile fetch error:', error)
        setError('ネットワークエラーが発生しました')
      } finally {
        setProfileLoading(false)
      }
    }

    fetchProfile()
  }, [isAuthenticated, user])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // ファイルサイズチェック（5MB）
    if (file.size > 5 * 1024 * 1024) {
      setError('画像ファイルは5MB以下にしてください')
      return
    }

    // ファイル形式チェック
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選択してください')
      return
    }

    setAvatarFile(file)
    
    const reader = new FileReader()
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!user || !profile) return

    setSaving(true)
    setError('')
    setSuccessMessage('')

    try {
      let avatarUrl = profile.avatar_url

      // 新しいアバター画像をアップロード
      if (avatarFile) {
        const imageFormData = new FormData()
        imageFormData.append('file', avatarFile)
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

        avatarUrl = imageData.imageUrl
      }

      // プロフィール更新
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          username: username.trim(),
          avatar_url: avatarUrl
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'プロフィールの更新に失敗しました')
        return
      }

      setProfile(data.profile)
      setAvatarFile(null)
      setIsEditing(false)
      setSuccessMessage('プロフィールを更新しました')

      // 3秒後にメッセージを消去
      setTimeout(() => {
        setSuccessMessage('')
      }, 3000)

    } catch (error) {
      console.error('Profile update error:', error)
      setError('ネットワークエラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (!profile) return
    
    setUsername(profile.username)
    setAvatarFile(null)
    setAvatarPreview(profile.avatar_url || '')
    setIsEditing(false)
    setError('')
  }

  // ローディング中
  if (loading || profileLoading) {
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

  // エラーまたはプロフィールが見つからない場合
  if (error && !profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader showBackButton={true} />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              エラーが発生しました
            </h3>
            <p className="text-gray-600 mb-6">
              {error}
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

  if (!profile) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader 
        title="プロフィール"
        showBackButton={true}
      />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          {/* 成功・エラーメッセージ */}
          {successMessage && (
            <div className="p-4 bg-green-50 border-b border-green-200">
              <div className="flex items-center">
                <Check className="w-5 h-5 text-green-600 mr-2" />
                <p className="text-green-600 text-sm">{successMessage}</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="p-4 bg-red-50 border-b border-red-200">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}

          <div className="p-6">
            {/* ヘッダー */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <User className="w-6 h-6 text-purple-600" />
                <h1 className="text-xl font-bold text-gray-900">プロフィール</h1>
              </div>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center px-3 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  編集
                </button>
              )}
            </div>

            {/* プロフィール内容 */}
            <div className="space-y-6">
              {/* アバター */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="プロフィール画像"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                        <User className="w-12 h-12 text-white" />
                      </div>
                    )}
                  </div>
                  {isEditing && (
                    <label className="absolute bottom-0 right-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-purple-700 transition-colors">
                      <Camera className="w-4 h-4 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                        disabled={saving}
                      />
                    </label>
                  )}
                </div>
                {isEditing && (
                  <p className="mt-2 text-xs text-gray-500 text-center">
                    PNG, JPG, JPEG（最大5MB）
                  </p>
                )}
              </div>

              {/* 基本情報 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Display ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display ID
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
                    {profile.display_id}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    変更できません
                  </p>
                </div>

                {/* メールアドレス */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    メールアドレス
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
                    {profile.email}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    変更できません
                  </p>
                </div>
              </div>

              {/* ユーザー名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ユーザー名
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={saving}
                    required
                    maxLength={50}
                  />
                ) : (
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                    {profile.username}
                  </div>
                )}
              </div>

              {/* 作成日・更新日 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    アカウント作成日
                  </label>
                  <div className="text-sm text-gray-600">
                    {new Date(profile.created_at).toLocaleDateString('ja-JP')}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最終更新日
                  </label>
                  <div className="text-sm text-gray-600">
                    {new Date(profile.updated_at).toLocaleDateString('ja-JP')}
                  </div>
                </div>
              </div>

              {/* 編集時のアクションボタン */}
              {isEditing && (
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    disabled={saving}
                  >
                    <X className="w-4 h-4 mr-2 inline" />
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !username.trim()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        保存
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}