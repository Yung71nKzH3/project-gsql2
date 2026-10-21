import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UrlBase — Zero-Backend Local-First Modular Database",
  description: "Zero-backend, local-first, modular relational database web application.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full antialiased font-sans"
    >
      <body suppressHydrationWarning className="h-full flex flex-col">{children}</body>
    </html>
  );
}
