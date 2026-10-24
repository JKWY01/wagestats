#!/usr/bin/env node
/**
 * 线上体检(放养哨兵):每天从 GitHub Actions 对真站黑盒检查。
 * 全过 → 静默退出 0;任一失败 → 退出 1(workflow 自动开 issue 报警)。
 */

const SITE_URL = (process.env.SITE_URL ?? '').replace(/\/+$/, '')
if (!SITE_URL) {
  console.error('[health] SITE_URL not configured')
  process.exit(1)
}

const failures = []
const check = async (name, fn) => {
  try {
    await fn()
    console.log(`[health] ✓ ${name}`)
  } catch (err) {
    failures.push(name)
    console.error(`[health] ✗ ${name}: ${err.message}`)
  }
}

const get = async (path, timeout = 30_000) => {
  const res = await fetch(`${SITE_URL}${path}`, {
    signal: AbortSignal.timeout(timeout),
    headers: { 'User-Agent': 'wagestats-healthcheck' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

await check('home renders with BLS attribution', async () => {
  const html = await get('/')
  if (!/Bureau of Labor Statistics/i.test(html)) throw new Error('no BLS attribution')
  if (!/Salaries by occupation/i.test(html)) throw new Error('missing hero copy')
})

await check('api returns occupation stats', async () => {
  const body = JSON.parse(await get('/api/occupation?slug=registered-nurses'))
  if (!body.national?.aMean || body.national.aMean < 50_000) {
    throw new Error(`bad national aMean: ${body.national?.aMean}`)
  }
})

await check('api state endpoint ranks correctly', async () => {
  const body = JSON.parse(await get('/api/occupation?slug=registered-nurses&state=california'))
  if (body.state_stats?.aMean == null) throw new Error('missing CA aMean')
  if (!body.rank || body.rank < 1 || body.rank > 60) throw new Error(`bad rank: ${body.rank}`)
})

await check('occupation page renders table', async () => {
  const html = await get('/occupation/registered-nurses')
  if (!/salary in/i.test(html)) throw new Error('no state table rows')
})

await check('long-tail ISR cell page renders', async () => {
  const html = await get('/occupation/registered-nurses/california')
  if (!/Registered Nurses salary in California/i.test(html)) throw new Error('missing h1')
})

await check('sitemap lists the full matrix', async () => {
  const xml = await get('/sitemap.xml', 60_000)
  if (!xml.includes('<urlset')) throw new Error('not a urlset')
  const count = (xml.match(/<url>/g) ?? []).length
  if (count < 40_000) throw new Error(`only ${count} URLs`)
})

await check('llms.txt describes the API', async () => {
  const body = await get('/llms.txt')
  if (!body.includes('/api/occupation')) throw new Error('api not documented')
})

if (failures.length > 0) {
  console.error(`[health] FAILED: ${failures.join(' | ')}`)
  process.exit(1)
}
console.log('[health] all checks passed')
