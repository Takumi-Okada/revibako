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

    // レビュー対象と関連データを取得
    const { data: subjects, error } = await supabase
      .from('review_subjects')
      .select(`
        id,
        name,
        images,
        metadata,
        created_at
      `)
      .eq('review_group_id', groupId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Subjects fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch subjects' },
        { status: 500 }
      )
    }

    // 各対象のレビュー統計を取得
    const subjectsWithStats = await Promise.all(
      (subjects || []).map(async (subject) => {
        // レビュー数と平均評価を取得
        const { data: reviews } = await supabase
          .from('reviews')
          .select('total_score')
          .eq('review_subject_id', subject.id)
          .is('deleted_at', null)

        const reviewCount = reviews?.length || 0
        const averageScore = reviewCount > 0 && reviews
          ? reviews.reduce((sum, review) => sum + (review.total_score || 0), 0) / reviewCount
          : 0

        // 最新レビューを取得
        const { data: latestReview } = await supabase
          .from('reviews')
          .select(`
            comment,
            total_score,
            created_at,
            users (
              username
            )
          `)
          .eq('review_subject_id', subject.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        return {
          ...subject,
          review_count: reviewCount,
          average_score: averageScore,
          latest_review: latestReview ? {
            comment: latestReview.comment,
            total_score: latestReview.total_score,
            created_at: latestReview.created_at,
            user: latestReview.users
          } : null
        }
      })
    )

    return NextResponse.json({
      subjects: subjectsWithStats
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reviewGroupId: string }> }
) {
  try {
    const supabase = createSupabaseServiceClient()
    const { reviewGroupId } = await params
    const groupId = reviewGroupId
    const { name, images, metadata, userId } = await request.json()

    // バリデーション
    if (!name || !userId) {
      return NextResponse.json(
        { error: 'Required fields missing' },
        { status: 400 }
      )
    }

    // 名前の長さチェック
    if (name.trim().length < 1 || name.trim().length > 200) {
      return NextResponse.json(
        { error: 'Name must be 1-200 characters' },
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

    // レビュー対象を作成
    const { data: subject, error: subjectError } = await supabase
      .from('review_subjects')
      .insert({
        review_group_id: groupId,
        name: name.trim(),
        images: images || null,
        metadata: metadata || null,
        created_by: userId
      })
      .select()
      .single()

    if (subjectError) {
      console.error('Subject creation error:', subjectError)
      return NextResponse.json(
        { error: 'Failed to create review subject' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      subject
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}