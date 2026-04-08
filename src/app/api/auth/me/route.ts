import { NextResponse } from 'next/server'
import { getCurrentChild } from '@/lib/auth/session'

export async function GET() {
  try {
    const child = await getCurrentChild()

    if (!child) {
      return NextResponse.json({ profile: null }, { status: 200 })
    }

    return NextResponse.json({ profile: child })
  } catch {
    return NextResponse.json({ profile: null }, { status: 200 })
  }
}
