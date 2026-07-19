import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/og.png`;
  return {
    title: "소리결 — 민요 창작 학습실",
    description: "민요를 듣고, 음악 요소를 익히고, 나만의 가사와 음악으로 창작하는 중학교 음악 학습도구",
    openGraph: { title: "소리결", description: "민요를 듣고, 바꾸고, 나답게 창작하다", images: [image] },
    twitter: { card: "summary_large_image", title: "소리결", description: "민요를 듣고, 바꾸고, 나답게 창작하다", images: [image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
