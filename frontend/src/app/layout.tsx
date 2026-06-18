import type { Metadata } from "next";
import { Instrument_Serif, Inter } from "next/font/google";
import { AppLayout } from "@/components/layout/AppLayout";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

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
  description:
    "Monitor backup metrics and failures from the latest stored data",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable}`}>
      <Analytics />
      <body className="app-shell">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <AppLayout>
          <main id="main-content" className="app-main">
            {children}
          </main>
        </AppLayout>
      </body>
    </html>
  );
}
