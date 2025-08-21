// src/app/layout.js
import "./globals.css";
import { JetBrains_Mono } from "next/font/google";
import TransitionShell from "@/components/TransitionShell";
import Navbar from "@/components/Navbar";
import AudioProvider from "@/components/AudioProvider";

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
        style={{ overscrollBehavior: "none", WebkitTapHighlightColor: "transparent" }}
      >
        <AudioProvider src="/audio/bg.mp3" initialVolume={0.05}>
          <TransitionShell>
            {children}
            <Navbar />
          </TransitionShell>
        </AudioProvider>
      </body>
    </html>
  );
}
