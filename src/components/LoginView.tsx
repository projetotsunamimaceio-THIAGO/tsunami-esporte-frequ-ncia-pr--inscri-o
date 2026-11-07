import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { getFirestoreUsers, saveFirestoreUser } from '../lib/firestoreService';
import { ArrowLeft, Lock, UserCheck } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: () => void;
  onBackToHome: () => void;
}

export function LoginView({ onLoginSuccess, onBackToHome }: LoginViewProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    sincronizarUsuarios();
  }, []);

  const sincronizarUsuarios = async () => {
    try {
      const users = await getFirestoreUsers();
      if (users.length > 0) {
        localStorage.setItem('tsunami_users', JSON.stringify(users));
      }
    } catch (err) {
      console.log('Erro sync usuarios firestore:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nomeClean = nome.trim();
    const senhaClean = senha.trim();

    if (!nomeClean || !senhaClean) {
      alert('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    let users = await getFirestoreUsers();
    if (users.length === 0) {
      users = JSON.parse(localStorage.getItem('tsunami_users') || '[]');
    }

    if (isLogin) {
      // Default fallback credentials if database is empty initially
      if (users.length === 0) {
        // If first run, create admin user automatically in Firestore
        const defaultAdmin: User = { nome: nomeClean, senha: senhaClean };
        await saveFirestoreUser(defaultAdmin);
        sessionStorage.setItem('tsunami_logged', 'true');
        onLoginSuccess();
        return;
      }

      const user = users.find(u => u.nome.toLowerCase() === nomeClean.toLowerCase() && u.senha === senhaClean);
      if (user) {
        sessionStorage.setItem('tsunami_logged', 'true');
        onLoginSuccess();
      } else {
        alert(`Credenciais inválidas!\n\nVerifique:\n- Usuário: ${nomeClean}\n- Senha informada`);
        setLoading(false);
      }
    } else {
      if (users.find(u => u.nome.toLowerCase() === nomeClean.toLowerCase())) {
        alert('Este nome/email já está cadastrado!');
        setLoading(false);
        return;
      }

      const newUser: User = { nome: nomeClean, senha: senhaClean };
      try {
        await saveFirestoreUser(newUser);
        alert('Conta criada com sucesso no Firebase!');
        setIsLogin(true);
      } catch (err) {
        alert('Erro ao criar conta no Firebase.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0a0a0f] to-[#1a1a2e] text-white font-rajdhani flex flex-col justify-center items-center p-6 relative">
      
      {/* Top Navigation Back Button */}
      <button 
        onClick={onBackToHome}
        className="absolute top-6 left-6 flex items-center gap-2 border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 px-4 py-2 rounded-lg text-xs uppercase font-bold hover:bg-cyan-500 hover:text-black transition-all cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Início</span>
      </button>

      <div className="w-full max-w-md">
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full border-2 border-cyan-400 p-1 mb-4 shadow-[0_0_20px_rgba(0,255,255,0.4)]">
            <img 
              src="/assets/aistudio/logo_7f70452f.png" 
              alt="Logo Tsunami" 
              className="w-full h-full object-cover rounded-full" 
            />
          </div>
          <h1 className="font-chakra text-3xl md:text-4xl font-bold tracking-[0.2em] text-[#00ffff] drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
            TSUNAMI
          </h1>
          <p className="text-xs uppercase tracking-widest text-cyan-300/60 mt-1">
            Frequência & Gestão (Firestore Database)
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-cyan-500/20 p-8 rounded-2xl shadow-2xl">
          <h2 className="text-xl font-bold mb-6 uppercase text-center tracking-widest text-cyan-400 border-b border-cyan-500/20 pb-3 flex items-center justify-center gap-2">
            <Lock className="w-5 h-5 text-cyan-400" />
            <span>{isLogin ? 'Login Administrativo' : 'Cadastro Administrativo'}</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-cyan-400 mb-1 font-semibold">
                Nome ou E-mail
              </label>
              <input 
                type="text" 
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="w-full p-3 rounded-lg outline-none bg-white/5 border border-cyan-500/30 text-white placeholder-gray-500 focus:border-cyan-400 transition"
                placeholder="Insira seu usuário" 
                required 
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-cyan-400 mb-1 font-semibold">
                Senha
              </label>
              <input 
                type="password" 
                value={senha}
                onChange={e => setSenha(e.target.value)}
                className="w-full p-3 rounded-lg outline-none bg-white/5 border border-cyan-500/30 text-white placeholder-gray-500 focus:border-cyan-400 transition"
                placeholder="Insira sua senha" 
                required 
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-2 bg-cyan-500/10 border border-cyan-400 text-cyan-300 hover:bg-cyan-400 hover:text-black p-3.5 rounded-lg font-bold uppercase tracking-widest transition-all duration-300 shadow-[0_0_15px_rgba(0,255,255,0.25)] cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="animate-pulse">PROCESSANDO...</span>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>{isLogin ? 'Entrar no Sistema' : 'Criar Conta'}</span>
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            {isLogin ? (
              <span>
                Não tem conta?{' '}
                <button 
                  onClick={() => setIsLogin(false)} 
                  className="text-cyan-400 font-bold underline hover:text-cyan-300 transition"
                >
                  Cadastre-se
                </button>
              </span>
            ) : (
              <span>
                Já tem conta?{' '}
                <button 
                  onClick={() => setIsLogin(true)} 
                  className="text-cyan-400 font-bold underline hover:text-cyan-300 transition"
                >
                  Fazer Login
                </button>
              </span>
            )}
          </p>
        </div>
      </div>

    </div>
  );
}
