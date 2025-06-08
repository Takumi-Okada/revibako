import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      )
    }

    // ユーザー情報を取得
    const { data: profile, error } = await supabase
      .from('users')
      .select('id, username, display_id, email, avatar_url, created_at, updated_at')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('User fetch error:', error)
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      profile
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient()
    const { userId, username, avatar_url } = await request.json()

    if (!userId || !username) {
      return NextResponse.json(
        { error: 'ユーザーIDとユーザー名が必要です' },
        { status: 400 }
      )
    }

    // ユーザー名の長さチェック
    if (username.length > 50) {
      return NextResponse.json(
        { error: 'ユーザー名は50文字以下にしてください' },
        { status: 400 }
      )
    }

    // プロフィール更新
    const { data: profile, error } = await supabase
      .from('users')
      .update({
        username: username.trim(),
        avatar_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, username, display_id, email, avatar_url, created_at, updated_at')
      .single()

    if (error) {
      console.error('Profile update error:', error)
      return NextResponse.json(
        { error: 'プロフィールの更新に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'プロフィールを更新しました',
      profile
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}