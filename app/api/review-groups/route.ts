import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { PostgrestError } from '@supabase/supabase-js'


interface EvaluationCriteria {
  name: string
}

interface Category {
  id: string
  name: string
  icon: string
}

interface ReviewGroup {
  id: string
  name: string
  description: string | null
  is_private: boolean
  image_url: string | null
  created_at: string
  categories: Category
}

interface ReviewGroupMember {
  role: string
  joined_at: string
  review_groups: ReviewGroup
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient()
    const { 
      name, 
      description, 
      categoryId, 
      isPrivate, 
      metadataFields,
      evaluationCriteria,
      imageUrl,
      userId 
    } = await request.json()

    // バリデーション
    if (!name || !categoryId || !userId || !evaluationCriteria) {
      return NextResponse.json(
        { error: 'Required fields missing' },
        { status: 400 }
      )
    }

    // グループ名の長さチェック
    if (name.trim().length < 1 || name.trim().length > 100) {
      return NextResponse.json(
        { error: 'Group name must be 1-100 characters' },
        { status: 400 }
      )
    }

    // 評価基準のバリデーション
    if (!Array.isArray(evaluationCriteria) || evaluationCriteria.length === 0) {
      return NextResponse.json(
        { error: 'At least one evaluation criteria is required' },
        { status: 400 }
      )
    }

    // カテゴリの存在確認
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('id', categoryId)
      .single()

    if (!category) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      )
    }

    // レビューグループを作成
    const { data: group, error: groupError } = await supabase
      .from('review_groups')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        category_id: categoryId,
        is_private: isPrivate !== false, // デフォルトはprivate
        metadata_fields: metadataFields || null,
        image_url: imageUrl || null,
      })
      .select()
      .single()

    if (groupError) {
      console.error('Group creation error:', groupError)
      return NextResponse.json(
        { error: 'Failed to create group' },
        { status: 500 }
      )
    }

    // グループメンバーシップを作成（オーナーとして）
    const { error: memberError } = await supabase
      .from('review_group_members')
      .insert({
        review_group_id: group.id,
        user_id: userId,
        role: 'owner'
      })

    if (memberError) {
      console.error('Membership creation error:', memberError)
      // グループも削除
      await supabase
        .from('review_groups')
        .delete()
        .eq('id', group.id)
      
      return NextResponse.json(
        { error: 'Failed to create group membership' },
        { status: 500 }
      )
    }

    // 評価基準を作成
    const criteriaToInsert = evaluationCriteria
      .filter((criteria: EvaluationCriteria) => criteria.name?.trim())
      .map((criteria: EvaluationCriteria, index: number) => ({
        review_group_id: group.id,
        name: criteria.name.trim(),
        order_index: index
      }))

    if (criteriaToInsert.length > 0) {
      const { error: criteriaError } = await supabase
        .from('evaluation_criteria')
        .insert(criteriaToInsert)

      if (criteriaError) {
        console.error('Criteria creation error:', criteriaError)
        // グループとメンバーシップを削除
        await supabase.from('review_group_members').delete().eq('review_group_id', group.id)
        await supabase.from('review_groups').delete().eq('id', group.id)
        
        return NextResponse.json(
          { error: 'Failed to create evaluation criteria' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      reviewGroup: {
        id: group.id,
        name: group.name,
        description: group.description
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

    // ユーザーが参加しているグループを取得
    const { data: groups, error } = await supabase
      .from('review_group_members')
      .select(`
        role,
        joined_at,
        review_groups!inner (
          id,
          name,
          description,
          is_private,
          image_url,
          created_at,
          categories!inner (
            id,
            name,
            icon
          )
        )
      `)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('joined_at', { ascending: false }) as {
        data: ReviewGroupMember[] | null;
        error: PostgrestError | null;
      };

    if (error) {
      console.error('Groups fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch groups' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      reviewGroups: groups!.map((item: ReviewGroupMember) => ({
        ...item.review_groups,
        role: item.role,
        joinedAt: item.joined_at,
        category: item.review_groups?.categories
      }))
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}