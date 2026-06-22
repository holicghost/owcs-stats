import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZANSIDE 데이터 분석 — OWCS KOREA Stage 2",
  description: "ZANSIDE 코칭스태프 내부 전략·전술 대시보드",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
