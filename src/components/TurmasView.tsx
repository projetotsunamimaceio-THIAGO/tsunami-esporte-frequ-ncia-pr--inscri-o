import React, { useState, useEffect } from 'react';
import { Turma } from '../types';
import { saveFirestoreTurma, deleteFirestoreTurma, subscribeFirestoreTurmas } from '../lib/firestoreService';
import { ArrowLeft, Users, Plus, RefreshCw, Clock, Calendar, Edit, Trash2, X, Check, AlertTriangle } from 'lucide-react';

interface TurmasViewProps {
  onBack: () => void;
}

export function TurmasView({ onBack }: TurmasViewProps) {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State (Creation)
  const [nome, setNome] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [vagas, setVagas] = useState('');
  const [diasSelecionados, setDiasSelecionados] = useState<string[]>([]);

  // Edit Modal State
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editInicio, setEditInicio] = useState('');
  const [editFim, setEditFim] = useState('');
  const [editVagas, setEditVagas] = useState('');
  const [editDias, setEditDias] = useState<string[]>([]);

  // Delete Confirmation Modal State
  const [turmaParaExcluir, setTurmaParaExcluir] = useState<Turma | null>(null);
  const [deleting, setDeleting] = useState(false);

  const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  useEffect(() => {
    setLoading(true);
    // Real-time Firestore subscription
    const unsubscribe = subscribeFirestoreTurmas((list) => {
      setTurmas(list);
      localStorage.setItem('tsunami_turmas', JSON.stringify(list));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleDia = (dia: string, isEdit = false) => {
    if (isEdit) {
      if (editDias.includes(dia)) {
        setEditDias(editDias.filter(d => d !== dia));
      } else {
        setEditDias([...editDias, dia]);
      }
    } else {
      if (diasSelecionados.includes(dia)) {
        setDiasSelecionados(diasSelecionados.filter(d => d !== dia));
      } else {
        setDiasSelecionados([...diasSelecionados, dia]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (diasSelecionados.length === 0) {
      alert('Selecione pelo menos um dia de treino!');
      return;
    }

    const nova: Turma = {
      nome: nome.toUpperCase().trim(),
      inicio,
      fim,
      vagas,
      dias: diasSelecionados.join('/')
    };

    try {
      await saveFirestoreTurma(nova);
    } catch (err) {
      console.error('Erro ao salvar turma no Firestore:', err);
    }

    // Reset Form
    setNome('');
    setInicio('');
    setFim('');
    setVagas('');
    setDiasSelecionados([]);
  };

  const handleEditar = (t: Turma) => {
    const realIndex = turmas.findIndex(item => item.nome === t.nome);
    if (realIndex < 0) return;
    setEditIndex(realIndex);
    setEditNome(t.nome);
    setEditInicio(t.inicio || '');
    setEditFim(t.fim || '');
    setEditVagas(t.vagas ? t.vagas.toString() : '');
    setEditDias(t.dias ? t.dias.split('/') : []);
  };

  const salvarEdicao = async () => {
    if (editIndex === null) return;
    if (!editNome.trim()) {
      alert('Preencha o nome da turma!');
      return;
    }

    const turmaEditada: Turma = {
      nome: editNome.toUpperCase().trim(),
      inicio: editInicio,
      fim: editFim,
      vagas: editVagas,
      dias: editDias.join('/')
    };

    try {
      await saveFirestoreTurma(turmaEditada);
      alert('Turma salva no Firestore!');
    } catch (err) {
      console.error('Erro ao editar turma no Firestore:', err);
    }

    setEditIndex(null);
  };

  const confirmarExclusao = async () => {
    if (!turmaParaExcluir) return;
    setDeleting(true);

    try {
      await deleteFirestoreTurma(turmaParaExcluir.nome);
    } catch (err) {
      console.error('Erro ao excluir turma no Firestore:', err);
    }

    setDeleting(false);
    setTurmaParaExcluir(null);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0a0a0f] to-[#1a1a2e] text-white font-rajdhani p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <button 
            onClick={onBack}
            className="border border-cyan-400/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-400 hover:text-black px-4 py-2 rounded-lg text-xs uppercase font-bold transition flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>
          
          <h1 className="text-2xl md:text-3xl font-bold text-cyan-400 tracking-widest uppercase text-center flex-1 flex items-center justify-center gap-3">
            <Users className="w-7 h-7" />
            <span>Gerenciar Turmas (Firestore)</span>
          </h1>

          <div className="w-20"></div>
        </div>

        {/* Form Container (Creation) */}
        <div className="bg-white/5 backdrop-blur-md border border-cyan-500/20 p-6 rounded-2xl mb-8">
          <h2 className="text-sm uppercase tracking-[0.3em] text-cyan-300 mb-6 border-b border-cyan-500/20 pb-2 font-bold">
            Nova Turma
          </h2>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-3">
              <label className="block text-[10px] uppercase tracking-wider text-cyan-400 mb-2 font-semibold">
                Nome da Turma
              </label>
              <input 
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex: SUB-15"
                className="w-full p-3 rounded-lg outline-none uppercase bg-gray-900 border border-cyan-500/30 text-white focus:border-cyan-400"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase tracking-wider text-cyan-400 mb-2 font-semibold">
                Início
              </label>
              <input 
                type="time"
                value={inicio}
                onChange={e => setInicio(e.target.value)}
                className="w-full p-3 rounded-lg outline-none bg-gray-900 border border-cyan-500/30 text-white focus:border-cyan-400"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase tracking-wider text-cyan-400 mb-2 font-semibold">
                Término
              </label>
              <input 
                type="time"
                value={fim}
                onChange={e => setFim(e.target.value)}
                className="w-full p-3 rounded-lg outline-none bg-gray-900 border border-cyan-500/30 text-white focus:border-cyan-400"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase tracking-wider text-cyan-400 mb-2 font-semibold">
                Vagas
              </label>
              <input 
                type="number"
                value={vagas}
                onChange={e => setVagas(e.target.value)}
                placeholder="20"
                min="1"
                className="w-full p-3 rounded-lg outline-none bg-gray-900 border border-cyan-500/30 text-white focus:border-cyan-400"
                required
              />
            </div>

            <div className="md:col-span-3">
              <button 
                type="submit"
                className="w-full border border-cyan-400 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-400 hover:text-black p-3 rounded-lg uppercase font-bold tracking-wider transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Turma</span>
              </button>
            </div>

            {/* Days selection */}
            <div className="md:col-span-12 mt-4">
              <label className="block text-[10px] uppercase tracking-wider text-cyan-400 mb-3 font-semibold">
                Dias de Treino
              </label>
              <div className="flex flex-wrap gap-2">
                {DIAS.map(dia => {
                  const selected = diasSelecionados.includes(dia);
                  return (
                    <button
                      key={dia}
                      type="button"
                      onClick={() => toggleDia(dia)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition cursor-pointer ${
                        selected 
                          ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(0,255,255,0.4)]' 
                          : 'bg-white/5 border border-cyan-500/20 text-cyan-400 hover:bg-white/10'
                      }`}
                    >
                      {dia}
                    </button>
                  );
                })}
              </div>
            </div>
          </form>
        </div>

        {/* Turmas List */}
        <div className="bg-white/5 backdrop-blur-md border border-cyan-500/20 p-6 rounded-2xl">
          <div className="flex justify-between items-center mb-6 border-b border-cyan-500/20 pb-2">
            <h2 className="text-sm uppercase tracking-[0.3em] text-cyan-300 font-bold">
              Turmas Cadastradas ({turmas.length})
            </h2>
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span>Sincronizado via Firebase</span>
            </span>
          </div>

          <div className="space-y-3">
            {turmas.length === 0 ? (
              <p className="text-center py-12 text-cyan-400/40 text-sm uppercase">
                {loading ? 'Carregando turmas...' : 'Nenhuma turma registrada no Firestore'}
              </p>
            ) : (
              [...turmas]
                .sort((a, b) => a.nome.localeCompare(b.nome))
                .map((t, index) => (
                  <div 
                    key={t.nome + '-' + index}
                    className="p-4 rounded-xl bg-white/[0.03] border border-cyan-500/10 border-l-4 border-l-cyan-400 flex justify-between items-center hover:bg-cyan-500/[0.05] transition"
                  >
                    <div>
                      <h3 className="text-lg font-bold text-cyan-300 uppercase">{t.nome}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{t.inicio} às {t.fim}</span>
                        </span>
                        <span>|</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{t.dias || 'N/A'}</span>
                        </span>
                        <span>|</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{t.vagas} vagas</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEditar(t)}
                        className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500 hover:text-black transition cursor-pointer"
                        title="Editar Turma"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setTurmaParaExcluir(t)}
                        className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white transition cursor-pointer"
                        title="Excluir Turma"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

      </div>

      {/* Edit Modal */}
      {editIndex !== null && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121826] border border-cyan-500/40 p-6 rounded-2xl max-w-lg w-full shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-cyan-400 border-b border-cyan-500/20 pb-2 uppercase">
              Editar Turma
            </h3>
            
            <div>
              <label className="block text-xs text-cyan-300 mb-1 font-semibold">Nome da Turma</label>
              <input 
                type="text" 
                value={editNome}
                onChange={e => setEditNome(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-900 border border-cyan-500/30 text-white outline-none uppercase font-bold focus:border-cyan-400"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-cyan-300 mb-1 font-semibold">Início</label>
                <input 
                  type="time" 
                  value={editInicio}
                  onChange={e => setEditInicio(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-gray-900 border border-cyan-500/30 text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-cyan-300 mb-1 font-semibold">Término</label>
                <input 
                  type="time" 
                  value={editFim}
                  onChange={e => setEditFim(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-gray-900 border border-cyan-500/30 text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-cyan-300 mb-1 font-semibold">Vagas</label>
                <input 
                  type="number" 
                  value={editVagas}
                  onChange={e => setEditVagas(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-gray-900 border border-cyan-500/30 text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-cyan-300 mb-2 font-semibold">Dias de Treino</label>
              <div className="flex flex-wrap gap-1.5">
                {DIAS.map(dia => {
                  const selected = editDias.includes(dia);
                  return (
                    <button
                      key={dia}
                      type="button"
                      onClick={() => toggleDia(dia, true)}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition cursor-pointer ${
                        selected 
                          ? 'bg-cyan-400 text-black' 
                          : 'bg-white/5 border border-cyan-500/20 text-cyan-400 hover:bg-white/10'
                      }`}
                    >
                      {dia}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-cyan-500/20">
              <button 
                onClick={() => setEditIndex(null)}
                className="flex-1 border border-gray-500 text-gray-400 p-3 rounded-lg uppercase text-xs font-bold hover:bg-gray-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={salvarEdicao}
                className="flex-1 border border-cyan-400 bg-cyan-500/20 text-cyan-300 p-3 rounded-lg uppercase text-xs font-bold hover:bg-cyan-400 hover:text-black transition cursor-pointer"
              >
                Salvar no Firestore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {turmaParaExcluir && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#180d1e] border-2 border-rose-500/80 p-6 rounded-2xl max-w-sm w-full text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center text-rose-400 mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-rose-400 uppercase tracking-wider">
                Excluir Turma?
              </h3>
              <p className="text-white text-base font-bold uppercase mt-1">
                "{turmaParaExcluir.nome}"
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Essa ação removerá a turma do banco de dados Firestore permanentemente.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setTurmaParaExcluir(null)}
                disabled={deleting}
                className="flex-1 border border-gray-500 text-gray-300 p-3 rounded-lg uppercase text-xs font-bold hover:bg-gray-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarExclusao}
                disabled={deleting}
                className="flex-1 border border-rose-500 bg-rose-600 text-white p-3 rounded-lg uppercase text-xs font-bold hover:bg-rose-500 transition cursor-pointer flex items-center justify-center gap-1 shadow-[0_0_15px_rgba(244,63,94,0.4)]"
              >
                {deleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
