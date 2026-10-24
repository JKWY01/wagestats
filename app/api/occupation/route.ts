import { NextResponse } from 'next/server'
import {
  allOccupations,
  allStates,
  nationalStats,
  occupationBySlug,
  occupationRanking,
  stateBySlug,
  stateStats,
} from '@/lib/bls'

/** 机器可读端点(agent/MCP 友好):职业列表、全国统计、指定州统计与排名。
 *  CORS 全开:BLS OES 是美国联邦公共领域数据,欢迎任何客户端与 AI agent 引用。 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const state = searchParams.get('state')

  if (!slug) {
    return NextResponse.json(
      {
        game: 'wagestats',
        occupations: allOccupations().length,
        states: allStates().length,
        list: allOccupations().map((o) => ({ slug: o.slug, soc: o.soc, title: o.title })),
        usage: 'add ?slug=<occupation-slug> for national stats; append &state=<state-slug> for state stats',
        source: 'U.S. Bureau of Labor Statistics, OES May 2025',
      },
      { headers: { 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=3600' } },
    )
  }

  const occ = occupationBySlug(slug)
  if (!occ) {
    return NextResponse.json({ error: 'unknown occupation slug' }, { status: 404 })
  }

  const nat = nationalStats(occ.soc)
  if (!state) {
    return NextResponse.json(
      {
        occupation: { slug: occ.slug, soc: occ.soc, title: occ.title },
        national: nat,
        states_published: occupationRanking(occ.soc).length,
        source: 'U.S. Bureau of Labor Statistics, OES May 2025',
      },
      { headers: { 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=3600' } },
    )
  }

  const st = stateBySlug(state)
  if (!st) {
    return NextResponse.json({ error: 'unknown state slug' }, { status: 404 })
  }
  const ranking = occupationRanking(occ.soc)
  const rank = ranking.findIndex((r) => r.state.code === st.code)
  return NextResponse.json(
    {
      occupation: { slug: occ.slug, soc: occ.soc, title: occ.title },
      state: { slug: st.slug, code: st.code, name: st.name },
      state_stats: stateStats(st.code, occ.soc),
      national: nat,
      rank: rank >= 0 ? rank + 1 : null,
      of_states: ranking.length,
      source: 'U.S. Bureau of Labor Statistics, OES May 2025',
    },
    { headers: { 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=3600' } },
  )
}
