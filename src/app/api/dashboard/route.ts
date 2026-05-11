import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    _test: 'bare-minimum-no-auth',
    stats: { totalMembers: 42, pendingInterviews: 0, completedThisMonth: 0, overdueCount: 0 },
    upcoming: [],
    recent: [],
    byChapterPhase: [],
  })
}
