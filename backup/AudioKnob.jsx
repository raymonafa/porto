// src/components/AudioKnob.jsx
"use client";

import React from "react";
import { useAudio } from "../src/components/AudioProvider";

export default function AudioKnob({
  className = "",
  zIndex = 12000,
}) {
  const audio = useAudio();
  if (!audio) return null;

  const { playing, muted } = audio;
  const isOn = playing && !muted;

  return (
    <div
      data-audio-ui
      className={`fixed left-4 bottom-4 pointer-events-auto select-none ${className}`}
      style={{ zIndex }}
    >
      <button
        onClick={async () => {
          if (!playing) await audio.play();
          else audio.toggleMuted();
        }}
        className="group flex items-center gap-2 rounded-full bg-white/80 backdrop-blur px-3 py-2 shadow hover:bg-white transition"
        title={isOn ? "Sound on — click to mute" : "Muted — click to play/unmute"}
      >
        {/* bulatan ikon */}
        <span
          className="inline-grid place-items-center w-8 h-8 rounded-full border border-black/10 bg-white"
          aria-hidden
        >
          {/* ikon sederhana */}
          <span
            className={`block w-3 h-3 rounded-full ${isOn ? "bg-[#2ecc71]" : "bg-[#e74c3c]"}`}
          />
        </span>

        {/* label */}
        <span className="font-mono text-xs text-black/80 pr-1">
          {isOn ? "Sound on" : "Muted"}
        </span>
      </button>
    </div>
  );
}
