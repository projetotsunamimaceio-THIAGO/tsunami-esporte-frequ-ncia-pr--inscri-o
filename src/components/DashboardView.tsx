import React from 'react';
import { Users, UserPlus, PieChart, CheckSquare, Camera, LogOut, ArrowLeft, FileText } from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (view: 'turmas' | 'alunos' | 'relatorio' | 'arena' | 'arena-facial' | 'programacao-esportiva') => void;
  onLogout: () => void;
  onBackToHome: () => void;
}

export function DashboardView({ onNavigate, onLogout, onBackToHome }: DashboardViewProps) {
  return (
    <div className="min-h-screen w-full bg-[#07080f] text-white font-rajdhani flex flex-col items-center justify-center p-4 md:p-8 relative">
      
      {/* Background grid lines effect */}
      <div 
        className="fixed inset-0 pointer-events-none z-0" 
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px'
        }}
      />

      {/* Top Header Controls */}
      <div className="absolute top-6 left-6 z-10 flex gap-3">
        <button 
          onClick={onBackToHome}
          className="flex items-center gap-2 border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 px-3.5 py-1.5 rounded-lg text-xs uppercase font-bold hover:bg-cyan-500 hover:text-black transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Tela Inicial</span>
        </button>
      </div>

      {/* Header Lockup */}
      <header className="relative z-10 text-center mb-8">
        <div className="inline-block relative mb-4">
          <img 
            src="/assets/aistudio/logo_7f70452f.png" 
            alt="Logo Tsunami" 
            className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover border-2 border-cyan-400/80 shadow-[0_0_25px_rgba(0,255,255,0.4)]" 
          />
          <div className="absolute -inset-2 rounded-full border border-cyan-400/30 animate-[spin_12s_linear_infinite] pointer-events-none">
            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00ffff] absolute -top-1 left-1/2 -translate-x-1/2"></div>
          </div>
        </div>

        <h1 className="font-chakra text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-[0.25em] text-[#00ffff] drop-shadow-[0_0_35px_rgba(0,255,255,0.3)]">
          TSUNAMI
        </h1>
        <p className="mt-1 text-xs sm:text-sm tracking-[0.4em] text-cyan-300/60 uppercase">
          Frequência & Gestão
        </p>
        <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-[#00ffff] to-transparent mx-auto mt-3"></div>
      </header>

      {/* Grid Navigation Cards */}
      <main className="relative z-10 w-full max-w-xl md:max-w-3xl">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          
          {/* 1. Turmas */}
          <button 
            onClick={() => onNavigate('turmas')}
            className="group flex flex-col justify-between p-4 md:p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#00e5ff]/60 hover:bg-white/[0.07] transition-all duration-300 text-left min-h-[100px] cursor-pointer relative overflow-hidden shadow-lg border-t-2 border-t-[#00e5ff]"
          >
            <div className="flex items-center justify-between w-full">
              <Users className="w-6 h-6 md:w-7 md:h-7 text-[#00e5ff]" />
              <span className="text-xs text-gray-500 group-hover:text-[#00e5ff] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">↗</span>
            </div>
            <span className="text-xs md:text-sm font-bold tracking-widest uppercase text-[#00e5ff] mt-3">
              Turmas
            </span>
          </button>

          {/* 2. Alunos */}
          <button 
            onClick={() => onNavigate('alunos')}
            className="group flex flex-col justify-between p-4 md:p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#e040fb]/60 hover:bg-white/[0.07] transition-all duration-300 text-left min-h-[100px] cursor-pointer relative overflow-hidden shadow-lg border-t-2 border-t-[#e040fb]"
          >
            <div className="flex items-center justify-between w-full">
              <UserPlus className="w-6 h-6 md:w-7 md:h-7 text-[#e040fb]" />
              <span className="text-xs text-gray-500 group-hover:text-[#e040fb] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">↗</span>
            </div>
            <span className="text-xs md:text-sm font-bold tracking-widest uppercase text-[#e040fb] mt-3">
              Alunos
            </span>
          </button>

          {/* 3. Relatórios */}
          <button 
            onClick={() => onNavigate('relatorio')}
            className="group flex flex-col justify-between p-4 md:p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#b39ddb]/60 hover:bg-white/[0.07] transition-all duration-300 text-left min-h-[100px] cursor-pointer relative overflow-hidden shadow-lg border-t-2 border-t-[#b39ddb]"
          >
            <div className="flex items-center justify-between w-full">
              <PieChart className="w-6 h-6 md:w-7 md:h-7 text-[#b39ddb]" />
              <span className="text-xs text-gray-500 group-hover:text-[#b39ddb] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">↗</span>
            </div>
            <span className="text-xs md:text-sm font-bold tracking-widest uppercase text-[#b39ddb] mt-3">
              Relatórios
            </span>
          </button>

          {/* 4. Arena */}
          <button 
            onClick={() => onNavigate('arena')}
            className="group flex flex-col justify-between p-4 md:p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#00e676]/60 hover:bg-white/[0.07] transition-all duration-300 text-left min-h-[100px] cursor-pointer relative overflow-hidden shadow-lg border-t-2 border-t-[#00e676]"
          >
            <div className="flex items-center justify-between w-full">
              <CheckSquare className="w-6 h-6 md:w-7 md:h-7 text-[#00e676]" />
              <span className="text-xs text-gray-500 group-hover:text-[#00e676] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">↗</span>
            </div>
            <span className="text-xs md:text-sm font-bold tracking-widest uppercase text-[#00e676] mt-3">
              Arena
            </span>
          </button>

          {/* 5. Facial Arena */}
          <button 
            onClick={() => onNavigate('arena-facial')}
            className="group flex flex-col justify-between p-4 md:p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#448aff]/60 hover:bg-white/[0.07] transition-all duration-300 text-left min-h-[100px] cursor-pointer relative overflow-hidden shadow-lg border-t-2 border-t-[#448aff]"
          >
            <div className="flex items-center justify-between w-full">
              <Camera className="w-6 h-6 md:w-7 md:h-7 text-[#448aff]" />
              <span className="text-xs text-gray-500 group-hover:text-[#448aff] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">↗</span>
            </div>
            <span className="text-xs md:text-sm font-bold tracking-widest uppercase text-[#448aff] mt-3">
              Facial Arena
            </span>
          </button>

          {/* 6. Programação Esportiva (Yellow Card) */}
          <button 
            onClick={() => onNavigate('programacao-esportiva')}
            className="group flex flex-col justify-between p-4 md:p-5 rounded-2xl bg-white/[0.03] border border-yellow-500/60 hover:border-yellow-400 hover:bg-yellow-500/[0.08] transition-all duration-300 text-left min-h-[100px] cursor-pointer relative overflow-hidden shadow-[0_0_15px_rgba(234,179,8,0.15)] border-t-2 border-t-yellow-400"
          >
            <div className="flex items-center justify-between w-full">
              <FileText className="w-6 h-6 md:w-7 md:h-7 text-yellow-400" />
              <span className="text-xs text-yellow-500/70 group-hover:text-yellow-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">↗</span>
            </div>
            <span className="text-xs md:text-sm font-bold tracking-widest uppercase text-yellow-400 mt-3">
              Programação Esportiva
            </span>
          </button>

        </div>
      </main>

      {/* Logout Footer */}
      <footer className="relative z-10 mt-8">
        <button 
          onClick={onLogout}
          className="flex items-center gap-2 text-rose-400/80 hover:text-rose-400 text-xs font-bold tracking-widest uppercase px-4 py-2 rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair do sistema</span>
        </button>
      </footer>

    </div>
  );
}
