// src/app/layout.js
import "./globals.css";
import { JetBrains_Mono } from "next/font/google";
import TransitionShell from "@/components/TransitionShell";
import Navbar from "@/components/Navbar"; // ⬅️ tambahkan

const jetbrains = JetBrains_Mono({ subsets: ["latin"] });

export const metadata = {
  title: "MANAMONA",
  description: "TECH CRAFTER INDONESIA",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={jetbrains.className}>
        <TransitionShell>{children}</TransitionShell>
        {/* Navbar global, fixed & z-50 */}
        <Navbar />
      </body>
    </html>
  );
}
