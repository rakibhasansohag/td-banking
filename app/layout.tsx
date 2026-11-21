export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "@fontsource-variable/inter";
import "@fontsource/ibm-plex-serif/400.css";
import "@fontsource/ibm-plex-serif/700.css";
import "./globals.css";
import { Toaster } from "sonner";

const fontVariables: CSSProperties & Record<"--font-inter" | "--font-ibm-plex-serif", string> = {
  "--font-inter": '"Inter Variable", sans-serif',
  "--font-ibm-plex-serif": '"IBM Plex Serif", serif',
};

export const metadata: Metadata = {
  title: "TD-Banking",
  description: "TD-Banking is a simulated banking experience for exploring account and payment workflows.",
  icons: {
    icon: "/icons/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={fontVariables}>
        <Toaster position="top-center" expand={false} richColors />
        {children}
      </body>
    </html>
  );
}
