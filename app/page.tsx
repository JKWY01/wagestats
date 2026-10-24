import Link from 'next/link'
import type { Metadata } from 'next'
import AdSlot from '@/components/AdSlot'
import { jsonLdScript } from '@/lib/jsonld'
import { BASE, SITE_NAME, money } from '@/lib/site'
import { allStates, meta, topOccupationsNationally } from '@/lib/bls'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Salary by Occupation and State — Official BLS Data',
  description: `Average salaries for hundreds of occupations in every U.S. state, straight from the Bureau of Labor Statistics. One page per occupation per state, with percentiles, employment, and state rankings.`,
  alternates: { canonical: '/' },
}

export default function Home() {
  const m = meta()
  const top = topOccupationsNationally(24)
  const states = allStates()

  const siteLd = jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: `${BASE}/`,
    description: 'Salaries by occupation and state from official BLS data.',
  })

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: siteLd }} />

      <p className="text-[13px] font-semibold uppercase tracking-widest text-brand">
        {m.occupations.toLocaleString('en-US')} occupations · {m.states} states
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
        Salaries by occupation and state
      </h1>
      <p className="mt-3 text-[15px] text-ink/65">
        Every number on this site comes from the U.S. Bureau of Labor Statistics&rsquo; official
        Occupational Employment and Wage Statistics ({m.release} reference period). Average pay,
        hourly wages, percentile ranges, employment counts, and where each job pays most —{' '}
        {m.cells.toLocaleString('en-US')} data points, one honest page per occupation per state.
      </p>

      <AdSlot slot="home-top" />

      <section className="mt-8">
        <h2 className="text-lg font-semibold tracking-tight">Most common occupations</h2>
        <p className="mt-1 text-[13px] text-ink/55">By national employment, from BLS OES.</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {top.map(({ occ, stats }) => (
            <li key={occ.soc} className="rounded-lg border border-ink/10 bg-white px-4 py-3">
              <Link href={`/occupation/${occ.slug}`} className="group">
                <span className="block text-[14.5px] font-semibold group-hover:text-brand">
                  {occ.title}
                </span>
                <span className="mt-0.5 block text-[13px] text-ink/55">
                  {stats.emp?.toLocaleString('en-US')} jobs · avg {money(stats.aMean)}/yr
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/occupations"
          className="mt-4 inline-block rounded-lg bg-ink px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-ink/85"
        >
          Browse all {m.occupations.toLocaleString('en-US')} occupations →
        </Link>
      </section>

      <AdSlot slot="home-middle" />

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">Browse by state</h2>
        <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[14px] sm:grid-cols-3">
          {states.map((s) => (
            <li key={s.code}>
              <Link href={`/state/${s.slug}`} className="font-medium hover:text-brand">
                {s.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
