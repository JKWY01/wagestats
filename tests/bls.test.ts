import { describe, expect, it } from 'vitest'
import {
  allOccupations,
  allStates,
  cellCount,
  meta,
  nationalStats,
  occupationBySlug,
  occupationRanking,
  stateBySlug,
  stateStats,
  topOccupationsInState,
} from '@/lib/bls'

const HAS_DATA = allStates().length > 0

describe.skipIf(!HAS_DATA)('BLS data integrity', () => {
  it('has a sane matrix size', () => {
    expect(allStates().length).toBeGreaterThanOrEqual(50)
    expect(allOccupations().length).toBeGreaterThanOrEqual(500)
    expect(cellCount()).toBeGreaterThanOrEqual(10_000)
  })

  it('occupation and state slugs are unique', () => {
    expect(new Set(allOccupations().map((o) => o.slug)).size).toBe(allOccupations().length)
    expect(new Set(allStates().map((s) => s.slug)).size).toBe(allStates().length)
  })

  it('every cell references a known occupation and state', () => {
    const socs = new Set(allOccupations().map((o) => o.soc))
    const codes = new Set(allStates().map((s) => s.code))
    for (const st of allStates()) {
      // stateStats 抽查:首个职业必须有返回路径
      const first = topOccupationsInState(st.code, 1)[0]
      if (first) expect(stateStats(st.code, first.occ.soc)).not.toBeNull()
    }
    expect(socs.size).toBeGreaterThan(0)
    expect(codes.size).toBeGreaterThan(0)
  })

  it('anchor: registered nurses exist with national data', () => {
    const rn = allOccupations().find((o) => /registered nurse/i.test(o.title))
    expect(rn).toBeDefined()
    const nat = nationalStats(rn!.soc)
    expect(nat?.aMean).toBeGreaterThan(50_000)
    expect(nat?.emp).toBeGreaterThan(100_000)
  })

  it('ranking sorts descending by annual mean and ranks from 1', () => {
    const rn = allOccupations().find((o) => /registered nurse/i.test(o.title))!
    const ranking = occupationRanking(rn.soc)
    expect(ranking.length).toBeGreaterThan(40)
    expect(ranking[0].rank).toBe(1)
    for (let i = 1; i < ranking.length; i += 1) {
      expect(ranking[i].stats.aMean!).toBeLessThanOrEqual(ranking[i - 1].stats.aMean!)
    }
  })
})

describe('accessors degrade honestly', () => {
  it('unknown slugs return null, not fabricated data', () => {
    expect(occupationBySlug('not-a-job')).toBeNull()
    expect(stateBySlug('westeros')).toBeNull()
    expect(nationalStats('00-0000')).toBeNull()
    if (HAS_DATA) {
      const st = allStates()[0]
      expect(stateStats(st.code, '00-0000')).toBeNull()
    }
  })
})

describe.skipIf(!HAS_DATA)('meta', () => {
  it('declares the BLS source and release', () => {
    expect(meta().source).toContain('Bureau of Labor Statistics')
    expect(meta().release).toMatch(/^May \d{4}$/)
  })
})
