import { NextResponse } from 'next/server'

/** ads.txt:AdSense 过审并配置 NEXT_PUBLIC_ADSENSE_CLIENT 后才存在;未配置 404,零痕迹。
 *  内容由 client id 派生,与 AdSlot/布局脚本读同一个变量——三处开关一个 env。 */
export const revalidate = 86400

export function GET(): Response {
  const client = (process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? '').trim()
  if (!client) return new NextResponse('ads.txt not configured', { status: 404 })
  const pub = client.replace(/^ca-/, '')
  const body = `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`
  return new NextResponse(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' },
  })
}
