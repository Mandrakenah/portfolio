import { NextResponse } from 'next/server'

const BOOT = Date.now()

/**
 * Real server-side health, not a decorative number. The /system page pings
 * this and reports the round trip it actually measured.
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: 'portfolio-web',
      runtime: `node ${process.versions.node}`,
      next: process.env.NEXT_RUNTIME ?? 'nodejs',
      region: process.env.VERCEL_REGION ?? 'local',
      commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev').slice(0, 7),
      deployedAt: process.env.VERCEL_DEPLOYMENT_ID ? undefined : new Date(BOOT).toISOString(),
      uptimeSeconds: Math.round((Date.now() - BOOT) / 1000),
      now: new Date().toISOString(),
    },
    { headers: { 'cache-control': 'no-store' } },
  )
}
