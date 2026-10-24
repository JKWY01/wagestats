import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import AdSlot from '@/components/AdSlot'
import { breadcrumbLd } from '@/lib/jsonld'
import { BASE, emp, money } from '@/lib/site'
import { allStates, stateBySlug, topOccupationsInState } from '@/lib/bls'

/** 州页:"average salary in California" / "highest paying jobs in Texas" 意图。 */
export const revalidate = 86400

export function generateStaticParams() {
  return allStates().map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const st = stateBySlug(slug)
  if (!st) return {}
  return {
    title: `Salaries in ${st.name} — Biggest Occupations and Average Pay`,
    description: `Occupation salaries in ${st.name} from BLS OES: the largest occupations with employment and average annual pay, each linking to a full ${st.name} salary page.`,
    alternates: { canonical: `/state/${st.slug}` },
  }
}

export default async function StatePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const st = stateBySlug(slug)
  if (!st) notFound()
  const top = topOccupationsInState(st.code, 60)

  const breadcrumb = breadcrumbLd([
    { name: 'Home', url: `${BASE}/` },
    { name: 'States', url: `${BASE}/states` },
    { name: st.name },
  ])

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumb }} />

      <p className="text-[13px] font-semibold uppercase tracking-widest text-brand">
        {st.name} · BLS OES May 2025
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
        Salaries in {st.name}
      </h1>
      <p className="mt-3 text-[15px] text-ink/65">
        The largest occupations in {st.name} with official BLS employment and average annual wage.
        Every row links to a dedicated {st.name} salary page.
      </p>

      <AdSlot slot="state-top" />

      <div className="mt-6 overflow-x-auto rounded-xl border border-ink/10 bg-white">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="border-b border-ink/10 text-left text-[12px] uppercase tracking-wider text-ink/45">
              <th className="px-4 py-2.5">Occupation</th>
              <th className="px-4 py-2.5 text-right">Jobs</th>
              <th className="px-4 py-2.5 text-right">Avg / yr</th>
            </tr>
          </thead>
          <tbody>
            {top.map(({ occ, stats }) => (
              <tr key={occ.soc} className="border-b border-ink/5 last:border-0">
                <td className="px-4 py-2">
                  <Link
                    href={`/occupation/${occ.slug}/${st.slug}`}
                    className="font-medium hover:text-brand"
                  >
                    {occ.title} salary in {st.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-right text-ink/70">{emp(stats.emp)}</td>
                <td className="px-4 py-2 text-right font-semibold">{money(stats.aMean)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AdSlot slot="state-bottom" />

      <nav className="mt-8">
        <Link
          href="/occupations"
          className="rounded-lg bg-ink px-4 py-2 text-[14px] font-semibold text-white hover:bg-ink/85"
        >
          Browse all occupations →
        </Link>
      </nav>
    </div>
  )
}
