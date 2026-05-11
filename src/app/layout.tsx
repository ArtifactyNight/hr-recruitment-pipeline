import { QueryProvider } from "@/components/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { Anuphan, Geist_Mono } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

const mono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const font = Anuphan({
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "H+ | Recruitment Pipeline Tools",
  description: "H+ | Recruitment Pipeline Tools",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        font.className,
        mono.variable,
        "font-sans",
        font.variable,
      )}
    >
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          <NextTopLoader />
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster richColors />
        </QueryProvider>
      </body>
    </html>
  );
}
