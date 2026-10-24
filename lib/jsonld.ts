/** JSON-LD 安全序列化(与模板站同一出口转义:堵存储型 XSS,内容进 <script type="application/ld+json"> 必经此处)。 */
export function jsonLdScript(payload: unknown): string {
  return JSON.stringify(payload)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

/** BreadcrumbList 面包屑;最后一项只给 name 不给 item(Google 允许且推荐)。 */
export function breadcrumbLd(items: Array<{ name: string; url?: string }>): string {
  return jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      ...(it.url ? { item: it.url } : {}),
    })),
  })
}
