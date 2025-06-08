import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: { reviewGroupId: string } }
) {
  try {
    const { inviterUserId, invitedUserDisplayId } = await request.json()
    
    if (!inviterUserId || !invitedUserDisplayId) {
      return NextResponse.json(
        { error: '招待者ID、招待するユーザーIDが必要です' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServiceClient()
    const reviewGroupId = params.reviewGroupId

    // 招待者がグループのメンバーかチェック
    const { data: inviterMember, error: memberError } = await supabase
      .from('review_group_members')
      .select('id, role')
      .eq('review_group_id', reviewGroupId)
      .eq('user_id', inviterUserId)
      .is('deleted_at', null)
      .single()

    if (memberError || !inviterMember) {
      return NextResponse.json(
        { error: 'グループのメンバーのみ招待できます' },
        { status: 403 }
      )
    }

    // 招待するユーザーが存在するかチェック
    const { data: invitedUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('display_id', invitedUserDisplayId)
      .single()

    if (userError || !invitedUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // 既にグループメンバーかチェック
    const { data: existingMember } = await supabase
      .from('review_group_members')
      .select('id')
      .eq('review_group_id', reviewGroupId)
      .eq('user_id', invitedUser.id)
      .is('deleted_at', null)
      .single()

    if (existingMember) {
      return NextResponse.json(
        { error: 'このユーザーは既にグループのメンバーです' },
        { status: 409 }
      )
    }

    // 既に招待済みかチェック
    const { data: existingInvitation } = await supabase
      .from('invitations')
      .select('id, status')
      .eq('review_group_id', reviewGroupId)
      .eq('invited_user_display_id', invitedUserDisplayId)
      .eq('status', 'pending')
      .single()

    if (existingInvitation) {
      return NextResponse.json(
        { error: '既にこのユーザーに招待を送信済みです' },
        { status: 409 }
      )
    }

    // 招待レコード作成
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .insert({
        review_group_id: reviewGroupId,
        inviter_id: inviterUserId,
        invited_user_display_id: invitedUserDisplayId,
        status: 'pending'
      })
      .select()
      .single()

    if (invitationError) {
      console.error('Invitation creation error:', invitationError)
      return NextResponse.json(
        { error: '招待の作成に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: '招待を送信しました',
      invitation
    })

  } catch (error) {
    console.error('Invitation API error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}