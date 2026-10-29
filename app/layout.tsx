import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Listening Room",
  description: "An audio-reactive 1-bit shader room.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}