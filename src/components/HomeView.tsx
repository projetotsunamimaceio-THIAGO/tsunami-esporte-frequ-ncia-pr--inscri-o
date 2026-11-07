import React from 'react';
import { Briefcase, Trophy, ChevronRight } from 'lucide-react';
import { ListaInscricoesWidget } from './ListaInscricoesWidget';

interface HomeViewProps {
  onOpenAdmin: () => void;
  onOpenEsporte: () => void;
}

export function HomeView({ onOpenAdmin, onOpenEsporte }: HomeViewProps) {
  return (
    <div className="relative min-h-screen w-full circuit-bg text-white font-rajdhani flex flex-col justify-between items-center p-4 md:p-8 select-none overflow-hidden">
      
      {/* Background Circuit Overlay SVG */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40 z-0" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="cyanGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0088FF" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="purpleGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D846FF" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#7000FF" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Left Circuit Lines */}
        <path d="M 0 200 L 120 200 L 180 260 L 180 420 L 260 500 L 260 700" fill="none" stroke="#00E5FF" strokeWidth="1.5" strokeOpacity="0.5" />
        <path d="M 0 350 L 90 350 L 140 400 L 140 600 L 220 680 L 220 900" fill="none" stroke="#00E5FF" strokeWidth="1" strokeOpacity="0.3" />
        <circle cx="180" cy="260" r="3" fill="#00E5FF" />
        <circle cx="260" cy="500" r="4" fill="#00E5FF" className="animate-pulse" />
        <circle cx="140" cy="400" r="3" fill="#00E5FF" />

        {/* Right Circuit Lines */}
        <path d="M 1440 220 L 1320 220 L 1260 280 L 1260 480 L 1180 560 L 1180 750" fill="none" stroke="#A855F7" strokeWidth="1.5" strokeOpacity="0.4" />
        <path d="M 1440 380 L 1360 380 L 1300 440 L 1300 650 L 1220 730" fill="none" stroke="#A855F7" strokeWidth="1" strokeOpacity="0.3" />
        <circle cx="1260" cy="280" r="3" fill="#A855F7" />
        <circle cx="1180" cy="560" r="4" fill="#A855F7" className="animate-pulse" />
        <circle cx="1300" cy="440" r="3" fill="#A855F7" />
      </svg>

      {/* Main Content Container */}
      <main className="relative z-10 my-auto flex flex-col items-center justify-center w-full max-w-5xl px-4 py-8">
        
        {/* Brand Header Lockup */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 md:gap-10 mb-14 md:mb-20">
          
          {/* Logo Badge Container (FULLY ROUND WITH REAL LOGO IMAGE) */}
          <div className="w-40 h-40 sm:w-44 sm:h-44 md:w-52 md:h-52 rounded-full bg-[#030914] border-2 border-cyan-400 p-1.5 shadow-[0_0_30px_rgba(0,229,255,0.45)] flex items-center justify-center relative shrink-0 overflow-hidden">
            <img 
              src="/assets/aistudio/logo_7f70452f.png" 
              alt="Logo Projeto Tsunami" 
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                // Fallback SVG if image is delayed
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>

          {/* Title & Subtitle Block */}
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight uppercase flex flex-wrap justify-center sm:justify-start gap-x-3 leading-none">
              <span className="text-white font-rajdhani">PROJETO</span>
              <span className="text-[#00E5FF] font-rajdhani glow-text-cyan">TSUNAMI</span>
            </h1>

            {/* Solid White Separator Line */}
            <div className="w-full h-[3px] bg-white my-3 shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl md:text-2xl text-gray-200 font-rajdhani font-medium tracking-normal">
              Educação, esporte e disciplina
            </p>
          </div>
        </div>

        {/* Action Buttons Section with Horizontal Connector */}
        <div className="relative w-full max-w-4xl flex flex-col sm:flex-row items-stretch justify-center gap-6 sm:gap-16 my-4">
          
          {/* Connecting Line between Buttons */}
          <div className="hidden sm:block absolute top-1/2 left-1/4 right-1/4 h-[2px] bg-cyan-400/50 -translate-y-1/2 z-0 shadow-[0_0_10px_rgba(6,182,212,0.8)]"></div>

          {/* Button 1: Área de Esporte */}
          <div className="relative z-10 w-full sm:w-80 flex-1 min-h-[110px]">
            <button
              onClick={onOpenEsporte}
              aria-label="Área de Esporte"
              className="w-full h-full relative overflow-hidden rounded-2xl bg-[#051c2c]/80 border-2 border-cyan-400 hover:border-cyan-300 p-6 text-center shadow-[0_0_25px_rgba(6,182,212,0.35)] hover:shadow-[0_0_35px_rgba(6,182,212,0.6)] flex flex-col items-center justify-center transition-all duration-300 cursor-pointer active:scale-95 group"
            >
              {/* Whistle Icon Badge on Top Right */}
              <div className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/60 flex items-center justify-center text-cyan-300 group-hover:scale-110 transition-transform">
                <svg className="w-4 h-4 text-cyan-300" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11 3C6.58 3 3 6.58 3 11c0 4.42 3.58 8 8 8h9a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-3.5L14 9V3h-3zm0 2h1v4h2.5l2.5 4H20v4h-9c-3.31 0-6-2.69-6-6s2.69-6 6-6z" />
                  <circle cx="9" cy="11" r="1.5" />
                </svg>
              </div>

              {/* Button Text on Single Line */}
              <span className="text-xl sm:text-2xl font-bold tracking-wider text-white uppercase font-rajdhani whitespace-nowrap group-hover:text-cyan-300 transition-colors">
                ÁREA DE ESPORTE
              </span>
            </button>
          </div>

          {/* Button 2: Área Administrativa */}
          <div className="relative z-10 w-full sm:w-80 flex-1 min-h-[110px]">
            <button
              onClick={onOpenAdmin}
              aria-label="Área Administrativa"
              className="w-full h-full relative overflow-hidden rounded-2xl bg-[#1d0d26]/80 border-2 border-purple-500 hover:border-purple-400 p-6 text-center shadow-[0_0_25px_rgba(168,85,247,0.35)] hover:shadow-[0_0_35px_rgba(168,85,247,0.6)] flex flex-col items-center justify-center transition-all duration-300 cursor-pointer active:scale-95 group"
            >
              {/* Briefcase Icon Badge on Top Right */}
              <div className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-400/60 flex items-center justify-center text-purple-300 group-hover:scale-110 transition-transform">
                <Briefcase className="w-4 h-4 text-purple-300" />
              </div>

              {/* Button Text on Single Line */}
              <span className="text-xl sm:text-2xl font-bold tracking-wider text-white uppercase font-rajdhani whitespace-nowrap group-hover:text-purple-300 transition-colors">
                ÁREA ADMINISTRATIVA
              </span>
            </button>
          </div>

        </div>

        {/* LISTA DE INSCRIÇÃO Section right below the two main buttons */}
        <ListaInscricoesWidget />

      </main>

      {/* Footer Section */}
      <footer className="relative z-10 w-full text-center py-4 text-gray-300 font-rajdhani font-medium tracking-widest uppercase text-sm sm:text-base space-y-1">
        <p className="text-gray-200">
          PROJETO TSUNAMI @2027 - EDUCAÇÃO, ESPORTE E DISCIPLINA
        </p>
        <p className="text-gray-400 text-xs sm:text-sm">
          ARENA SEDE - SARA NOSSA TERRA - MACEIÓ - AL
        </p>
      </footer>

    </div>
  );
}
