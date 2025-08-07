'use client'
import Navbar from '@/components/Navbar'
import Canvas3D from '@/components/Canvas3D'
import MouseTrail from '@/components/MouseTrail'
import PixelSpot from '@/components/PixelSpot'
import React from 'react'

export default function Home() {
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#f8f8f8] text-black font-mono">

      
   <MouseTrail />
  {/* <PixelSpot /> */}

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
        <span>MANAMONA</span>
        <span>INDONESIA</span>
        <span>2025</span>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center h-full px-10 text-center">
       
      </div>

      {/* Navbar bawah */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-1 text-sm font-mono">
        <button className="bg-[#D3FB43] text-black px-4 py-1 rounded-l-full">WORKS</button>
        <button className="bg-black text-white px-4 py-1">WHO</button>
        <button className="bg-black text-white px-4 py-1 rounded-r-full">CONTACT</button>
      </div>

      {/* Canvas 3D */}
      <Canvas3D />
    </main>
  )
}
