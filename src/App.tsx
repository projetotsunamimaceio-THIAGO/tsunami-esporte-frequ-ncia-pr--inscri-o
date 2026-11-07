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
import { EsporteView } from './components/EsporteView';

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

      {/* 10. Área de Esporte (Pré Inscrição & Justificativas) */}
      {activeView === 'esporte-info' && (
        <EsporteView onBackToHome={() => setActiveView('home')} />
      )}
    </div>
  );
}
