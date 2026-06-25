import type { Metadata } from "next";
<<<<<<< Updated upstream
import { Inter } from "next/font/google";
import "./globals.css";
import { ReduxProvider } from "@/redux/provider";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Growlic - Digital Menu & Analytics",
  description: "Smart digital menu for restaurants with advanced analytics",
=======
import { Libre_Caslon_Text, Work_Sans } from "next/font/google";
import "./globals.css";
import { ReduxProvider } from "@/redux/provider";

const libreCaslon = Libre_Caslon_Text({
  variable: "--font-caslon",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "QR Order System",
  description: "Gourmet Restaurant QR Ordering System",
>>>>>>> Stashed changes
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
<<<<<<< Updated upstream
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
=======
      className={`${libreCaslon.variable} ${workSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
        <script src="https://unpkg.com/@phosphor-icons/web" async></script>
      </head>
      <body className="min-h-full flex flex-col bg-gourmet-surface text-gourmet-on-surface" suppressHydrationWarning>
>>>>>>> Stashed changes
        <ReduxProvider>
          {children}
        </ReduxProvider>
      </body>
    </html>
  );
}
