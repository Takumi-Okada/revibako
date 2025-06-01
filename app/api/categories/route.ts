import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createSupabaseServiceClient()

    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('order_index', { ascending: true })

    if (error) {
      console.error('Categories fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      categories
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}