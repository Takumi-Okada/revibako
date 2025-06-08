import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

// PUT /api/review-groups/[reviewGroupId]/subjects/[subjectId]/edit
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ reviewGroupId: string; subjectId: string }> }
) {
  try {
    const { reviewGroupId, subjectId } = await params
    const supabase = createSupabaseServiceClient()
    const body = await request.json()
    const { name, images, metadata, userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // バリデーション
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    if (name.trim().length > 200) {
      return NextResponse.json(
        { error: 'Name must be 200 characters or less' },
        { status: 400 }
      )
    }

    // ユーザーがこのグループのメンバーかチェック
    const { data: membership } = await supabase
      .from('review_group_members')
      .select('role')
      .eq('review_group_id', reviewGroupId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // レビュー対象が存在するかチェック
    const { data: existingSubject } = await supabase
      .from('review_subjects')
      .select('id, created_by')
      .eq('id', subjectId)
      .eq('review_group_id', reviewGroupId)
      .is('deleted_at', null)
      .single()

    if (!existingSubject) {
      return NextResponse.json(
        { error: 'Review subject not found' },
        { status: 404 }
      )
    }

    // 編集権限をチェック（オーナー、管理者、または作成者のみ）
    const canEdit = membership.role === 'owner' || 
                   membership.role === 'admin' || 
                   existingSubject.created_by === userId

    if (!canEdit) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this subject' },
        { status: 403 }
      )
    }

    // レビュー対象を更新
    const { data: updatedSubject, error: updateError } = await supabase
      .from('review_subjects')
      .update({
        name: name.trim(),
        images: images || null,
        metadata: metadata || null
      })
      .eq('id', subjectId)
      .select()
      .single()

    if (updateError) {
      console.error('Subject update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update review subject' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      subject: updatedSubject
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/review-groups/[reviewGroupId]/subjects/[subjectId]/edit
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ reviewGroupId: string; subjectId: string }> }
) {
  try {
    const { reviewGroupId, subjectId } = await params
    const supabase = createSupabaseServiceClient()
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
      .eq('review_group_id', reviewGroupId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // レビュー対象が存在するかチェック
    const { data: existingSubject } = await supabase
      .from('review_subjects')
      .select('id, created_by, name')
      .eq('id', subjectId)
      .eq('review_group_id', reviewGroupId)
      .is('deleted_at', null)
      .single()

    if (!existingSubject) {
      return NextResponse.json(
        { error: 'Review subject not found' },
        { status: 404 }
      )
    }

    // 削除権限をチェック（オーナー、管理者、または作成者のみ）
    const canDelete = membership.role === 'owner' || 
                     membership.role === 'admin' || 
                     existingSubject.created_by === userId

    if (!canDelete) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this subject' },
        { status: 403 }
      )
    }

    // レビューが存在するかチェック
    const { data: existingReviews } = await supabase
      .from('reviews')
      .select('id')
      .eq('review_subject_id', subjectId)
      .is('deleted_at', null)
      .limit(1)

    if (existingReviews && existingReviews.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete subject with existing reviews' },
        { status: 400 }
      )
    }

    // レビュー対象を論理削除
    const { error: deleteError } = await supabase
      .from('review_subjects')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', subjectId)

    if (deleteError) {
      console.error('Subject deletion error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete review subject' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Review subject deleted successfully'
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}