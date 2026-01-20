import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trade Control",
  description: "Trade business management platform for Australian trade businesses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
