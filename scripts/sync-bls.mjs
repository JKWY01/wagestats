#!/usr/bin/env node
/**
 * BLS OES(职业就业与工资统计)数据同步。
 *
 *   源  U.S. Bureau of Labor Statistics — Occupational Employment and Wage Statistics
 *        州级包 oesm{YY}st.zip(单个合并工作簿 state_M{YYYY}_dl.xlsx,全部州)+ 全国包 oesm{YY}nat.zip。
 *        BLS 对非浏览器/数据中心出口一律 403,故下载链为:直连 BLS → Wayback Machine 原始字节快照
 *        (web.archive.org 的 id_ 模式返回与 BLS 完全相同的字节,来源如实标注)。
 *
 *   纪律  数字要么来自 BLS 原表,要么缺失(null),绝不推算/编造。
 *        '#'(超高工资抑制)与 '*'(低样本)标记存 null,页面显示 "not published"。
 *        全国口径只取 BLS 全国文件,不用州数据加总伪造。
 *
 * 运行:`node scripts/sync-bls.mjs`。幂等:数据本体无变化不写文件。
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// xlsx 是 CJS 包,node ESM 下命名空间导入拿不到具名导出,走 createRequire 最稳
const XLSX = createRequire(import.meta.url)('xlsx')

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_PATH = join(ROOT, 'data', 'bls-oes.json')
const TMP = join(ROOT, '.bls-tmp')

const RELEASES = [
  { release: 'May 2025', yy: '25' },
  { release: 'May 2024', yy: '24' },
]

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

/** 下载一个 BLS zip(直连 + Wayback 兜底),返回解压出的 xlsx 路径。 */
async function fetchWorkbook(kind /* 'st' | 'nat' */) {
  for (const { release, yy } of RELEASES) {
    const file = `oesm${yy}${kind}.zip`
    for (const url of [
      `https://www.bls.gov/oes/special-requests/${file}`,
      `https://web.archive.org/web/2026id_/https://www.bls.gov/oes/special-requests/${file}`,
    ]) {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': UA, Accept: '*/*', Referer: 'https://www.bls.gov/oes/' },
          redirect: 'follow',
          signal: AbortSignal.timeout(240_000),
        })
        if (!res.ok) {
          console.log(`[sync-bls] ${url} → HTTP ${res.status}`)
          continue
        }
        const buf = Buffer.from(await res.arrayBuffer())
        if (buf.length < 50_000 || !buf.subarray(0, 2).equals(Buffer.from('PK'))) {
          console.log(`[sync-bls] ${url} → not a zip (${buf.length}B)`)
          continue
        }
        const zipPath = join(TMP, file)
        writeFileSync(zipPath, buf)
        execFileSync('unzip', ['-o', zipPath, '-d', join(TMP, kind)], { stdio: 'pipe' })
        const xlsxPath = execFileSync('find', [join(TMP, kind), '-name', '*.xlsx'], { encoding: 'utf8' })
          .split('\n')
          .map((f) => f.trim())
          .filter(Boolean)[0]
        if (!xlsxPath) throw new Error(`${file}: no xlsx inside`)
        console.log(`[sync-bls] ${file} OK (${(buf.length / 1e6).toFixed(1)}MB, ${release})`)
        return { xlsxPath, release }
      } catch (err) {
        console.log(`[sync-bls] ${url} → ${err.message}`)
      }
    }
  }
  throw new Error(`failed to fetch oesm??${kind}.zip (direct + Wayback)`)
}

/** '#'/'*' 等 BLS 标记 → null。 */
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

function pickStats(r) {
  return {
    emp: num(r.TOT_EMP),
    hMean: num(r.H_MEAN),
    aMean: num(r.A_MEAN),
    aP10: num(r.A_PCT10),
    aP25: num(r.A_PCT25),
    aP50: num(r.A_MEDIAN),
    aP75: num(r.A_PCT75),
    aP90: num(r.A_PCT90),
    lq: num(r.LOC_QUOTIENT),
  }
}

function readRows(xlsxPath) {
  const wb = XLSX.readFile(xlsxPath, { cellDates: false })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(sheet, { defval: null })
}

async function main() {
  mkdirSync(TMP, { recursive: true })

  const stateWb = await fetchWorkbook('st')
  const natWb = await fetchWorkbook('nat')
  if (stateWb.release !== natWb.release) {
    throw new Error(`release mismatch: state=${stateWb.release} nat=${natWb.release}`)
  }

  const states = []
  const stateByName = new Map()
  const occupations = []
  const occBySoc = new Map()
  const national = {}
  const cells = {}

  function ensureOcc(soc, title) {
    if (!occBySoc.has(soc)) {
      const occ = { soc, slug: slugify(title), title: String(title).trim() }
      occBySoc.set(soc, occ)
      occupations.push(occ)
    }
    return occBySoc.get(soc)
  }

  // 全国文件:O_GROUP=detailed 的行即全国口径
  for (const r of readRows(natWb.xlsxPath)) {
    const soc = String(r.OCC_CODE ?? '').trim()
    if (String(r.O_GROUP ?? '').trim() !== 'detailed' || !soc.includes('-')) continue
    ensureOcc(soc, r.OCC_TITLE)
    national[soc] = pickStats(r)
  }

  // 州文件:AREA 两位 FIPS 的行即州口径(排除都会区/非都会区行)
  for (const r of readRows(stateWb.xlsxPath)) {
    const soc = String(r.OCC_CODE ?? '').trim()
    if (String(r.O_GROUP ?? '').trim() !== 'detailed' || !soc.includes('-')) continue
    const area = String(r.AREA_TITLE ?? '').trim()
    const areaCode = String(r.AREA ?? '').trim()
    if (US_NAMES.has(area) || !/^\d{2}$/.test(areaCode)) continue
    ensureOcc(soc, r.OCC_TITLE)

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
  }

  let cellCount = 0
  for (const code of Object.keys(cells)) cellCount += Object.keys(cells[code]).length
  const natCount = Object.keys(national).length
  if (occupations.length < 500 || states.length < 50 || cellCount < 10_000 || natCount < 500) {
    const natSample = readRows(natWb.xlsxPath)[0] ?? {}
    const stSample = readRows(stateWb.xlsxPath)[0] ?? {}
    throw new Error(
      `parse sanity failed: occ=${occupations.length} states=${states.length} cells=${cellCount} nat=${natCount}\n` +
        `nat headers: ${JSON.stringify(Object.keys(natSample))}\n` +
        `nat row0: ${JSON.stringify(natSample).slice(0, 400)}\n` +
        `state headers: ${JSON.stringify(Object.keys(stSample))}\n` +
        `state row0: ${JSON.stringify(stSample).slice(0, 400)}`,
    )
  }
  const slugs = new Map()
  for (const o of occupations) {
    if (slugs.has(o.slug)) throw new Error(`occupation slug collision: ${o.slug} (${o.soc} vs ${slugs.get(o.slug)})`)
    slugs.set(o.slug, o.soc)
  }

  const payload = {
    meta: {
      source: 'U.S. Bureau of Labor Statistics — Occupational Employment and Wage Statistics',
      release: stateWb.release,
      fetched_at: new Date().toISOString(),
      occupations: occupations.length,
      states: states.length,
      cells: cellCount,
    },
    states: states.sort((a, b) => a.name.localeCompare(b.name)),
    occupations: occupations.sort((a, b) => a.title.localeCompare(b.title)),
    national,
    cells,
  }

  const prev = existsSync(DATA_PATH) ? JSON.parse(readFileSync(DATA_PATH, 'utf8')) : null
  const sameData =
    prev &&
    JSON.stringify(prev.states) === JSON.stringify(payload.states) &&
    JSON.stringify(prev.occupations) === JSON.stringify(payload.occupations) &&
    JSON.stringify(prev.national) === JSON.stringify(payload.national) &&
    JSON.stringify(prev.cells) === JSON.stringify(payload.cells)
  if (sameData) {
    console.log(`[sync-bls] occ=${occupations.length} states=${states.length} cells=${cellCount} — no change, skip write`)
    return
  }

  mkdirSync(join(ROOT, 'data'), { recursive: true })
  writeFileSync(DATA_PATH, JSON.stringify(payload) + '\n')
  console.log(`[sync-bls] occ=${occupations.length} states=${states.length} cells=${cellCount} — written`)
}

main()
  .catch((err) => {
    console.error(`[sync-bls] failed: ${err.message}`)
    process.exitCode = 1
  })
  .finally(() => rmSync(TMP, { recursive: true, force: true }))
