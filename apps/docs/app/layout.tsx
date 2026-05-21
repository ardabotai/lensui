import type { Metadata } from "next";
import "./globals.css";
import { AnalyticsTracker } from "../components/AnalyticsTracker";

export const metadata: Metadata = {
  title: {
    default: "LensUI",
    template: "%s | LensUI"
  },
  description: "Live AI-generated UI surfaces for agents that stream compact lightcode into a running client."
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
