import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL("https://card.ynscrm.online"),
  title: "YNS Card",
  description:
    "Professional digital business cards by YUVARAJ NETWORKS & SOLUTIONS.",
  openGraph: {
    siteName: "YNS Card",
    title: "YNS Card",
    description:
      "Professional digital business cards by YUVARAJ NETWORKS & SOLUTIONS.",
    url: "https://card.ynscrm.online",
    type: "website",
    images: [{ url: "/brand/yns-card-logo.jpeg", alt: "YNS Card" }],
  },
  twitter: {
    card: "summary",
    title: "YNS Card",
    description:
      "Professional digital business cards by YUVARAJ NETWORKS & SOLUTIONS.",
    images: ["/brand/yns-card-logo.jpeg"],
  },
};

export const viewport = {
  themeColor: "#061B36",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
