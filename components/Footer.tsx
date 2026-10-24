import Link from 'next/link'
import { DATA_SOURCE } from '@/lib/site'
import { meta } from '@/lib/bls'

export default function Footer() {
  const m = meta()
  return (
    <footer className="border-t border-ink/10 bg-white">
      <div className="mx-auto w-full max-w-4xl px-5 py-8 text-[13px] leading-relaxed text-ink/55">
        <p>
          All wage and employment figures come from the{' '}
          <a
            href="https://www.bls.gov/oes/"
            className="underline decoration-ink/30 underline-offset-2 hover:text-ink"
            rel="noopener noreferrer"
            target="_blank"
          >
            {DATA_SOURCE}
          </a>
          , a U.S. federal government product in the public domain. {m.occupations} occupations ×{' '}
          {m.states} states = {m.cells.toLocaleString('en-US')} data points. Where BLS withholds a
          figure (confidentiality suppression), we show &ldquo;not published&rdquo; — never a guess.
        </p>
        <p className="mt-3">
          OES estimates are snapshot surveys, updated roughly once a year — not real-time payroll
          data.
        </p>
        <p className="mt-3">
          <Link href="/sitemap.xml" className="underline decoration-ink/30 underline-offset-2 hover:text-ink">
            Sitemap
          </Link>{' '}
          ·{' '}
          <Link href="/llms.txt" className="underline decoration-ink/30 underline-offset-2 hover:text-ink">
            llms.txt
          </Link>{' '}
          ·{' '}
          <Link href="/api/occupation" className="underline decoration-ink/30 underline-offset-2 hover:text-ink">
            JSON API
          </Link>
        </p>
      </div>
    </footer>
  )
}
