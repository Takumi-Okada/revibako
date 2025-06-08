import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

// PUT /api/review-groups/[reviewGroupId]/settings
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ reviewGroupId: string }> }
) {
  try {
    const { reviewGroupId } = await params
    const supabase = createSupabaseServiceClient()
    const body = await request.json()
    const { name, description, isPrivate, imageUrl, userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // バリデーション
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      )
    }

    if (name.trim().length > 100) {
      return NextResponse.json(
        { error: 'Group name must be 100 characters or less' },
        { status: 400 }
      )
    }

    if (description && description.length > 500) {
      return NextResponse.json(
        { error: 'Description must be 500 characters or less' },
        { status: 400 }
      )
    }

    // ユーザーがこのグループのオーナーかチェック
    const { data: membership } = await supabase
      .from('review_group_members')
      .select('role')
      .eq('review_group_id', reviewGroupId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single()

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only group owners can modify settings' },
        { status: 403 }
      )
    }

    // グループが存在するかチェック
    const { data: existingGroup } = await supabase
      .from('review_groups')
      .select('id')
      .eq('id', reviewGroupId)
      .is('deleted_at', null)
      .single()

    if (!existingGroup) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }

    // グループ設定を更新
    const { data: updatedGroup, error: updateError } = await supabase
      .from('review_groups')
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        is_private: isPrivate !== false, // デフォルトはtrue
        image_url: imageUrl || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewGroupId)
      .select()
      .single()

    if (updateError) {
      console.error('Group update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update group settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      group: updatedGroup
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/review-groups/[reviewGroupId]/settings
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ reviewGroupId: string }> }
) {
  try {
    const { reviewGroupId } = await params
    const supabase = createSupabaseServiceClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // ユーザーがこのグループのオーナーかチェック
    const { data: membership } = await supabase
      .from('review_group_members')
      .select('role')
      .eq('review_group_id', reviewGroupId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single()

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only group owners can delete the group' },
        { status: 403 }
      )
    }

    // グループが存在するかチェック
    const { data: existingGroup } = await supabase
      .from('review_groups')
      .select('id')
      .eq('id', reviewGroupId)
      .is('deleted_at', null)
      .single()

    if (!existingGroup) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }

    // 論理削除を実行
    const now = new Date().toISOString()
    
    // グループを削除
    const { error: groupDeleteError } = await supabase
      .from('review_groups')
      .update({ deleted_at: now })
      .eq('id', reviewGroupId)

    if (groupDeleteError) {
      console.error('Group deletion error:', groupDeleteError)
      return NextResponse.json(
        { error: 'Failed to delete group' },
        { status: 500 }
      )
    }

    // 関連データも論理削除
    await Promise.all([
      // メンバーシップを削除
      supabase
        .from('review_group_members')
        .update({ deleted_at: now })
        .eq('review_group_id', reviewGroupId),
      
      // 評価基準を削除
      supabase
        .from('evaluation_criteria')
        .update({ deleted_at: now })
        .eq('review_group_id', reviewGroupId),
      
      // レビュー対象を削除
      supabase
        .from('review_subjects')
        .update({ deleted_at: now })
        .eq('review_group_id', reviewGroupId)
    ])

    // レビューと評価スコアも削除（レビュー対象に紐づくもの）
    const { data: subjects } = await supabase
      .from('review_subjects')
      .select('id')
      .eq('review_group_id', reviewGroupId)

    if (subjects && subjects.length > 0) {
      const subjectIds = subjects.map(s => s.id)
      
      // レビューIDを取得
      const { data: reviews } = await supabase
        .from('reviews')
        .select('id')
        .in('review_subject_id', subjectIds)

      if (reviews && reviews.length > 0) {
        const reviewIds = reviews.map(r => r.id)
        
        // 評価スコアを削除（物理削除 - deleted_atがないため）
        await supabase
          .from('evaluation_scores')
          .delete()
          .in('review_id', reviewIds)
        
        // レビューを削除
        await supabase
          .from('reviews')
          .update({ deleted_at: now })
          .in('id', reviewIds)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Group deleted successfully'
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}