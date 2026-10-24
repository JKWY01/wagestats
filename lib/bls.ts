/** BLS OES 数据访问层。
 *
 * 数据在 data/bls-oes.json(CI 同步写入,随仓库分发),站点读路径零外呼。
 * 纪律:数字要么来自 BLS 原表,要么缺失(null),绝不推算。BLS 的 '#'/'*' 抑制标记同步时已转 null,
 * 页面显示 "not published"。
 */

import raw from '@/data/bls-oes.json'

export interface BlsState {
  code: string
  name: string
  slug: string
}

export interface BlsOccupation {
  soc: string
  slug: string
  title: string
}

export interface BlsStats {
  emp: number | null
  hMean: number | null
  aMean: number | null
  aP10: number | null
  aP25: number | null
  aP50: number | null
  aP75: number | null
  aP90: number | null
  /** 区位商:该州此职业就业集中度 vs 全国(BLS 原生字段,仅州级行有) */
  lq: number | null
}

interface DataShape {
  meta: { source: string; release: string; occupations: number; states: number; cells: number }
  states: BlsState[]
  occupations: BlsOccupation[]
  national: Record<string, BlsStats>
  cells: Record<string, Record<string, BlsStats>>
}

const DATA = raw as unknown as DataShape

const BY_SLUG_OCC = new Map<string, BlsOccupation>(DATA.occupations.map((o) => [o.slug, o]))
const BY_SLUG_STATE = new Map<string, BlsState>(DATA.states.map((s) => [s.slug, s]))
const BY_SOC = new Map<string, BlsOccupation>(DATA.occupations.map((o) => [o.soc, o]))

export function allStates(): BlsState[] {
  return DATA.states
}

export function allOccupations(): BlsOccupation[] {
  return DATA.occupations
}

export function stateBySlug(slug: string): BlsState | null {
  return BY_SLUG_STATE.get(slug) ?? null
}

export function occupationBySlug(slug: string): BlsOccupation | null {
  return BY_SLUG_OCC.get(slug) ?? null
}

export function occupationBySoc(soc: string): BlsOccupation | null {
  return BY_SOC.get(soc) ?? null
}

export function nationalStats(soc: string): BlsStats | null {
  return DATA.national[soc] ?? null
}

export function stateStats(stateCode: string, soc: string): BlsStats | null {
  return DATA.cells[stateCode]?.[soc] ?? null
}

export function meta() {
  return DATA.meta
}

export interface RankedCell {
  state: BlsState
  stats: BlsStats
  rank: number
}

/** 某职业在各州的年均工资排名(降序;年均缺失的州不进榜)。 */
export function occupationRanking(soc: string): RankedCell[] {
  const rows: Array<{ state: BlsState; stats: BlsStats }> = []
  for (const st of DATA.states) {
    const stats = DATA.cells[st.code]?.[soc]
    if (stats?.aMean != null) rows.push({ state: st, stats })
  }
  rows.sort((a, b) => b.stats.aMean! - a.stats.aMean!)
  return rows.map((r, i) => ({ ...r, rank: i + 1 }))
}

/** 州页:该州就业人数最多的职业(前 N,供州页与长尾页内链矩阵用)。 */
export function topOccupationsInState(stateCode: string, limit = 40): Array<{ occ: BlsOccupation; stats: BlsStats }> {
  const cell = DATA.cells[stateCode] ?? {}
  return Object.entries(cell)
    .map(([soc, stats]) => ({ occ: BY_SOC.get(soc)!, stats }))
    .filter((r) => r.occ && r.stats.emp != null)
    .sort((a, b) => b.stats.emp! - a.stats.emp!)
    .slice(0, limit)
}

/** 职业页:全国就业规模最大的职业排行(首页/目录页用)。 */
export function topOccupationsNationally(limit = 40): Array<{ occ: BlsOccupation; stats: BlsStats }> {
  return Object.entries(DATA.national)
    .map(([soc, stats]) => ({ occ: BY_SOC.get(soc)!, stats }))
    .filter((r) => r.occ && r.stats.emp != null)
    .sort((a, b) => b.stats.emp! - a.stats.emp!)
    .slice(0, limit)
}

export function cellCount(): number {
  return DATA.meta.cells
}
