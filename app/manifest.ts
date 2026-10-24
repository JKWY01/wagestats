import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WageStats — Salaries by Occupation and State (BLS)',
    short_name: 'WageStats',
    description: 'Official BLS salary data for every occupation in every U.S. state.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f8fa',
    theme_color: '#3748c4',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  }
}
