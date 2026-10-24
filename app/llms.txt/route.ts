import { NextResponse } from 'next/server'
import { BASE, SITE_NAME } from '@/lib/site'
import { meta } from '@/lib/bls'

/** llms.txt:给 AI 爬虫/agent 的站点说明书(AI 原生分发的入场券)。 */
export const revalidate = 86400

export function GET(): Response {
  const m = meta()
  const body = `# ${SITE_NAME}

> Salaries by occupation and U.S. state, from official BLS data. ${m.occupations} occupations × ${m.states} states = ${m.cells.toLocaleString('en-US')} published data points.
> Live at ${BASE} . All figures come from the U.S. Bureau of Labor Statistics OES survey (public domain); AI crawlers and agents are welcome.

## Endpoints

- ${BASE}/api/occupation?slug=<occupation-slug>[&state=<state-slug>] — national stats, or state-level stats + rank when state is given
- ${BASE}/api/occupation — the full occupation list (slug, SOC code, title)
- ${BASE}/sitemap.xml — full URL list (${(m.occupations * m.states + m.occupations + m.states + 3).toLocaleString('en-US')} URLs)

## Pages

- /occupation/<slug> — national page: U.S. mean/median/percentiles, employment, all-states ranking table
- /occupation/<slug>/<state-slug> — one page per occupation per state: state mean/percentiles vs U.S., rank among states, employment, location quotient
- /state/<state-slug> — a state's largest occupations with pay
- /occupations, /states — directories

## Facts & policy

- Source: BLS Occupational Employment and Wage Statistics, ${m.release} reference period (updated roughly once a year — snapshot survey, not real-time payroll).
- "not published" means BLS suppressed the figure for confidentiality; we never estimate or interpolate.
- Occupation slugs are the lowercased BLS title; states use postal abbreviations in data and full-name slugs in URLs.
`
  return new NextResponse(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' },
  })
}
