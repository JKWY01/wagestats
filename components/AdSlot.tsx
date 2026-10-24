/** 广告位:未配置 NEXT_PUBLIC_ADSENSE_CLIENT 时整条链路不存在(零 DOM、零脚本)。
 *  配置后渲染 AdSense <ins> 并就地触发一次填充;脚本注入在 layout 完成。
 *  CSP 在 next.config.ts 同步条件放行 adsense 域(两处开关读同一个环境变量)。 */
export default function AdSlot({
  slot,
  label = 'Advertisement',
}: {
  slot: string
  label?: string
}) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT
  if (!client) return null
  return (
    <div className="my-8">
      <div className="mb-1 text-center text-[10px] uppercase tracking-widest text-ink/35">
        {label}
      </div>
      <ins
        className="adsbygoogle block"
        style={{ display: 'block' }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
      <script
        dangerouslySetInnerHTML={{ __html: '(adsbygoogle = window.adsbygoogle || []).push({});' }}
      />
    </div>
  )
}
