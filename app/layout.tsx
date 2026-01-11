import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trade Control",
  description: "Business management for Australian tradespeople",
  icons: {
    icon: "/icon.ico",
  },
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
