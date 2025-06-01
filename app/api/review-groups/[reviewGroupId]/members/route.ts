import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { PostgrestError } from '@supabase/supabase-js'

// ユーザー情報のインターフェース
interface User {
  id: string;
  username: string;
  display_id: string;
  avatar_url: string | null;
}

// レビューグループメンバーのインターフェース
interface ReviewGroupMember {
  role: string;
  joined_at: string; // ISO 8601形式の日時文字列
  user_id: string;
  users: User;
}

// フォーマット後のメンバー情報のインターフェース
interface FormattedMember {
  id: string;
  username: string;
  display_id: string;
  avatar_url: string | null;
  role: string;
  joined_at: string;
}


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reviewGroupId: string }> }
) {
  try {
    const supabase = createSupabaseServiceClient()
    const { reviewGroupId } = await params
    const groupId = reviewGroupId

    // グループメンバーを取得
    const { data: members, error } = await supabase
      .from('review_group_members')
      .select(`
        role,
        joined_at,
        user_id,
        users!inner (
          id,
          username,
          display_id,
          avatar_url
        )
      `)
      .eq('review_group_id', groupId)
      .is('deleted_at', null)
      .order('joined_at', { ascending: true }) as {
        data: ReviewGroupMember[] | null;
        error: PostgrestError | null;
      };

    if (error) {
      console.error('Members fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch members' },
        { status: 500 }
      )
    }

    const formattedMembers: FormattedMember[] = members?.map((member: ReviewGroupMember) => ({
      id: member.users.id,
      username: member.users.username,
      display_id: member.users.display_id,
      avatar_url: member.users.avatar_url,
      role: member.role,
      joined_at: member.joined_at
    })) || [];

    return NextResponse.json({
      members: formattedMembers
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}