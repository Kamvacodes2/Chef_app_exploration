import type { Metadata } from "next";
import { Inter, Playfair_Display, Sora } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

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
  description: "Cinematic hero experience for ChefMate meal discovery.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable} ${sora.variable}`}>
      <body>{children}</body>
    </html>
  );
}
