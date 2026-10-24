import type { MetadataRoute } from 'next'
import { BASE } from '@/lib/site'
import { allOccupations, allStates } from '@/lib/bls'

/** 全量 URL:静态页 + 职业全国页 ×N + 职业×州长尾页 ×N×states + 州页。
 *  数据在仓库里,BLS 年更后随部署重建。 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/occupations`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/states`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
  ]

  const occupationEntries: MetadataRoute.Sitemap = allOccupations().map((o) => ({
    url: `${BASE}/occupation/${o.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  const stateEntries: MetadataRoute.Sitemap = allStates().map((s) => ({
    url: `${BASE}/state/${s.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  }))

  const cellEntries: MetadataRoute.Sitemap = []
  for (const o of allOccupations()) {
    for (const s of allStates()) {
      cellEntries.push({
        url: `${BASE}/occupation/${o.slug}/${s.slug}`,
        lastModified: now,
        changeFrequency: 'yearly' as const,
        priority: 0.6,
      })
    }
  }

  return [...staticEntries, ...occupationEntries, ...stateEntries, ...cellEntries]
}
