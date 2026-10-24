# WageStats · BLS 薪资矩阵

**830 个职业 × 54 个州 = 36,149 个官方数据点**(BLS OES,May 2025 参考期),每个组合一页:州均值 vs 全国、百分位、就业量、区位商、州际排名。约 4.5 万个静态页,数据随仓库分发。

三个不掺假的事,与 AnswerToday / 火线榜同一套纪律:

- 所有数字来自 BLS 原表;BLS 抑制的口径('#'/'*')显示 "not published",绝不估算。
- 全国口径只取 BLS 全国文件,不用州数据加总伪造。
- BLS 对非浏览器出口一律 403,下载链:直连 BLS → Wayback Machine 原始字节快照(id_ 模式,字节与 BLS 相同,来源如实标注)。

## 站点结构

| 路径 | 内容 | SEO 角色 |
|---|---|---|
| `/occupation/[slug]/[state]` | 职业×州页 ×44,820:"X salary in California" | 长尾矩阵主力 |
| `/occupation/[slug]` | 职业全国页 ×830:均值/百分位 + 全州排行表 | "X salary" / "highest paying state for X" |
| `/state/[slug]` | 州页 ×54:该州最大职业排行 | "average salary in X state" |
| `/occupations` · `/states` | A–Z 目录 | 内链枢纽 |
| `/api/occupation` | JSON(CORS 全开,可选 state 参数) | agent/MCP 数据口 |
| `/llms.txt` · `/sitemap.xml` · `/robots.txt` | AI 说明书 + ~45,900 URL + AI 爬虫白名单 | 分发层 |

## 数据流

```
bls.gov oesm25st.zip + oesm25nat.zip(直连 403 → Wayback id_ 快照)
  └─ scripts/sync-bls.mjs(GitHub Actions 周一 06:30 UTC + 手动)
       └─ data/bls-oes.json(~4.7MB,随仓库提交 → push 即部署)
            └─ 站点只读仓库内 JSON,渲染路径零外呼
```

- 2025 版表头:`O_GROUP`(旧 `OCC_GROUP`)、`A_MEDIAN`(旧 `A_PCT50`)——脚本按新表头解析。
- BLS 年更(约次年 3-4 月发布);周频检查,数据无变化不提交。
- 升级到新参考期只需在 `RELEASES` 数组头部加一行。

## 本地跑起来

```bash
npm install
cp .env.example .env.local   # NEXT_PUBLIC_SITE_URL 部署时填
npm run dev
```

## 部署

1. GitHub 建仓推送(Vercel 导入,零配置);Next 16 + 纯静态,~45k 页构建数分钟。
2. Actions secrets:`SITE_URL`(体检/IndexNow 用)。
3. 广告:AdSense 过审后配 `NEXT_PUBLIC_ADSENSE_CLIENT`,5 个广告位即刻激活(未配置 = 零广告痕迹)。

## 已知限制,如实说

- OES 是年度快照调查,不是实时薪酬;页面明示参考期。
- 都会区(metro)粒度在州级矩阵验证流量后再加(数据包 `oesm{YY}ma.zip` 同源可取)。
- Wayback 快照可能略滞后于 BLS 官网更新;数据本体与 BLS 发布字节一致。
