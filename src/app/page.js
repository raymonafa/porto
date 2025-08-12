  'use client'
  import Navbar from '@/components/Navbar'
  import Canvas3D from '@/components/Canvas3D'
  import MouseTrail from '@/components/MouseTrail'
  import CenterCube from '@/components/CenterCube';



  import React, { useEffect, useState } from 'react';

  const asciiCharacters = ['⁕', '※', '⊙', '∘', '∀', '9', '1', '>', '-', '6'];

  export default function Home() {
    const texts = ['MANAMONA', 'INDONESIA', '2025'];
    const [typed, setTyped] = useState(['', '', '']);
    const [typingComplete, setTypingComplete] = useState(false);
    const [glitchTexts, setGlitchTexts] = useState(['', '', '']); // For temporary glitch effects

    // Function to get a random ASCII character
    const getRandomAscii = () => {
      return asciiCharacters[Math.floor(Math.random() * asciiCharacters.length)];
    };

    useEffect(() => {
      // Typing animation effect
      texts.forEach((text, idx) => {
        let i = 0;
        const typeInterval = setInterval(() => {
          setTyped(prev => {
            const updated = [...prev];
            // Show ASCII while typing, then show real text when done
            if (i < text.length) {
              updated[idx] = Array.from(text.slice(0, i + 1))
                .map(() => asciiCharacters[Math.floor(Math.random() * asciiCharacters.length)])
                .join('');
            } else {
              updated[idx] = text; // Show real text after typing
            }
            return updated;
          });
          i++;
          if (i > text.length) clearInterval(typeInterval);
        }, 100 + idx * 50);
      });

      // Set a timeout to mark typing as complete
      const maxTypingTime = Math.max(...texts.map((text, idx) => (text.length + 1) * (100 + idx * 50)));
      const typingCompleteTimeout = setTimeout(() => {
        setTypingComplete(true);
      }, maxTypingTime);

      return () => clearTimeout(typingCompleteTimeout);
    }, []);

    // Effect for glitch animation after typing is complete
    useEffect(() => {
      if (!typingComplete) return;

      const interval = setInterval(() => {
        setGlitchTexts(prev => {
          const updated = [...prev];
          
          texts.forEach((originalText, idx) => {
            // Only apply glitch effect to fully typed texts
            if (typed[idx] === originalText) {
              // Create a glitch effect by randomly replacing some characters
              updated[idx] = Array.from(originalText)
                .map(char => Math.random() > 0.9 ? getRandomAscii() : char)
                .join('');
            } else {
              updated[idx] = typed[idx];
            }
          });
          
          return updated;
        });
      }, 100); // Run glitch effect every 100ms

      return () => clearInterval(interval);
    }, [typingComplete, typed]);

    // Effect to reset glitch after a short time
    useEffect(() => {
      if (!typingComplete) return;
      
      const resetInterval = setInterval(() => {
        setGlitchTexts(prev => {
          const updated = [...prev];
          texts.forEach((originalText, idx) => {
            // Reset to original text if currently showing glitch
            if (typed[idx] === originalText) {
              updated[idx] = originalText;
            }
          });
          return updated;
        });
      }, 300); // Reset glitch every 300ms
      
      return () => clearInterval(resetInterval);
    }, [typingComplete, typed]);

    return (
      <main className="relative w-screen h-screen overflow-hidden bg-[#f8f8f8] text-black font-mono">
        

        <CenterCube />
        <MouseTrail />

        {/* Glow blur hijau #D3FB43 */}
        <div className="absolute inset-0 flex items-center justify-center z-0">
          <div className="w-[600px] h-[600px] bg-[#D3FB43] rounded-full blur-[150px] opacity-50" />
        </div>

      {/* MAIN HEADING */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="flex flex-col items-center leading-none text-center">
            <span className="text-[6rem] md:text-[10rem] tracking-none text-neutral-700">
              TECH
            </span>
            <span className="text-[6rem] md:text-[10rem] tracking-none text-neutral-700">
              CRAFTER
            </span>
          </div>
        </div>

        {/* Teks kecil kiri-tengah-kanan sep baris */}
        <div className="absolute top-1/2 left-0 w-full px-10 flex justify-between pointer-events-none z-20 text-sm text-black">
          <span>{glitchTexts[0] || typed[0]}</span>
          {/* <span>{typed[1]}</span> */}
          <span>{glitchTexts[2] || typed[2]}</span>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center h-full px-10 text-center">
        
        </div>

     <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-1 text-sm font-mono">
  <button data-hover-interactive className="bg-[#D3FB43] text-black px-4 py-1 rounded-l-full">WORKS</button>
  <button data-hover-interactive className="bg-black text-white px-4 py-1">WHO</button>
  <button data-hover-interactive className="bg-black text-white px-4 py-1 rounded-r-full">CONTACT</button>
</div>


      

        {/* Canvas 3D */}
        <Canvas3D />
      </main>
    )
  }
