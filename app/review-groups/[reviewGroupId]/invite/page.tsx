'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useRequireAuth } from '@/lib/use-require-auth'
import { 
  UserPlus, 
  Check, 
  AlertCircle,
  Loader2
} from 'lucide-react'
import AppHeader from '@/components/layout/app-header'

interface GroupInfo {
  id: string
  name: string
  user_role: string
  member_count: number
}

export default function InvitePage() {
  const { user, loading, isAuthenticated } = useRequireAuth()
  const router = useRouter()
  const params = useParams()
  const reviewGroupId = params.reviewGroupId as string

  const [group, setGroup] = useState<GroupInfo | null>(null)
  const [displayId, setDisplayId] = useState('')
  const [groupLoading, setGroupLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // グループ情報を取得
  useEffect(() => {
    if (!isAuthenticated || !user || !reviewGroupId) return

    const fetchGroup = async () => {
      try {
        const response = await fetch(`/api/review-groups/${reviewGroupId}?userId=${user.id}`)
        const data = await response.json()
        
        if (response.ok) {
          setGroup(data.group)
          
          // 招待権限をチェック
          if (data.group.user_role !== 'owner' && data.group.user_role !== 'admin') {
            setError('招待権限がありません')
          }
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
  }, [isAuthenticated, user, reviewGroupId])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !displayId.trim()) return

    setInviting(true)
    setError('')
    setSuccessMessage('')

    try {
      const response = await fetch(`/api/review-groups/${reviewGroupId}/members/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inviterUserId: user.id,
          invitedUserDisplayId: displayId.trim()
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(`${displayId} に招待を送信しました`)
        setDisplayId('')
        
        // 3秒後にグループページに戻る
        setTimeout(() => {
          router.push(`/review-groups/${reviewGroupId}`)
        }, 3000)
      } else {
        setError(data.error || '招待の送信に失敗しました')
      }
    } catch (error) {
      console.error('Invite error:', error)
      setError('ネットワークエラーが発生しました')
    } finally {
      setInviting(false)
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
              エラーが発生しました
            </h3>
            <p className="text-gray-600 mb-6">
              {error}
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

  // 権限がない場合
  if (group && group.user_role !== 'owner' && group.user_role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader showBackButton={true} />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              招待権限がありません
            </h3>
            <p className="text-gray-600 mb-6">
              グループのオーナーまたは管理者のみがメンバーを招待できます。
            </p>
            <button
              onClick={() => router.push(`/review-groups/${reviewGroupId}`)}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              グループに戻る
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader 
        title="メンバーを招待"
        showBackButton={true}
      />

      <main className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          {/* グループ情報 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{group?.name}</h2>
            <p className="text-sm text-gray-600">現在のメンバー: {group?.member_count}名</p>
          </div>

          {/* 成功・エラーメッセージ */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <Check className="w-5 h-5 text-green-600 mr-2" />
                <p className="text-green-600 text-sm">{successMessage}</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* 招待フォーム */}
          <form onSubmit={handleInvite} className="space-y-6">
            <div>
              <label htmlFor="displayId" className="block text-sm font-medium text-gray-700 mb-2">
                招待するユーザーのdisplay ID
              </label>
              <input
                type="text"
                id="displayId"
                value={displayId}
                onChange={(e) => setDisplayId(e.target.value)}
                placeholder="例: 1234567890"
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={inviting}
                required
                maxLength={10}
                pattern="[0-9]{1,10}"
                title="数字のみ入力してください"
              />
              <p className="mt-2 text-sm text-gray-500">
                招待したいユーザーの10桁のdisplay IDを入力してください。
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">招待について</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 既にグループのメンバーのユーザーには招待を送信できません</li>
                <li>• 既に招待済みのユーザーには重複して招待を送信できません</li>
              </ul>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => router.push(`/review-groups/${reviewGroupId}`)}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={inviting}
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={inviting || !displayId.trim()}
                className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center"
              >
                {inviting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    招待中...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    招待を送信
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}