import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "모닝브리프",
  description: "매일 아침 뉴스 & 공고 대시보드",
  openGraph: {
    title: "🤖 모닝브리프",
    description: "매일 아침 최신 뉴스와 사업공고를 한눈에",
    images: [{ url: "/og.png", width: 1456, height: 816 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "🤖 모닝브리프",
    description: "매일 아침 최신 뉴스와 사업공고를 한눈에",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
