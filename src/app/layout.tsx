import { QueryProvider } from "@/components/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const font = Noto_Sans_Thai({
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700"],
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
    <html lang="en" className={`${font.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ClerkProvider afterSignOutUrl="/sign-in">
          <QueryProvider>
            <TooltipProvider>{children}</TooltipProvider>
            <Toaster richColors />
          </QueryProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
