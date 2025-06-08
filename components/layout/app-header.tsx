'use client'

import { useAuth } from '@/lib/auth-context'
import { useUserProfile } from '@/lib/use-user-profile'
import { Package, LogOut, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AppHeaderProps {
  title?: string
  showBackButton?: boolean
  showUserMenu?: boolean
}

export default function AppHeader({ 
  title, 
  showBackButton = false, 
  showUserMenu = true 
}: AppHeaderProps) {
  const { signOut } = useAuth()
  const { userProfile, loading } = useUserProfile()
  const router = useRouter()

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 左側 */}
          <div className="flex items-center">
            {showBackButton && (
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="w-5 h-5 mr-1" />
                戻る
              </button>
            )}
            
            {/* ロゴ */}
            <button
              onClick={() => router.push('/home')}
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              <Package className="w-6 h-6 text-purple-600 mr-2" />
              <span className="text-lg font-semibold text-purple-600">レビバコ</span>
            </button>
            
            {/* タイトル */}
            {title && (
              <>
                <div className="w-px h-6 bg-gray-300 mx-4" />
                <span className="text-lg font-semibold text-gray-900">{title}</span>
              </>
            )}
          </div>

          {/* 右側 - ユーザーメニュー */}
          {showUserMenu && userProfile && !loading && (
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/profile')}
                className="flex items-center space-x-2 hover:bg-gray-100 px-3 py-2 rounded-md transition-colors"
              >
                <img
                  src={userProfile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.username)}&background=8B5CF6&color=fff&size=32&font-size=0.6`}
                  alt="プロフィール"
                  className="w-8 h-8 rounded-full"
                />
                <span className="text-sm font-medium text-gray-700 hidden sm:block">
                  {userProfile.username}
                </span>
              </button>
              <button
                onClick={signOut}
                className="flex items-center space-x-2 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:block">ログアウト</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}