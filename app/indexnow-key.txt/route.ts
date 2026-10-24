import { NextResponse } from 'next/server'

/** IndexNow 密钥文件:必须原样暴露在站点根(引擎验证 key 所有权)。未配置时 404。 */
export const revalidate = 86400

export function GET(): Response {
  const key = (process.env.INDEXNOW_KEY ?? '').trim()
  if (!key) return new NextResponse('indexnow key not configured', { status: 404 })
  return new NextResponse(key, {
    status: 200,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  })
}
