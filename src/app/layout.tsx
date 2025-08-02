import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ErrorProvider } from "@/components/providers/ErrorProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BaikunthaPOS - ISKCON Temple POS System",
  description:
    "Modern Point of Sale system for ISKCON Asansol Temple Gift & Book Store",
  manifest: "/manifest.json",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#F97316",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorProvider>
          {children}
        </ErrorProvider>
      </body>
    </html>
  );
}
