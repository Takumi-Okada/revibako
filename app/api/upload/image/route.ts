import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient()
    
    // FormDataから画像ファイルを取得
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'File and userId are required' },
        { status: 400 }
      )
    }

    // ファイル名を生成（重複を避けるため）
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}_${Date.now()}.${fileExt}`
    const filePath = `review-groups/${fileName}`

    // Supabase Storageにアップロード
    const { error: uploadError } = await supabase.storage
      .from('review-group-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      )
    }

    // 公開URLを取得
    const { data } = supabase.storage
      .from('review-group-images')
      .getPublicUrl(filePath)

    return NextResponse.json({
      success: true,
      imageUrl: data.publicUrl
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}