import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

// ランダムな6桁数字のdisplay_idを生成
function generateDisplayId(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// 重複チェック付きのdisplay_id生成
async function generateUniqueDisplayId(): Promise<string> {
  const supabase = createSupabaseServiceClient()
  let displayId: string
  let isUnique = false
  
  while (!isUnique) {
    displayId = generateDisplayId()
    
    const { data } = await supabase
      .from('users')
      .select('display_id')
      .eq('display_id', displayId)
      .single()
    
    if (!data) {
      isUnique = true
    }
  }
  
  return displayId!
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient()
    const { userId, email, username } = await request.json()

    // バリデーション
    if (!userId || !email || !username) {
      return NextResponse.json(
        { error: 'Required fields missing' },
        { status: 400 }
      )
    }

    // usernameの長さチェックのみ（重複チェック削除）
    if (username.trim().length < 1 || username.trim().length > 10) {
      return NextResponse.json(
        { error: 'Username must be 1-50 characters' },
        { status: 400 }
      )
    }

    // ユニークなdisplay_idを生成
    const displayId = await generateUniqueDisplayId()

    // ユーザーを作成または更新
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email,
        username: username.trim(),
        display_id: displayId,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // ユーザー情報を取得
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      // ユーザーが存在しない場合
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          exists: false,
          needsUsername: true
        })
      }
      
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch user' },
        { status: 500 }
      )
    }

    // usernameが設定されているかチェック
    const needsUsername = !data.username

    return NextResponse.json({
      exists: true,
      needsUsername
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}