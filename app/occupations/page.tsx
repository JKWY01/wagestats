import Link from 'next/link'
import type { Metadata } from 'next'
import AdSlot from '@/components/AdSlot'
import { breadcrumbLd } from '@/lib/jsonld'
import { BASE, money } from '@/lib/site'
import { allOccupations, nationalStats } from '@/lib/bls'

/** 职业目录:全部职业按首字母分组。"list of occupations and salaries" 意图 + 内链枢纽。 */
export const revalidate = 86400

export const metadata: Metadata = {
  title: 'All Occupations A–Z — Salary Data for Every BLS Occupation',
  description: 'Browse every occupation in the BLS Occupational Employment and Wage Statistics: average U.S. pay, employment, and state-by-state salary pages for each.',
  alternates: { canonical: '/occupations' },
}

export default function OccupationsPage() {
  const groups = new Map<string, typeof occs>()
  const occs = allOccupations()
  for (const o of occs) {
    const letter = o.title[0].toUpperCase()
    const list = groups.get(letter) ?? []
    list.push(o)
    groups.set(letter, list)
  }
  const letters = [...groups.keys()].sort()

  const breadcrumb = breadcrumbLd([
    { name: 'Home', url: `${BASE}/` },
    { name: 'Occupations' },
  ])

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumb }} />

      <p className="text-[13px] font-semibold uppercase tracking-widest text-brand">Directory</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
        All occupations, A–Z
      </h1>
      <p className="mt-3 text-[15px] text-ink/65">
        {occs.length} occupations from the BLS OES survey, each with a national salary page and a
        per-state page in every state where data is published.
      </p>

      <AdSlot slot="occupations-top" />

      <nav className="mt-6 flex flex-wrap gap-2">
        {letters.map((l) => (
          <a
            key={l}
            href={`#letter-${l}`}
            className="rounded-lg border border-ink/12 bg-white px-3 py-1.5 text-[13.5px] font-semibold hover:border-ink/40"
          >
            {l}
          </a>
        ))}
      </nav>

      {letters.map((l) => (
        <section key={l} className="mt-8">
          <h2 id={`letter-${l}`} className="text-lg font-semibold tracking-tight">
            {l}
          </h2>
          <ul className="mt-3 grid gap-x-6 gap-y-1 text-[14px] sm:grid-cols-2">
            {groups.get(l)!.map((o) => {
              const nat = nationalStats(o.soc)
              return (
                <li key={o.soc} className="flex items-baseline justify-between gap-3 border-b border-ink/5 py-1.5">
                  <Link href={`/occupation/${o.slug}`} className="truncate font-medium hover:text-brand">
                    {o.title}
                  </Link>
                  <span className="shrink-0 text-[12.5px] text-ink/50">
                    {nat?.aMean != null ? `${money(nat.aMean)}/yr` : ''}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
