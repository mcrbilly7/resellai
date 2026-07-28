import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { AIChatWidget } from "@/components/AIChatWidget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Reseller Pro",
  description: "AI-powered product sourcing, valuation, inventory, and multi-marketplace selling platform.",
};

const themeInitScript = `
try {
  var stored = localStorage.getItem('theme');
  var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.classList.toggle('dark', theme === 'dark');
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="h-full antialiased font-sans">
        <ThemeProvider>
          <div className="flex h-full min-h-screen">
            <Sidebar />
            <div className="flex flex-1 flex-col min-w-0">
              <MobileNav />
              <main className="flex-1 min-w-0">{children}</main>
            </div>
          </div>
          <AIChatWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}
