import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SubHub - AI Subtitle Translator",
  description: "Translate SRT subtitles seamlessly using Google Gemini AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning එකතු කිරීමෙන් Browser Extensions නිසා එන Warnings ඉවත් වේ
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen flex flex-col`}
      >
        <Providers>
          <Navbar />
          <div className="flex-1">
            {children}
            <Toaster theme="dark" position="top-right" richColors />
          </div>
        </Providers>
      </body>
    </html>
  );
}
