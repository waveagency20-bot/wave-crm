import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Find the auth user by email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) throw listError

    const authUser = users.find(u => u.email === email)

    // Delete from auth if found
    if (authUser) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authUser.id)
      if (deleteError) throw deleteError
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 400 }
    )
  }
}