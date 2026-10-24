/** 站点身份与全局常量。域名未配置时用 localhost(本地开发),部署时必填 NEXT_PUBLIC_SITE_URL。 */
export const SITE_NAME = 'WageStats'
export const SITE_TAGLINE = 'Salaries by occupation and state, from official BLS data'
export const BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '')
export const DATA_SOURCE = 'U.S. Bureau of Labor Statistics, Occupational Employment and Wage Statistics (May 2025)'

export function money(n: number | null): string {
  if (n == null) return 'not published'
  return `$${Math.round(n).toLocaleString('en-US')}`
}

export function hourly(n: number | null): string {
  if (n == null) return 'not published'
  return `$${n.toFixed(2)}`
}

export function emp(n: number | null): string {
  if (n == null) return 'not published'
  return Math.round(n).toLocaleString('en-US')
}

/** 与全国的百分比差(有数据才算,否则 null)。 */
export function vsNational(stateMean: number | null, nationalMean: number | null): number | null {
  if (stateMean == null || nationalMean == null || nationalMean === 0) return null
  return ((stateMean - nationalMean) / nationalMean) * 100
}
