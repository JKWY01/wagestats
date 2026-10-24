#!/usr/bin/env node
/**
 * BLS OES(职业就业与工资统计)州级数据同步。
 *
 *   源  U.S. Bureau of Labor Statistics — Occupational Employment and Wage Statistics
 *        May 2025 州级数据包(zip,内含每州一个 XLSX + 全国文件)。
 *        BLS 屏蔽大量非浏览器/数据中心 IP,本地常 403 —— 本脚本设计为在 GitHub Actions 上跑
 *        (GitHub 出口可达),数据落仓库,站点读路径零外呼。
 *
 *   纪律  与 AnswerToday 同一套:数字要么来自 BLS 原表,要么缺失(null),绝不推算/编造。
 *        '#'(BLS 对超高工资的抑制标记)与 '*' 同样存 null,页面如实显示 "not published"。
 *        全国口径只取 BLS 全国文件的行,不用州数据加总伪造(那不是 OES 的估计方法)。
 *
 * 运行:`node scripts/sync-bls.mjs`。幂等:数据本体无变化不写文件。
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import * as XLSX from 'xlsx'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_PATH = join(ROOT, 'data', 'bls-oes.json')
const TMP = join(ROOT, '.bls-tmp')

/** May 2025 发布的候选 URL(按官方命名惯例排列;可用 BLS_ZIP_URL 覆盖)。 */
const ZIP_CANDIDATES = [
  process.env.BLS_ZIP_URL,
  'https://www.bls.gov/oes/special-requests/oesm25state.zip',
  'https://www.bls.gov/oes/special-requests/oesm25st.zip',
].filter(Boolean)

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

function etTodayISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())
}

async function downloadZip() {
  const zipPath = join(TMP, 'oes-state.zip')
  for (const url of ZIP_CANDIDATES) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: '*/*', Referer: 'https://www.bls.gov/oes/' },
        redirect: 'follow',
        signal: AbortSignal.timeout(120_000),
      })
      if (!res.ok) {
        console.log(`[sync-bls] ${url} → HTTP ${res.status}`)
        continue
      }
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < 100_000 || !buf.subarray(0, 2).equals(Buffer.from('PK'))) {
        console.log(`[sync-bls] ${url} → not a zip (${buf.length}B)`)
        continue
      }
      const { writeFileSync: wf } = await import('node:fs')
      wf(zipPath, buf)
      console.log(`[sync-bls] downloaded ${url} (${(buf.length / 1e6).toFixed(1)}MB)`)
      return zipPath
    } catch (err) {
      console.log(`[sync-bls] ${url} → ${err.message}`)
    }
  }
  throw new Error('all BLS zip candidates failed (if local: BLS blocks many IPs — run in CI)')
}

/** '#'/'*' 等 BLS 标记 → null;数字字段转 number;纯文本字段留字符串。 */
function num(v) {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  if (s === '' || s === '#' || s === '*' || s === '**') return null
  const n = Number(s.replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

const US_NAMES = new Set(['United States', 'U.S.', 'US'])

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function main() {
  mkdirSync(TMP, { recursive: true })
  downloadZip()
    .then((zp) => {
      execFileSync('unzip', ['-o', zp, '-d', TMP], { stdio: 'pipe' })
      const files = execFileSync('find', [TMP, '-name', '*.xlsx'], { encoding: 'utf8' })
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean)
      if (files.length < 40) throw new Error(`expected 50+ state xlsx, got ${files.length}`)

      const states = []
      const stateByName = new Map()
      const occupations = []
      const occBySoc = new Map()
      const national = {}
      const cells = {}

      for (const file of files) {
        const wb = XLSX.readFile(file, { cellDates: false })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: null })
        for (const r of rows) {
          const area = String(r.AREA_TITLE ?? '').trim()
          const soc = String(r.OCC_CODE ?? '').trim()
          const group = String(r.OCC_GROUP ?? '').trim() // total|major|detailed
          if (group !== 'detailed' || !soc || !soc.includes('-')) continue

          if (US_NAMES.has(area)) {
            national[soc] = pickStats(r)
            continue
          }
          // 州级行:AREA 是两位 FIPS,AREA_TITLE 是州名(排除都会区/非都会区行)
          const areaCode = String(r.AREA ?? '').trim()
          if (areaCode.length !== 2 || !/^\d{2}$/.test(areaCode)) continue

          if (!stateByName.has(area)) {
            const st = { code: r.PRIM_STATE ?? areaCode, name: area, slug: slugify(area) }
            stateByName.set(area, st)
            states.push(st)
            cells[st.code] = {}
          }
          const st = stateByName.get(area)
          const stats = pickStats(r)
          if (stats.emp === null && stats.aMean === null && stats.hMean === null) continue
          cells[st.code][soc] = stats

          if (!occBySoc.has(soc)) {
            const occ = { soc, slug: slugify(r.OCC_TITLE), title: String(r.OCC_TITLE).trim() }
            occBySoc.set(soc, occ)
            occupations.push(occ)
          }
        }
      }

      const occCount = occupations.length
      let cellCount = 0
      for (const st of Object.keys(cells)) cellCount += Object.keys(cells[st]).length
      if (occCount < 500 || states.length < 50 || cellCount < 10_000) {
        throw new Error(`parse sanity failed: occ=${occCount} states=${states.length} cells=${cellCount}`)
      }
      // slug 冲突检查(职业名 slug 必须唯一,否则路由会互相覆盖)
      const slugs = new Map()
      for (const o of occupations) {
        if (slugs.has(o.slug)) throw new Error(`occupation slug collision: ${o.slug} (${o.soc} vs ${slugs.get(o.slug)})`)
        slugs.set(o.slug, o.soc)
      }

      const payload = {
        meta: {
          source: 'U.S. Bureau of Labor Statistics — Occupational Employment and Wage Statistics',
          release: 'May 2025',
          fetched_at: new Date().toISOString(),
          occupations: occCount,
          states: states.length,
          cells: cellCount,
        },
        states: states.sort((a, b) => a.name.localeCompare(b.name)),
        occupations: occupations.sort((a, b) => a.title.localeCompare(b.title)),
        national,
        cells,
      }

      const prev = existsSync(DATA_PATH)
        ? JSON.parse(readFileSync(DATA_PATH, 'utf8'))
        : null
      const sameData =
        prev &&
        JSON.stringify(prev.states) === JSON.stringify(payload.states) &&
        JSON.stringify(prev.occupations) === JSON.stringify(payload.occupations) &&
        JSON.stringify(prev.national) === JSON.stringify(payload.national) &&
        JSON.stringify(prev.cells) === JSON.stringify(payload.cells)
      if (sameData) {
        console.log(`[sync-bls] occ=${occCount} states=${states.length} cells=${cellCount} — no change, skip write`)
        return
      }

      mkdirSync(join(ROOT, 'data'), { recursive: true })
      writeFileSync(DATA_PATH, JSON.stringify(payload) + '\n')
      console.log(`[sync-bls] occ=${occCount} states=${states.length} cells=${cellCount} — written`)
    })
    .catch((err) => {
      console.error(`[sync-bls] failed: ${err.message}`)
      process.exit(1)
    })
    .finally(() => rmSync(TMP, { recursive: true, force: true }))
}

function pickStats(r) {
  return {
    emp: num(r.TOT_EMP),
    hMean: num(r.H_MEAN),
    aMean: num(r.A_MEAN),
    aP10: num(r.A_PCT10),
    aP25: num(r.A_PCT25),
    aP50: num(r.A_PCT50),
    aP75: num(r.A_PCT75),
    aP90: num(r.A_PCT90),
    lq: num(r.LOC_QUOTIENT),
  }
}

main()
