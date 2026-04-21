import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "ClearLedger AI",
  description: "Your money records. Finally clear.",
  metadataBase: new URL("https://clearledger.ai")
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}