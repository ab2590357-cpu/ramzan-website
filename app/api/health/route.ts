import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function deploymentCommit(): string {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.RAILWAY_GIT_COMMIT_SHA?.trim() ||
    process.env.GITHUB_SHA?.trim() ||
    'unknown'
  );
}

function deploymentRuntime(): 'vercel' | 'railway' | 'node' {
  if (process.env.VERCEL_GIT_COMMIT_SHA?.trim() || process.env.VERCEL?.trim()) return 'vercel';
  if (process.env.RAILWAY_GIT_COMMIT_SHA?.trim() || process.env.RAILWAY_ENVIRONMENT?.trim()) return 'railway';
  return 'node';
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      commit: deploymentCommit(),
      runtime: deploymentRuntime(),
      time: new Date().toISOString()
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
