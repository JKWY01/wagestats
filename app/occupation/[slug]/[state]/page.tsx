import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import AdSlot from '@/components/AdSlot'
import { jsonLdScript, breadcrumbLd } from '@/lib/jsonld'
import { BASE, emp, hourly, money, vsNational } from '@/lib/site'
import {
  allStates,
  nationalStats,
  occupationBySlug,
  occupationRanking,
  stateBySlug,
  stateStats,
  topOccupationsInState,
  topOccupationsNationally,
} from '@/lib/bls'

/** 长尾矩阵主力页:"X salary in California"。
 *  预渲染只做头部(全国就业量 Top 120 职业 × 全部州 ≈ 6.5k 页)——45k 全量在 Vercel 单 worker
 *  构建下 generateStaticParams 递归克隆会栈溢出,且新域名冷启动全量预渲染无意义;
 *  其余组合走 ISR 按需渲染 + 86400s 缓存,对访客与 SEO 等价。 */
export const revalidate = 86400
export const dynamicParams = true

const PRERENDER_TOP_OCCUPATIONS = 120

export function generateStaticParams() {
  const out: Array<{ slug: string; state: string }> = []
  for (const { occ } of topOccupationsNationally(PRERENDER_TOP_OCCUPATIONS)) {
    for (const st of allStates()) {
      out.push({ slug: occ.slug, state: st.slug })
    }
  }
  return out
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; state: string }>
}): Promise<Metadata> {
  const { slug, state } = await params
  const occ = occupationBySlug(slug)
  const st = stateBySlug(state)
  if (!occ || !st) return {}
  const stats = stateStats(st.code, occ.soc)
  const title = `${occ.title} Salary in ${st.name} — Average Pay (${new Date().getFullYear()})`
  return {
    title,
    description:
      stats?.aMean != null
        ? `The average ${occ.title.toLowerCase()} salary in ${st.name} is ${money(stats.aMean)} per year${stats.hMean != null ? ` (${hourly(stats.hMean)}/hour)` : ''}. See how ${st.name} compares to the U.S. average, its rank among states, percentiles, and job counts.`
        : `${occ.title} pay in ${st.name}: BLS OES figures where published, with state rank, percentile ranges, and employment. Where BLS withholds data we say so.`,
    alternates: { canonical: `/occupation/${occ.slug}/${st.slug}` },
  }
}

export default async function OccupationStatePage({
  params,
}: {
  params: Promise<{ slug: string; state: string }>
}) {
  const { slug, state } = await params
  const occ = occupationBySlug(slug)
  const st = stateBySlug(state)
  if (!occ || !st) notFound()

  const stats = stateStats(st.code, occ.soc)
  const nat = nationalStats(occ.soc)
  const ranking = occupationRanking(occ.soc)
  const rank = ranking.findIndex((r) => r.state.code === st.code)

  // 内链矩阵:排名相邻的州(上一名/下一名/同段两个)+ 该州热门职业
  const neighbors = rank > 0 ? [ranking[rank - 1]] : []
  if (rank >= 0 && rank < ranking.length - 1) neighbors.push(ranking[rank + 1])
  const topInState = topOccupationsInState(st.code, 8).filter((t) => t.occ.soc !== occ.soc)

  const diff = vsNational(stats?.aMean ?? null, nat?.aMean ?? null)

  const faqLd = jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      ...(stats?.aMean != null
        ? [
            {
              '@type': 'Question',
              name: `How much do ${occ.title.toLowerCase()} make in ${st.name}?`,
              acceptedAnswer: {
                '@type': 'Answer',
                text: `The mean annual wage for ${occ.title.toLowerCase()} in ${st.name} is ${money(stats.aMean)}${stats.hMean != null ? ` (${hourly(stats.hMean)}/hour)` : ''}, per BLS OES May 2025. The state median is ${money(stats.aP50)}.${diff != null ? ` That is ${Math.abs(diff).toFixed(0)}% ${diff >= 0 ? 'above' : 'below'} the U.S. average.` : ''}`,
              },
            },
          ]
        : []),
      ...(rank >= 0
        ? [
            {
              '@type': 'Question',
              name: `Is ${st.name} a high-paying state for ${occ.title.toLowerCase()}?`,
              acceptedAnswer: {
                '@type': 'Answer',
                text: `${st.name} ranks #${rank + 1} of ${ranking.length} published states by mean annual wage for ${occ.title.toLowerCase()}.`,
              },
            },
          ]
        : []),
      ...(stats?.emp != null
        ? [
            {
              '@type': 'Question',
              name: `How many ${occ.title.toLowerCase()} work in ${st.name}?`,
              acceptedAnswer: {
                '@type': 'Answer',
                text: `BLS OES estimates ${emp(stats.emp)} ${occ.title.toLowerCase()} jobs in ${st.name}${stats.lq != null ? ` (location quotient ${stats.lq.toFixed(2)} — ${stats.lq >= 1 ? 'more' : 'less'} concentrated than the U.S. overall)` : ''}.`,
              },
            },
          ]
        : []),
    ],
  })

  const breadcrumb = breadcrumbLd([
    { name: 'Home', url: `${BASE}/` },
    { name: occ.title, url: `${BASE}/occupation/${occ.slug}` },
    { name: st.name },
  ])

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumb }} />

      <p className="text-[13px] font-semibold uppercase tracking-widest text-brand">
        {occ.title} · {st.name} · BLS OES May 2025
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
        {occ.title} salary in {st.name}
      </h1>

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-ink/10 bg-white p-5">
          <div className="text-[12px] font-medium uppercase tracking-wider text-ink/45">
            Average (mean) in {st.name}
          </div>
          <div className="mt-1 text-2xl font-bold">{money(stats?.aMean ?? null)}/yr</div>
          <div className="mt-1 text-[13px] text-ink/55">
            {stats?.hMean != null ? `${hourly(stats.hMean)}/hour · ` : ''}median{' '}
            {money(stats?.aP50 ?? null)}
          </div>
        </div>
        <div className="rounded-xl border border-ink/10 bg-white p-5">
          <div className="text-[12px] font-medium uppercase tracking-wider text-ink/45">
            U.S. average · state rank
          </div>
          <div className="mt-1 text-2xl font-bold">{money(nat?.aMean ?? null)}/yr</div>
          <div className="mt-1 text-[13px] text-ink/55">
            {rank >= 0 ? `${st.name} ranks #${rank + 1} of ${ranking.length} states` : 'not ranked (wage not published)'}
            {diff != null ? ` · ${Math.abs(diff).toFixed(0)}% ${diff >= 0 ? 'above' : 'below'} U.S.` : ''}
          </div>
        </div>
      </section>

      {stats && stats.aP10 != null ? (
        <section className="mt-6 rounded-xl border border-ink/10 bg-white p-5">
          <h2 className="text-[15px] font-semibold">Annual wage percentiles in {st.name}</h2>
          <div className="mt-3 grid grid-cols-5 gap-2 text-center text-[13px]">
            {(
              [
                ['10th', 'aP10'],
                ['25th', 'aP25'],
                ['50th', 'aP50'],
                ['75th', 'aP75'],
                ['90th', 'aP90'],
              ] as const
            ).map(([label, key]) => (
              <div key={key} className="rounded-lg bg-background px-2 py-2.5">
                <div className="text-ink/45">{label}</div>
                <div className="mt-0.5 font-semibold">{money(stats[key])}</div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-[14px] text-amber-900">
          BLS does not publish a full wage distribution for {occ.title.toLowerCase()} in {st.name}{' '}
          (usually because the local sample is too small for confidentiality). We show what is
          published — never a guess.
        </div>
      )}

      <AdSlot slot="cell-below-percentiles" />

      <section className="mt-8 rounded-xl border border-ink/10 bg-white p-5">
        <h2 className="text-[15px] font-semibold">Employment in {st.name}</h2>
        <dl className="mt-3 grid gap-3 text-[14px] sm:grid-cols-2">
          <div>
            <dt className="text-ink/55">{occ.title} jobs in {st.name}</dt>
            <dd className="text-lg font-semibold">{emp(stats?.emp ?? null)}</dd>
          </div>
          <div>
            <dt className="text-ink/55">
              Concentration vs U.S. (location quotient)
            </dt>
            <dd className="text-lg font-semibold">
              {stats?.lq != null ? stats.lq.toFixed(2) : 'not published'}
            </dd>
          </div>
        </dl>
      </section>

      {neighbors.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold tracking-tight">Nearby in the rankings</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {neighbors.map((r) => (
              <li key={r.state.code} className="rounded-lg border border-ink/10 bg-white px-4 py-3">
                <Link href={`/occupation/${occ.slug}/${r.state.slug}`} className="hover:text-brand">
                  <span className="text-[14px] font-semibold">
                    #{r.rank} · {r.state.name}
                  </span>
                  <span className="ml-2 text-[13px] text-ink/55">{money(r.stats.aMean)}/yr</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <nav className="mt-8 flex flex-wrap gap-3 text-[14px]">
        <Link
          href={`/occupation/${occ.slug}`}
          className="rounded-lg bg-ink px-4 py-2 font-semibold text-white hover:bg-ink/85"
        >
          {occ.title} in all states →
        </Link>
        <Link
          href={`/state/${st.slug}`}
          className="rounded-lg border border-ink/15 px-4 py-2 font-semibold text-ink hover:border-ink/35"
        >
          All occupations in {st.name}
        </Link>
      </nav>

      {topInState.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight">Biggest occupations in {st.name}</h2>
          <ul className="mt-3 divide-y divide-ink/8 text-[14px]">
            {topInState.map(({ occ: o, stats: s }) => (
              <li key={o.soc} className="py-2">
                <Link
                  href={`/occupation/${o.slug}/${st.slug}`}
                  className="flex items-baseline justify-between gap-3 hover:text-brand"
                >
                  <span className="font-medium">{o.title}</span>
                  <span className="shrink-0 text-ink/55">
                    {emp(s.emp)} jobs · {money(s.aMean)}/yr
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
