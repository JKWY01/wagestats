import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import AdSlot from '@/components/AdSlot'
import { jsonLdScript, breadcrumbLd } from '@/lib/jsonld'
import { BASE, emp, hourly, money } from '@/lib/site'
import { allOccupations, nationalStats, occupationBySlug, occupationRanking } from '@/lib/bls'

/** 职业全国页:"X salary" / "average X salary in the US" / "highest paying state for X"。 */
export const revalidate = 86400

export function generateStaticParams() {
  return allOccupations().map((o) => ({ slug: o.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const occ = occupationBySlug(slug)
  if (!occ) return {}
  const nat = nationalStats(occ.soc)
  return {
    title: `${occ.title} Salary — Average Pay by State (${new Date().getFullYear()})`,
    description: nat?.aMean != null
      ? `The average ${occ.title.toLowerCase()} salary in the U.S. is ${money(nat.aMean)} per year${nat.hMean != null ? ` (${hourly(nat.hMean)}/hour)` : ''}. See how all ${occupationRanking(occ.soc).length} states compare, with percentile ranges and employment.`
      : `Average ${occ.title.toLowerCase()} pay in every U.S. state, from official BLS data: annual and hourly wages, percentiles, employment, and state rankings.`,
    alternates: { canonical: `/occupation/${occ.slug}` },
  }
}

export default async function OccupationPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const occ = occupationBySlug(slug)
  if (!occ) notFound()
  const nat = nationalStats(occ.soc)
  const ranking = occupationRanking(occ.soc)

  const top = ranking[0]
  const faqLd = jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      ...(nat?.aMean != null
        ? [
            {
              '@type': 'Question',
              name: `What is the average ${occ.title.toLowerCase()} salary in the U.S.?`,
              acceptedAnswer: {
                '@type': 'Answer',
                text: `According to BLS OES (May 2025 reference period), the mean annual wage for ${occ.title.toLowerCase()} in the United States is ${money(nat.aMean)}${nat.hMean != null ? `, or ${hourly(nat.hMean)} per hour` : ''}. The median (50th percentile) is ${money(nat.aP50)}.`,
              },
            },
          ]
        : []),
      ...(top
        ? [
            {
              '@type': 'Question',
              name: `Which state pays ${occ.title.toLowerCase()} the most?`,
              acceptedAnswer: {
                '@type': 'Answer',
                text: `${top.state.name} has the highest average ${occ.title.toLowerCase()} salary at ${money(top.stats.aMean)} per year (BLS OES, May 2025).`,
              },
            },
          ]
        : []),
      ...(nat?.emp != null
        ? [
            {
              '@type': 'Question',
              name: `How many ${occ.title.toLowerCase()} jobs are there in the U.S.?`,
              acceptedAnswer: {
                '@type': 'Answer',
                text: `BLS OES estimates ${emp(nat.emp)} people employed as ${occ.title.toLowerCase()} nationwide (SOC ${occ.soc}).`,
              },
            },
          ]
        : []),
    ],
  })

  const breadcrumb = breadcrumbLd([
    { name: 'Home', url: `${BASE}/` },
    { name: 'Occupations', url: `${BASE}/occupations` },
    { name: occ.title },
  ])

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumb }} />

      <p className="text-[13px] font-semibold uppercase tracking-widest text-brand">
        Occupation · SOC {occ.soc}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
        {occ.title} salary by state
      </h1>

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-ink/10 bg-white p-5">
          <div className="text-[12px] font-medium uppercase tracking-wider text-ink/45">
            U.S. average (mean)
          </div>
          <div className="mt-1 text-2xl font-bold">{money(nat?.aMean ?? null)}/yr</div>
          <div className="mt-1 text-[13px] text-ink/55">
            {nat?.hMean != null ? `${hourly(nat.hMean)}/hour · ` : ''}
            median {money(nat?.aP50 ?? null)}
          </div>
        </div>
        <div className="rounded-xl border border-ink/10 bg-white p-5">
          <div className="text-[12px] font-medium uppercase tracking-wider text-ink/45">
            U.S. employment
          </div>
          <div className="mt-1 text-2xl font-bold">{emp(nat?.emp ?? null)}</div>
          <div className="mt-1 text-[13px] text-ink/55">jobs, BLS OES May 2025</div>
        </div>
      </section>

      {nat && nat.aP10 != null ? (
        <section className="mt-6 rounded-xl border border-ink/10 bg-white p-5">
          <h2 className="text-[15px] font-semibold">Annual wage percentiles (U.S.)</h2>
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
                <div className="mt-0.5 font-semibold">{money(nat[key])}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-ink/50">
            The 50th percentile is the median — half of workers earn more, half less.
          </p>
        </section>
      ) : null}

      <AdSlot slot="occupation-below-summary" />

      <section className="mt-8">
        <h2 className="text-lg font-semibold tracking-tight">
          {occ.title} pay in all {ranking.length} published states
        </h2>
        <p className="mt-1 text-[13px] text-ink/55">
          Ranked by mean annual wage. Each row links to the full state page.
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-ink/10 bg-white">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="border-b border-ink/10 text-left text-[12px] uppercase tracking-wider text-ink/45">
                <th className="px-4 py-2.5">#</th>
                <th className="px-4 py-2.5">State</th>
                <th className="px-4 py-2.5 text-right">Avg / yr</th>
                <th className="px-4 py-2.5 text-right">Median</th>
                <th className="hidden px-4 py-2.5 text-right sm:table-cell">Jobs</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r) => (
                <tr key={r.state.code} className="border-b border-ink/5 last:border-0">
                  <td className="px-4 py-2 text-ink/45">{r.rank}</td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/occupation/${occ.slug}/${r.state.slug}`}
                      className="font-medium hover:text-brand"
                    >
                      {occ.title} salary in {r.state.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-right font-semibold">{money(r.stats.aMean)}</td>
                  <td className="px-4 py-2 text-right text-ink/70">{money(r.stats.aP50)}</td>
                  <td className="hidden px-4 py-2 text-right text-ink/70 sm:table-cell">
                    {emp(r.stats.emp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
