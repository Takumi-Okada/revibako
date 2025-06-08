import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { PostgrestError } from '@supabase/supabase-js'

interface EvaluationCriteria {
  name: string
}

interface EvaluationScore {
  criteria_id: string
  score: number
  evaluation_criteria: EvaluationCriteria
}

// GET /api/review-groups/[reviewGroupId]/subjects/[subjectId]/reviews/edit
export async function GET(
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

    // ユーザーのレビューを取得
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select(`
        id,
        comment,
        total_score,
        images,
        created_at,
        updated_at,
        user_id
      `)
      .eq('review_subject_id', subjectId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single()

    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    // 評価スコアを取得
    const { data: evaluationScores } = await supabase
      .from('evaluation_scores')
      .select(`
        criteria_id,
        score,
        evaluation_criteria (
          name
        )
      `)
      .eq('review_id', review.id) as {
        data: EvaluationScore[] | null;
        error: PostgrestError | null;
    };

    // グループ情報を取得
    const { data: group } = await supabase
      .from('review_groups')
      .select(`
        id,
        name,
        evaluation_criteria (
          id,
          name,
          order_index
        )
      `)
      .eq('id', reviewGroupId)
      .is('deleted_at', null)
      .single()

    // レビュー対象情報を取得
    const { data: subject } = await supabase
      .from('review_subjects')
      .select('id, name, images')
      .eq('id', subjectId)
      .eq('review_group_id', reviewGroupId)
      .is('deleted_at', null)
      .single()

    return NextResponse.json({
      review: {
        id: review.id,
        comment: review.comment,
        total_score: review.total_score,
        images: review.images,
        created_at: review.created_at,
        updated_at: review.updated_at,
        evaluation_scores: (evaluationScores || []).map((score: EvaluationScore) => ({
          criteria_id: score.criteria_id,
          criteria_name: score.evaluation_criteria.name,
          score: score.score
        }))
      },
      group: {
        ...group,
        user_role: membership.role,
        evaluation_criteria: group?.evaluation_criteria || []
      },
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

// PUT /api/review-groups/[reviewGroupId]/subjects/[subjectId]/reviews/edit
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ reviewGroupId: string; subjectId: string }> }
) {
  try {
    const { reviewGroupId, subjectId } = await params
    const supabase = createSupabaseServiceClient()
    const body = await request.json()
    const { comment, scores, images, userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    if (!scores || Object.keys(scores).length === 0) {
      return NextResponse.json(
        { error: 'Scores required' },
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

    // ユーザーのレビューを取得
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id, user_id')
      .eq('review_subject_id', subjectId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single()

    if (!existingReview) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    // 評価基準を取得して検証
    const { data: evaluationCriteria } = await supabase
      .from('evaluation_criteria')
      .select('id, name')
      .eq('review_group_id', reviewGroupId)
      .is('deleted_at', null)

    if (!evaluationCriteria || evaluationCriteria.length === 0) {
      return NextResponse.json(
        { error: 'No evaluation criteria found' },
        { status: 400 }
      )
    }

    // 送信されたスコアが有効かチェック
    const criteriaIds = evaluationCriteria.map(c => c.id)
    const scoreEntries = Object.entries(scores)
    
    for (const [criteriaId, score] of scoreEntries) {
      if (!criteriaIds.includes(criteriaId)) {
        return NextResponse.json(
          { error: `Invalid criteria ID: ${criteriaId}` },
          { status: 400 }
        )
      }
      
      if (typeof score !== 'number' || score < 1 || score > 5) {
        return NextResponse.json(
          { error: `Invalid score for ${criteriaId}. Must be between 1 and 5` },
          { status: 400 }
        )
      }
    }

    // 総合評価を計算
    const scoreValues = Object.values(scores) as number[]
    const totalScore = scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length

    // レビューを更新
    const { error: reviewUpdateError } = await supabase
      .from('reviews')
      .update({
        comment: comment || null,
        total_score: Number(totalScore.toFixed(2)),
        images: images || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingReview.id)

    if (reviewUpdateError) {
      console.error('Review update error:', reviewUpdateError)
      return NextResponse.json(
        { error: 'Failed to update review' },
        { status: 500 }
      )
    }

    // 既存の評価スコアを削除
    const { error: deleteScoresError } = await supabase
      .from('evaluation_scores')
      .delete()
      .eq('review_id', existingReview.id)

    if (deleteScoresError) {
      console.error('Evaluation scores deletion error:', deleteScoresError)
      return NextResponse.json(
        { error: 'Failed to update evaluation scores' },
        { status: 500 }
      )
    }

    // 新しい評価スコアを作成
    const evaluationScoresData = Object.entries(scores).map(([criteriaId, score]) => ({
      review_id: existingReview.id,
      criteria_id: criteriaId,
      score: score as number
    }))

    const { error: scoresError } = await supabase
      .from('evaluation_scores')
      .insert(evaluationScoresData)

    if (scoresError) {
      console.error('Evaluation scores creation error:', scoresError)
      return NextResponse.json(
        { error: 'Failed to update evaluation scores' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Review updated successfully'
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/review-groups/[reviewGroupId]/subjects/[subjectId]/reviews/edit
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

    // ユーザーのレビューを取得
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id, user_id')
      .eq('review_subject_id', subjectId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single()

    if (!existingReview) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    // 評価スコアを削除（物理削除）
    const { error: deleteScoresError } = await supabase
      .from('evaluation_scores')
      .delete()
      .eq('review_id', existingReview.id)

    if (deleteScoresError) {
      console.error('Evaluation scores deletion error:', deleteScoresError)
      return NextResponse.json(
        { error: 'Failed to delete evaluation scores' },
        { status: 500 }
      )
    }

    // レビューを論理削除
    const { error: deleteReviewError } = await supabase
      .from('reviews')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', existingReview.id)

    if (deleteReviewError) {
      console.error('Review deletion error:', deleteReviewError)
      return NextResponse.json(
        { error: 'Failed to delete review' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully'
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}