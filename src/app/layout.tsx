import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Jelajah Minat — Eksplorasi Minat Karier", template: "%s · Jelajah Minat" },
  description: "Kuis singkat untuk mengenali ketertarikan awalmu pada bidang pekerjaan IT dan kreatif.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#f8f5ef", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${jakarta.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <a href="#konten" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:shadow">
          Lewati ke konten
        </a>
        {children}
      </body>
    </html>
  );
}
