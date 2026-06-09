import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "PageKeep",
  description: "Railway-ready control plane for managed docs and portfolio sites.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
