import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Brand wordmark font. Satoshi (the ideal match) and General Sans have no
// local font files in this repo/Assets, so we fall back to Sora at weight
// 800 — the closest freely-licensed geometric sans (circular "e", round "c",
// large x-height, soft corners). Used ONLY for the "Chill Chef" wordmark,
// never for headings/body copy.
const sora = Sora({
  subsets: ["latin"],
  weight: ["800"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ChefMate",
  description:
    'ChefMate answers the daily question, "What are we doing for dinner?" with affordable, trusted chefs who cook fresh meals in your home.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <body>{children}</body>
    </html>
  );
}
