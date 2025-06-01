import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

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
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, display_id, avatar_url')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('User fetch error:', error)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}