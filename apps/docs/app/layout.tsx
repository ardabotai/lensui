import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "LensUI Framework",
    template: "%s | LensUI"
  },
  description: "Token-efficient generative UI runtime for agent-rendered interfaces."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
