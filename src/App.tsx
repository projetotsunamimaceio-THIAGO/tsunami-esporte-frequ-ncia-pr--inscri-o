import React, { useState } from 'react';
import { HomeView } from './components/HomeView';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { TurmasView } from './components/TurmasView';
import { AlunosView } from './components/AlunosView';
import { ArenaView } from './components/ArenaView';
import { ArenaFacialView } from './components/ArenaFacialView';
import { RelatorioView } from './components/RelatorioView';
import { ProgramacaoEsportivaView } from './components/ProgramacaoEsportivaView';
import { Trophy, ArrowLeft } from 'lucide-react';

export default function App() {
  const [activeView, setActiveView] = useState<
    'home' | 'login' | 'admin-dashboard' | 'turmas' | 'alunos' | 'relatorio' | 'arena' | 'arena-facial' | 'programacao-esportiva' | 'esporte-info'
  >('home');

  const checkLogged = () => {
    return sessionStorage.getItem('tsunami_logged') === 'true';
  };

  const handleOpenAdmin = () => {
    if (checkLogged()) {
      setActiveView('admin-dashboard');
    } else {
      setActiveView('login');
    }
  };

  const handleLoginSuccess = () => {
    setActiveView('admin-dashboard');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('tsunami_logged');
    setActiveView('home');
  };

  return (
    <div className="w-full min-h-screen bg-[#050b14] text-white select-none">
      {/* 1. Home Landing Page */}
      {activeView === 'home' && (
        <HomeView 
          onOpenAdmin={handleOpenAdmin} 
          onOpenEsporte={() => setActiveView('esporte-info')} 
        />
      )}

      {/* 2. Login View */}
      {activeView === 'login' && (
        <LoginView 
          onLoginSuccess={handleLoginSuccess} 
          onBackToHome={() => setActiveView('home')} 
        />
      )}

      {/* 3. Administrative Dashboard */}
      {activeView === 'admin-dashboard' && (
        <DashboardView 
          onNavigate={(view) => setActiveView(view)} 
          onLogout={handleLogout} 
          onBackToHome={() => setActiveView('home')} 
        />
      )}

      {/* 4. Turmas View */}
      {activeView === 'turmas' && (
        <TurmasView onBack={() => setActiveView('admin-dashboard')} />
      )}

      {/* 5. Alunos View */}
      {activeView === 'alunos' && (
        <AlunosView onBack={() => setActiveView('admin-dashboard')} />
      )}

      {/* 6. Arena Frequência View */}
      {activeView === 'arena' && (
        <ArenaView onBack={() => setActiveView('admin-dashboard')} />
      )}

      {/* 7. Arena Facial View */}
      {activeView === 'arena-facial' && (
        <ArenaFacialView onBack={() => setActiveView('admin-dashboard')} />
      )}

      {/* 8. Programação Esportiva View */}
      {activeView === 'programacao-esportiva' && (
        <ProgramacaoEsportivaView onBack={() => setActiveView('admin-dashboard')} />
      )}

      {/* 9. Relatório Statistics View */}
      {activeView === 'relatorio' && (
        <RelatorioView onBack={() => setActiveView('admin-dashboard')} />
      )}

      {/* 10. Área de Esporte Info Modal / Preview */}
      {activeView === 'esporte-info' && (
        <div className="min-h-screen w-full circuit-bg flex flex-col justify-center items-center p-6 text-center">
          <div className="bg-[#051c2c]/90 border-2 border-cyan-400 p-8 rounded-2xl max-w-lg w-full shadow-[0_0_30px_rgba(0,229,255,0.3)]">
            <div className="w-16 h-16 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 mx-auto mb-4">
              <Trophy className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-bold uppercase text-white font-rajdhani tracking-wider mb-2">
              ÁREA DE ESPORTE
            </h2>
            <p className="text-gray-300 text-sm mb-6">
              Módulo de atividades esportivas e acompanhamento de treinos do Projeto Tsunami.
            </p>
            <button
              onClick={() => setActiveView('home')}
              className="px-6 py-2.5 bg-cyan-500 text-black font-bold uppercase rounded-lg hover:bg-cyan-400 transition cursor-pointer flex items-center justify-center gap-2 mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Início</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
