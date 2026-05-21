import type { Metadata } from "next";
import "./globals.css";
import { AnalyticsTracker } from "../components/AnalyticsTracker";

export const metadata: Metadata = {
  metadataBase: new URL("https://lens.ardabot.ai"),
  title: {
    default: "LensUI",
    template: "%s | LensUI"
  },
  description: "Live AI-generated UI surfaces for agents that stream compact lightcode into a running client.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "LensUI",
    description: "Live AI-generated UI surfaces for agents that stream compact lightcode into a running client.",
    url: "https://lens.ardabot.ai",
    siteName: "LensUI",
    type: "website"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AnalyticsTracker />
        {children}
      </body>
    </html>
  );
}
