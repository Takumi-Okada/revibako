import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

// GET /api/review-groups/[reviewGroupId]/subjects/[subjectId]
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

    // レビュー対象詳細を取得
    const { data: subject, error: subjectError } = await supabase
      .from('review_subjects')
      .select(`
        id,
        name,
        images,
        metadata,
        created_by,
        created_at
      `)
      .eq('id', subjectId)
      .eq('review_group_id', reviewGroupId)
      .is('deleted_at', null)
      .single()

    if (subjectError || !subject) {
      return NextResponse.json(
        { error: 'Review subject not found' },
        { status: 404 }
      )
    }

    // レビュー統計を取得
    const { data: reviewStats } = await supabase
      .from('reviews')
      .select('total_score')
      .eq('review_subject_id', subjectId)
      .is('deleted_at', null)

    const reviewCount = reviewStats?.length || 0
    const averageScore = reviewCount > 0 && reviewStats
      ? reviewStats.reduce((sum, review) => sum + review.total_score, 0) / reviewCount 
      : 0

    // 評価基準別平均スコアを取得
    // まずレビューIDを取得
    const { data: reviewIds } = await supabase
      .from('reviews')
      .select('id')
      .eq('review_subject_id', subjectId)
      .is('deleted_at', null)

    let criteriaScores = null
    if (reviewIds && reviewIds.length > 0) {
      const reviewIdList = reviewIds.map(review => review.id)
      
      const { data } = await supabase
        .from('evaluation_scores')
        .select(`
          criteria_id,
          score,
          evaluation_criteria!inner (
            name
          )
        `)
        .in('review_id', reviewIdList)
      
      criteriaScores = data
    }

    // 評価基準別の平均を計算
    const scoreBreakdown: { [key: string]: { name: string; scores: number[] } } = {}
    
    if (criteriaScores) {
      criteriaScores.forEach((score: any) => {
        const criteriaId = score.criteria_id
        const criteriaName = score.evaluation_criteria.name
        
        if (!scoreBreakdown[criteriaId]) {
          scoreBreakdown[criteriaId] = {
            name: criteriaName,
            scores: []
          }
        }
        scoreBreakdown[criteriaId].scores.push(score.score)
      })
    }

    const formattedScoreBreakdown = Object.entries(scoreBreakdown).map(([criteriaId, data]) => ({
      criteria_id: criteriaId,
      criteria_name: data.name,
      average_score: data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length
    }))

    // グループ情報も含めて返す
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

    return NextResponse.json({
      subject: {
        ...subject,
        review_count: reviewCount,
        average_score: averageScore,
        score_breakdown: formattedScoreBreakdown
      },
      group: {
        ...group,
        user_role: membership.role,
        evaluation_criteria: group?.evaluation_criteria || []
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