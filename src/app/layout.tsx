import type { Metadata } from "next";
import { Instrument_Serif, Space_Grotesk } from "next/font/google";

import "@/app/globals.css";
import { cn } from "@/lib/utils";

const sans = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"]
});

const serif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400"
});

export const metadata: Metadata = {
  title: "ClearLedger AI",
  description: "Your money records. Finally clear.",
  metadataBase: new URL("https://clearledger.ai")
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(sans.variable, serif.variable, "font-[family-name:var(--font-sans)] antialiased")}>
        {children}
      </body>
    </html>
  );
}