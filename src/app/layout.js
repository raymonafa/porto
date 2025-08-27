import "./globals.css";
import { JetBrains_Mono } from "next/font/google";
import TransitionShell from "@/components/TransitionShell";
import Navbar from "@/components/Navbar";
import AudioProvider from "@/components/AudioProvider";
import CustomCursor from "@/components/CustomCursor";
import HeaderTop from "@/components/HeaderTop"; // ⬅️ tambahkan

const jetbrains = JetBrains_Mono({ subsets: ["latin"] });

export const metadata = {
  title: "MANAMONA",
  description: "TECH CRAFTER INDONESIA",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${jetbrains.className} body-hides-cursor`}
        style={{ overscrollBehavior: "none", WebkitTapHighlightColor: "transparent" }}
      >
        <AudioProvider src="/audio/bg.mp3" initialVolume={0.01}>
          <TransitionShell>
            <CustomCursor />
            <HeaderTop />     {/* ⬅️ header fixed di atas */}
            {children}
            <Navbar />
          </TransitionShell>
        </AudioProvider>
      </body>
    </html>
  );
}
