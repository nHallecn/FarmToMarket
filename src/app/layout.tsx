import type { Metadata, Viewport } from "next";
import { AppProvider } from "@/components/providers/app-provider";
import { PwaRegister } from "@/components/providers/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://farmtomarket.cm"),
  title: {
    default: "FarmToMarket Cameroon",
    template: "%s | FarmToMarket",
  },
  description:
    "Verified farm supply, consolidated B2B orders, and dependable delivery across Cameroon.",
  applicationName: "FarmToMarket",
  keywords: [
    "Cameroon agriculture",
    "B2B marketplace",
    "farm produce",
    "agricultural logistics",
  ],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icon-192.png",
  },
  openGraph: {
    title: "FarmToMarket Cameroon",
    description: "From verified farms to ready kitchens, in one reliable flow.",
    type: "website",
    locale: "en_CM",
    siteName: "FarmToMarket",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#173f32",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <a
          href="#main-content"
          className="fixed left-4 top-3 z-[100] -translate-y-20 rounded-full bg-[var(--lime)] px-4 py-2 font-bold text-[var(--forest)] shadow-lg transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>
        <AppProvider>
          {children}
          <PwaRegister />
        </AppProvider>
      </body>
    </html>
  );
}
