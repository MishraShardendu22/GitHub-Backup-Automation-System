import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import Header from "@/components/layout/header";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Backup Observatory",
  description: "Monitor backup metrics and failures from the latest stored data",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable}`}>
      <Analytics/>
      <body className="app-shell">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <Header />
        <main id="main-content" className="app-main">
          {children}
        </main>
      </body>
    </html>
  );
}
