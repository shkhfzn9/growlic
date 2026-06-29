import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ReduxProvider, PwaProvider } from "@/components/providers";
import { PwaInstallBanner } from "@/components/ui";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Growlic - Digital Menu & Analytics",
  description: "Smart digital menu for restaurants with advanced analytics",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Growlic",
  },
};

export const viewport: Viewport = {
  themeColor: "#C0181A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ReduxProvider>
          <PwaProvider>
            {children}
            <PwaInstallBanner />
          </PwaProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
