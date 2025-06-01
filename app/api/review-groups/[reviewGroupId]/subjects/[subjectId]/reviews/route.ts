import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'


// 型定義
interface User {
  id: string
  username: string
  display_id: string
  avatar_url: string | null
}

interface EvaluationCriteria {
  name: string
}

interface EvaluationScore {
  criteria_id: string
  score: number
  evaluation_criteria: EvaluationCriteria
}

interface Review {
  id: string
  comment: string | null
  total_score: number
  images: string[] | null
  created_at: string
  updated_at: string
  users: User
  evaluation_scores: EvaluationScore[]
}

interface FormattedEvaluationScore {
  criteria_id: string
  criteria_name: string
  score: number
}

// GET /api/review-groups/[reviewGroupId]/subjects/[subjectId]/reviews
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reviewGroupId: string; subjectId: string }> }
) {
  try {
    const { subjectId } = await params
    const supabase = createSupabaseServiceClient()

    // レビュー一覧を取得（ユーザー情報と評価スコア含む）
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select(`
        id,
        comment,
        total_score,
        images,
        created_at,
        updated_at,
        users!inner (
          id,
          username,
          display_id,
          avatar_url
        ),
        evaluation_scores!inner (
          criteria_id,
          score,
          evaluation_criteria!inner (
            name
          )
        )
      `)
      .eq('review_subject_id', subjectId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }) as {
        data: Review[] | null;
        error: any;
      };

    if (reviewsError) {
      console.error('Reviews fetch error:', reviewsError)
      return NextResponse.json(
        { error: 'Failed to fetch reviews' },
        { status: 500 }
      )
    }

    // データを整形
    const formattedReviews = (reviews || []).map((review: Review) => ({
      id: review.id,
      comment: review.comment,
      total_score: review.total_score,
      images: review.images,
      created_at: review.created_at,
      updated_at: review.updated_at,
      user: {
        id: review.users.id,
        username: review.users.username,
        display_id: review.users.display_id,
        avatar_url: review.users.avatar_url
      },
      evaluation_scores: review.evaluation_scores.map((score: EvaluationScore) => ({
        criteria_id: score.criteria_id,
        criteria_name: score.evaluation_criteria.name,
        score: score.score
      }))
    }))

    return NextResponse.json({
      reviews: formattedReviews
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


// POST /api/review-groups/[reviewGroupId]/subjects/[subjectId]/reviews
export async function POST(
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

    // レビュー対象が存在するかチェック
    const { data: subject } = await supabase
      .from('review_subjects')
      .select('id')
      .eq('id', subjectId)
      .eq('review_group_id', reviewGroupId)
      .is('deleted_at', null)
      .single()

    if (!subject) {
      return NextResponse.json(
        { error: 'Review subject not found' },
        { status: 404 }
      )
    }

    // 既存のレビューがあるかチェック（1ユーザー1レビューの制限）
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('review_subject_id', subjectId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single()

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this subject' },
        { status: 409 }
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

    // トランザクションでレビューと評価スコアを作成
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        review_subject_id: subjectId,
        user_id: userId,
        comment: comment || null,
        total_score: Number(totalScore.toFixed(2)),
        images: images || null
      })
      .select('id')
      .single()

    if (reviewError || !review) {
      console.error('Review creation error:', reviewError)
      return NextResponse.json(
        { error: 'Failed to create review' },
        { status: 500 }
      )
    }

    // 評価スコアを一括作成
    const evaluationScoresData = Object.entries(scores).map(([criteriaId, score]) => ({
      review_id: review.id,
      criteria_id: criteriaId,
      score: score as number
    }))

    const { error: scoresError } = await supabase
      .from('evaluation_scores')
      .insert(evaluationScoresData)

    if (scoresError) {
      console.error('Evaluation scores creation error:', scoresError)
      // レビューも削除してロールバック
      await supabase
        .from('reviews')
        .delete()
        .eq('id', review.id)
      
      return NextResponse.json(
        { error: 'Failed to create evaluation scores' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      review: {
        id: review.id,
        message: 'Review created successfully'
      }
    }, { status: 201 })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}