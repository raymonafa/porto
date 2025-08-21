// src/app/layout.js
import "./globals.css";
import { JetBrains_Mono } from "next/font/google";
import TransitionShell from "@/components/TransitionShell";
import Navbar from "@/components/Navbar";

const jetbrains = JetBrains_Mono({ subsets: ["latin"] });

export const metadata = {
  title: "MANAMONA",
  description: "TECH CRAFTER INDONESIA",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={jetbrains.className}
        style={{
          overscrollBehavior: "none",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {/* TransitionShell membungkus app + navbar, jadi event & overlay sinkron */}
        <TransitionShell>
          {children}
          {/* Navbar global (klik aktif, z-index di komponen Navbar) */}
          <Navbar />
        </TransitionShell>
      </body>
    </html>
  );
}
