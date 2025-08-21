// src/components/AudioToggle.jsx
"use client";

import React from "react";
import { useAudio } from "../src/components/AudioProvider";

export default function AudioToggle({ className = "", zIndex = 12000 }) {
  const audio = useAudio();
  if (!audio) return null;

  const { playing, muted, volume } = audio;

  return (
    <div className={`fixed top-4 right-4 ${className}`} style={{ zIndex }}>
      <div className="flex items-center gap-2 rounded-full bg-[#111]/80 text-white px-3 py-2 backdrop-blur pointer-events-auto select-none">
        <button
          onClick={() => audio.togglePlay()}
          title="Play / Pause"
          className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition"
        >
          {playing ? "Pause" : "Play"}
        </button>

        <button
          onClick={() => audio.toggleMuted()}
          title="Mute / Unmute"
          className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition"
        >
          {muted ? "Unmute" : "Mute"}
        </button>

        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          onChange={(e) => audio.setVolume(parseFloat(e.target.value))}
          className="w-24 accent-[#D3FB43]"
          title="Volume"
        />
      </div>
    </div>
  );
}
