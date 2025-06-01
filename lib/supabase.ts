import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'

// フロントエンド用（認証のみ）
export const createSupabaseClient = () => {
  return createClientComponentClient()
}

// サーバーコンポーネント用（cookies は使用時に動的にインポート）
export const createSupabaseServerClient = async () => {
  const { cookies } = await import('next/headers')
  return createServerComponentClient({ cookies })
}

// API Routes用（Service Role Key）
export const createSupabaseServiceClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
