import Link from 'next/link'
import type { Metadata } from 'next'
import { breadcrumbLd } from '@/lib/jsonld'
import { BASE } from '@/lib/site'
import { allStates, topOccupationsInState } from '@/lib/bls'

/** 州目录:全部州 + 各州就业量第一的职业作钩子。"average salary by state" 意图。 */
export const revalidate = 86400

export const metadata: Metadata = {
  title: 'All U.S. States — Salary and Occupation Data by State',
  description: 'Every state\'s BLS OES page: biggest occupations, average pay, and a salary page for each occupation in that state.',
  alternates: { canonical: '/states' },
}

export default function StatesPage() {
  const states = allStates()
  const breadcrumb = breadcrumbLd([
    { name: 'Home', url: `${BASE}/` },
    { name: 'States' },
  ])

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumb }} />

      <p className="text-[13px] font-semibold uppercase tracking-widest text-brand">Directory</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Browse by state</h1>
      <p className="mt-3 text-[15px] text-ink/65">
        {states.length} states and territories, each with its full occupation breakdown from BLS
        OES.
      </p>

      <ul className="mt-8 grid gap-2 sm:grid-cols-2">
        {states.map((s) => {
          const top = topOccupationsInState(s.code, 1)[0]
          return (
            <li key={s.code} className="rounded-lg border border-ink/10 bg-white px-4 py-3">
              <Link href={`/state/${s.slug}`} className="group">
                <span className="block text-[14.5px] font-semibold group-hover:text-brand">
                  {s.name}
                </span>
                {top ? (
                  <span className="mt-0.5 block text-[13px] text-ink/55">
                    Top job: {top.occ.title}
                  </span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
