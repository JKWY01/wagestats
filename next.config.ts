import type { NextConfig } from "next";

// 广告开关与 CSP 同源:只有配置了 NEXT_PUBLIC_ADSENSE_CLIENT(构建时)才放行 AdSense 域,
// 与 components/AdSlot / layout 的脚本注入读同一个变量——未配置时零广告痕迹、CSP 不开门。
const ADSENSE_ON = Boolean(process.env.NEXT_PUBLIC_ADSENSE_CLIENT);

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${ADSENSE_ON ? " https://pagead2.googlesyndication.com" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data:",
  `connect-src 'self'${ADSENSE_ON ? " https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net" : ""}`,
  `frame-src 'self'${ADSENSE_ON ? " https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://pagead2.googlesyndication.com" : ""}`,
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // 不开 cacheComponents:今日页需要在 ISR 再渲染时读当前 ET 日期(new Date()),
  // cacheComponents 语义下渲染期不稳定时间会污染构建(模板站踩过);
  // 经典 ISR(revalidate)对本站的数据形态(仓库内 JSON)完全够用。
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
