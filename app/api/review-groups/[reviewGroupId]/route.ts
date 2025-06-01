import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reviewGroupId: string }> }
) {
  try {
    const supabase = createSupabaseServiceClient()
    const { reviewGroupId } = await params
    const groupId = reviewGroupId
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // ユーザーがこのグループのメンバーかチェック
    const { data: membership } = await supabase
      .from('review_group_members')
      .select('role')
      .eq('review_group_id', groupId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // グループ詳細を取得
    const { data: group, error: groupError } = await supabase
      .from('review_groups')
      .select(`
        id,
        name,
        description,
        image_url,
        is_private,
        metadata_fields,
        created_at,
        categories (
          id,
          name,
          icon
        )
      `)
      .eq('id', groupId)
      .is('deleted_at', null)
      .single()

    if (groupError || !group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }

    // メンバー数を取得
    const { count: memberCount } = await supabase
      .from('review_group_members')
      .select('*', { count: 'exact', head: true })
      .eq('review_group_id', groupId)
      .is('deleted_at', null)

    // 評価基準を取得
    const { data: evaluationCriteria } = await supabase
      .from('evaluation_criteria')
      .select('id, name, order_index')
      .eq('review_group_id', groupId)
      .is('deleted_at', null)
      .order('order_index', { ascending: true })

    return NextResponse.json({
      group: {
        ...group,
        category: group.categories,
        member_count: memberCount || 0,
        user_role: membership.role,
        evaluation_criteria: evaluationCriteria || []
      }
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}