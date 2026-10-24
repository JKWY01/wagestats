import type { MetadataRoute } from 'next'
import { BASE } from '@/lib/site'

/** AI 爬虫点名欢迎段:公开联邦数据,被引用就是分发。 */
const AI_AGENTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'Amazonbot',
  'Bytespider',
  'Meta-ExternalAgent',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      ...AI_AGENTS.map((agent) => ({ userAgent: agent, allow: '/' })),
    ],
    sitemap: `${BASE}/sitemap.xml`,
  }
}
