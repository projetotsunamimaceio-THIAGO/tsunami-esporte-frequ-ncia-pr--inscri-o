import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Clock, 
  Calendar, 
  Flame, 
  Trophy, 
  Check, 
  Edit2,
  Sparkles,
  RefreshCw,
  Lock,
  Unlock,
  RotateCcw,
  UserCheck,
  UserX,
  Search,
  ShieldAlert,
  CheckSquare,
  Square
} from 'lucide-react';
import { ProgramacaoItem, Aluno, PermissaoAlunoEsporte } from '../types';
import { 
  subscribeFirestoreProgramacao, 
  saveFirestoreProgramacao, 
  deleteFirestoreProgramacao,
  subscribeFirestoreAlunos,
  subscribeFirestorePermissoesEsporte,
  saveFirestorePermissaoEsporte,
  batchSaveFirestorePermissoesEsporte,
  clearAllFirestoreInscricoesEsporte,
  saveFirestoreConfiguracaoEsporte,
  subscribeFirestoreConfiguracaoEsporte
} from '../lib/firestoreService';

interface ProgramacaoEsportivaViewProps {
  onBack: () => void;
}

const DIAS_SEMANA = [
  { key: 'seg', label: 'seg' },
  { key: 'ter', label: 'ter' },
  { key: 'qua', label: 'qua' },
  { key: 'qui', label: 'qui' },
  { key: 'sex', label: 'sex' },
  { key: 'sáb', label: 'sáb' },
  { key: 'dom', label: 'dom' }
];

export function ProgramacaoEsportivaView({ onBack }: ProgramacaoEsportivaViewProps) {
  const [items, setItems] = useState<ProgramacaoItem[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [permissoesMap, setPermissoesMap] = useState<Record<string, PermissaoAlunoEsporte>>({});
  const [inscricoesTrancadas, setInscricoesTrancadas] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [saveSuccessId, setSaveSuccessId] = useState<string | null>(null);

  // Filtros de alunos no Controle de Acessos
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'liberados-justificar' | 'sem-autorizacao'>('todos');
  const [buscaAluno, setBuscaAluno] = useState<string>('');

  // Modais de Atividades
  const [showModal, setShowModal] = useState<boolean>(false);
  const [novoTitulo, setNovoTitulo] = useState<string>('');
  const [novaHora, setNovaHora] = useState<string>('18:00');
  const [novosDias, setNovosDias] = useState<string[]>(['seg', 'ter', 'qua', 'qui', 'sex']);

  // Modal para editar título de atividade existente
  const [editingItem, setEditingItem] = useState<ProgramacaoItem | null>(null);

  // Subscrever ao Firestore em tempo real
  useEffect(() => {
    const unsubProg = subscribeFirestoreProgramacao(async (firebaseList) => {
      const celulaExistente = firebaseList.find(i => i.isFixa || i.id === 'celula_fixa');
      let initialList = [...firebaseList];

      if (!celulaExistente) {
        const defaultCelula: ProgramacaoItem = {
          id: 'celula_fixa',
          titulo: 'CÉLULA EVANGELÍSTICA TSUNAMI',
          isFixa: true,
          hora: '19:30',
          dias: ['seg', 'qua', 'sex']
        };
        await saveFirestoreProgramacao(defaultCelula);
        initialList.push(defaultCelula);
      }

      setItems(initialList);
      setLoading(false);
    });

    const unsubAlunos = subscribeFirestoreAlunos((listaAlunos) => {
      setAlunos(listaAlunos);
    });

    const unsubPerms = subscribeFirestorePermissoesEsporte((map) => {
      setPermissoesMap(map);
    });

    const unsubConfig = subscribeFirestoreConfiguracaoEsporte((trancado) => {
      setInscricoesTrancadas(trancado);
    });

    return () => {
      unsubProg();
      unsubAlunos();
      unsubPerms();
      unsubConfig();
    };
  }, []);

  // Item fixo da Célula
  const celulaItem = items.find(i => i.isFixa || i.id === 'celula_fixa') || {
    id: 'celula_fixa',
    titulo: 'CÉLULA EVANGELÍSTICA TSUNAMI',
    isFixa: true,
    hora: '19:30',
    dias: ['seg', 'qua', 'sex']
  };

  // Atividades dinâmicas de esporte
  const atividadesDinamicas = items.filter(i => !(i.isFixa || i.id === 'celula_fixa'));

  // Alternar dia da semana de um item
  const handleToggleDia = async (item: ProgramacaoItem, diaKey: string) => {
    const jaTem = item.dias.includes(diaKey);
    const novosDiasArr = jaTem 
      ? item.dias.filter(d => d !== diaKey) 
      : [...item.dias, diaKey];

    const itemAtualizado: ProgramacaoItem = {
      ...item,
      dias: novosDiasArr
    };

    setItems(prev => prev.map(i => i.id === item.id ? itemAtualizado : i));
    await saveFirestoreProgramacao(itemAtualizado);
    triggerSuccessAnimation(item.id);
  };

  // Alterar hora de um item
  const handleHoraChange = async (item: ProgramacaoItem, novaHoraVal: string) => {
    const itemAtualizado: ProgramacaoItem = {
      ...item,
      hora: novaHoraVal
    };

    setItems(prev => prev.map(i => i.id === item.id ? itemAtualizado : i));
    await saveFirestoreProgramacao(itemAtualizado);
    triggerSuccessAnimation(item.id);
  };

  // Criar nova atividade dinâmica (+ ATIVIDADE)
  const handleAdicionarAtividade = async (e: React.FormEvent) => {
    e.preventDefault();
    const tituloFinal = novoTitulo.trim().toUpperCase() || 'NOVA ATIVIDADE ESPORTIVA';

    const nova: ProgramacaoItem = {
      id: 'act_' + Date.now(),
      titulo: tituloFinal,
      isFixa: false,
      hora: novaHora || '18:00',
      dias: novosDias.length > 0 ? novosDias : ['seg', 'ter', 'qua', 'qui', 'sex']
    };

    await saveFirestoreProgramacao(nova);
    setShowModal(false);
    setNovoTitulo('');
    setNovaHora('18:00');
    setNovosDias(['seg', 'ter', 'qua', 'qui', 'sex']);
    triggerSuccessAnimation(nova.id);
  };

  // Salvar título editado
  const handleSalvarTituloEditado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    await saveFirestoreProgramacao(editingItem);
    setEditingItem(null);
    triggerSuccessAnimation(editingItem.id);
  };

  // Excluir atividade dinâmica
  const handleExcluirAtividade = async (id: string) => {
    if (window.confirm('Deseja realmente apagar esta atividade esportiva?')) {
      await deleteFirestoreProgramacao(id);
      setItems(prev => prev.filter(i => i.id !== id));
    }
  };

  const triggerSuccessAnimation = (id: string) => {
    setSaveSuccessId(id);
    setTimeout(() => {
      setSaveSuccessId(null);
    }, 1500);
  };

  const toggleDiaModal = (diaKey: string) => {
    if (novosDias.includes(diaKey)) {
      setNovosDias(novosDias.filter(d => d !== diaKey));
    } else {
      setNovosDias([...novosDias, diaKey]);
    }
  };

  // ========================================================
  // LÓGICA DO CONTROLE DE ALUNOS & ACESSOS
  // ========================================================
  const getPermissaoAluno = (aluno: Aluno): PermissaoAlunoEsporte => {
    const key = aluno.nome.trim().toUpperCase();
    if (permissoesMap[key]) {
      return permissoesMap[key];
    }
    // Permissão padrão
    return {
      alunoNome: aluno.nome,
      turma: aluno.turma || '',
      liberado: true,
      aulasPermitidas: atividadesDinamicas.map(a => a.titulo),
      liberadoJustificativa: false
    };
  };

  // Toggle Liberar/Bloquear Geral do Aluno
  const handleToggleLiberarAluno = async (aluno: Aluno, novoStatusLiberado: boolean) => {
    const atual = getPermissaoAluno(aluno);
    const atualizada: PermissaoAlunoEsporte = {
      ...atual,
      liberado: novoStatusLiberado
    };
    await saveFirestorePermissaoEsporte(atualizada);
  };

  // Toggle Aula Permitida específica para o Aluno
  const handleToggleAulaPermitida = async (aluno: Aluno, tituloAula: string) => {
    const atual = getPermissaoAluno(aluno);
    const temAula = atual.aulasPermitidas.includes(tituloAula);
    const novasAulas = temAula
      ? atual.aulasPermitidas.filter(a => a !== tituloAula)
      : [...atual.aulasPermitidas, tituloAula];

    const atualizada: PermissaoAlunoEsporte = {
      ...atual,
      aulasPermitidas: novasAulas
    };
    await saveFirestorePermissaoEsporte(atualizada);
  };

  // Toggle Liberar/Bloquear Justificar Ausência do Aluno
  const handleToggleJustificarAluno = async (aluno: Aluno, novoStatusJustificar: boolean) => {
    const atual = getPermissaoAluno(aluno);
    const atualizada: PermissaoAlunoEsporte = {
      ...atual,
      liberadoJustificativa: novoStatusJustificar
    };
    await saveFirestorePermissaoEsporte(atualizada);
  };

  // Ações em Lote (Batch)
  const handleLiberarTodos = async () => {
    const atualizados = alunos.map(aluno => {
      const p = getPermissaoAluno(aluno);
      return { ...p, liberado: true };
    });
    await batchSaveFirestorePermissoesEsporte(atualizados);
  };

  const handleBloquearTodos = async () => {
    const atualizados = alunos.map(aluno => {
      const p = getPermissaoAluno(aluno);
      return { ...p, liberado: false };
    });
    await batchSaveFirestorePermissoesEsporte(atualizados);
  };

  const handleBloquearJustificarTodos = async () => {
    const atualizados = alunos.map(aluno => {
      const p = getPermissaoAluno(aluno);
      return { ...p, liberadoJustificativa: false };
    });
    await batchSaveFirestorePermissoesEsporte(atualizados);
  };

  const handleToggleTrancarInscricoes = async () => {
    const novoStatus = !inscricoesTrancadas;
    setInscricoesTrancadas(novoStatus);
    await saveFirestoreConfiguracaoEsporte(novoStatus);
  };

  const handleResetarInscricoes = async () => {
    if (window.confirm('Deseja realmente RESETAR E APAGAR TODAS AS INSCRIÇÕES já realizadas pelos alunos?\n\nIsso limpará instantaneamente a Lista de Inscrição no banco de dados e na tela inicial.')) {
      await clearAllFirestoreInscricoesEsporte();
      alert('✅ Todas as pré-inscrições foram apagadas e a Lista de Inscrição foi zerada com sucesso!');
    }
  };

  // Lista de alunos filtrada
  const alunosFiltrados = alunos.filter(aluno => {
    const perm = getPermissaoAluno(aluno);
    const matchNome = aluno.nome.toLowerCase().includes(buscaAluno.toLowerCase()) ||
                      (aluno.turma || '').toLowerCase().includes(buscaAluno.toLowerCase());

    if (!matchNome) return false;

    if (filtroStatus === 'liberados-justificar') {
      return perm.liberadoJustificativa === true;
    }
    if (filtroStatus === 'sem-autorizacao') {
      return perm.liberado === false;
    }
    return true;
  });

  // Contagens para os Filtros Tab
  const countTodos = alunos.length;
  const countLiberadosJustificar = alunos.filter(a => getPermissaoAluno(a).liberadoJustificativa).length;
  const countSemAutorizacao = alunos.filter(a => !getPermissaoAluno(a).liberado).length;

  return (
    <div className="min-h-screen w-full bg-[#07080f] text-white font-rajdhani p-4 md:p-8 relative">
      
      {/* Dynamic cyberpunk grid background */}
      <div 
        className="fixed inset-0 pointer-events-none z-0" 
        style={{
          backgroundImage: `
            linear-gradient(rgba(234, 179, 8, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(234, 179, 8, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px'
        }}
      />

      <div className="max-w-5xl mx-auto relative z-10">
        
        {/* Top Bar Navigation */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 border border-yellow-500/40 bg-yellow-500/10 text-yellow-400 px-4 py-2 rounded-xl text-xs uppercase font-extrabold hover:bg-yellow-400 hover:text-black transition cursor-pointer shadow-[0_0_15px_rgba(234,179,8,0.2)]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Painel</span>
          </button>

          <div className="text-right">
            <span className="text-[10px] text-yellow-400/80 uppercase tracking-[0.3em] font-mono block">
              PROJETO TSUNAMI
            </span>
            <span className="text-xs text-gray-400 font-semibold uppercase">
              Área de Esporte & Célula
            </span>
          </div>
        </div>

        {/* Header Title Lockup */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/40 text-yellow-400 mb-3 shadow-[0_0_25px_rgba(234,179,8,0.25)]">
            <Trophy className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black font-chakra tracking-[0.2em] text-yellow-400 uppercase drop-shadow-[0_0_25px_rgba(234,179,8,0.4)]">
            PROGRAMAÇÃO ESPORTIVA
          </h1>
          <p className="text-xs md:text-sm text-yellow-200/70 uppercase tracking-[0.3em] mt-2 font-medium">
            Cronograma Semanal de Treinos e Encontros
          </p>
          <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent mx-auto mt-4"></div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-yellow-400">
            <RefreshCw className="w-8 h-8 animate-spin mb-3" />
            <span className="text-xs uppercase font-bold tracking-widest">Carregando programação do banco...</span>
          </div>
        ) : (
          <div className="space-y-10">
            
            {/* ======================================================== */}
            {/* 1. SEÇÃO FIXA: CÉLULA EVANGELÍSTICA TSUNAMI */}
            {/* ======================================================== */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-500 pointer-events-none"></div>
              
              <div className="relative bg-[#0b0e1b] border-2 border-yellow-500/80 rounded-2xl p-6 md:p-7 shadow-[0_0_30px_rgba(234,179,8,0.2)]">
                
                {/* Header Tag */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-yellow-500/30">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-yellow-500/20 border border-yellow-400 flex items-center justify-center text-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.4)]">
                      <Flame className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-yellow-400/80 tracking-widest bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/30">
                        ESSA DA CÉLULA É FIXA
                      </span>
                      <h2 className="text-xl md:text-2xl font-extrabold text-white uppercase tracking-wider font-chakra mt-1">
                        {celulaItem.titulo}
                      </h2>
                    </div>
                  </div>

                  {saveSuccessId === celulaItem.id && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold uppercase animate-bounce">
                      <Check className="w-4 h-4" /> Salvo
                    </span>
                  )}
                </div>

                {/* Hora & Dias */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  
                  {/* Hora Input */}
                  <div className="md:col-span-4 bg-gray-900/90 border border-yellow-500/40 rounded-xl p-3 flex items-center justify-between gap-3 shadow-inner">
                    <div className="flex items-center gap-2 text-yellow-400 font-bold uppercase text-xs">
                      <Clock className="w-4 h-4" />
                      <span>Hora:</span>
                    </div>
                    <div className="flex items-center text-yellow-400 font-mono font-bold text-lg">
                      <span className="text-gray-400 text-sm mr-1">(</span>
                      <input 
                        type="time" 
                        value={celulaItem.hora || '19:30'}
                        onChange={(e) => handleHoraChange(celulaItem, e.target.value)}
                        className="bg-black/60 border border-yellow-500/40 text-yellow-400 font-mono text-base px-2 py-1 rounded outline-none focus:border-yellow-400 text-center cursor-pointer"
                      />
                      <span className="text-gray-400 text-sm ml-1">)</span>
                    </div>
                  </div>

                  {/* Dias Selector */}
                  <div className="md:col-span-8 bg-gray-900/90 border border-yellow-500/40 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-yellow-400 font-bold uppercase text-xs">
                      <Calendar className="w-4 h-4" />
                      <span>Dia:</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 md:gap-2">
                      {DIAS_SEMANA.map((d) => {
                        const isSelected = celulaItem.dias.includes(d.key);
                        return (
                          <button
                            key={d.key}
                            type="button"
                            onClick={() => handleToggleDia(celulaItem, d.key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all duration-200 cursor-pointer ${
                              isSelected
                                ? 'bg-yellow-400 text-black shadow-[0_0_12px_rgba(234,179,8,0.6)] scale-105'
                                : 'bg-gray-800/80 border border-yellow-500/20 text-gray-400 hover:text-white hover:border-yellow-400/50'
                            }`}
                          >
                            ({d.label})
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>

              </div>
            </div>

            {/* Divider Notice */}
            <div className="flex items-center justify-between pt-2 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-bold uppercase text-yellow-400/90 tracking-widest">
                  ESSAS DOS ESPORTES VÃO MUDANDO
                </span>
              </div>

              {/* Botão + ATIVIDADE */}
              <button
                onClick={() => setShowModal(true)}
                className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold uppercase text-xs rounded-xl transition flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:scale-105"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ ATIVIDADE</span>
              </button>
            </div>

            {/* ======================================================== */}
            {/* 2. SEÇÕES DINÂMICAS: ATIVIDADES ESPORTIVAS */}
            {/* ======================================================== */}
            <div className="space-y-4">
              {atividadesDinamicas.length === 0 ? (
                <div className="bg-gray-900/40 border border-yellow-500/20 rounded-2xl p-10 text-center">
                  <p className="text-gray-400 text-xs uppercase tracking-widest font-bold">
                    Nenhuma atividade esportiva adicionada ainda.
                  </p>
                  <p className="text-yellow-400/70 text-xs uppercase mt-2">
                    Clique em <b>+ ATIVIDADE</b> para cadastrar.
                  </p>
                </div>
              ) : (
                atividadesDinamicas.map((item, idx) => (
                  <div 
                    key={item.id}
                    className="relative bg-[#0d1021] border border-yellow-500/40 hover:border-yellow-400 p-5 rounded-2xl transition-all duration-300 shadow-lg group hover:bg-[#11152a]"
                  >
                    {/* Header do Card */}
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-yellow-400 bg-yellow-500/10 px-2.5 py-1 rounded-lg border border-yellow-500/30 font-mono">
                          #{idx + 1}
                        </span>
                        <h3 className="text-lg md:text-xl font-bold text-white uppercase tracking-wider font-chakra flex items-center gap-2">
                          {item.titulo}
                          <button 
                            onClick={() => setEditingItem(item)}
                            className="text-gray-400 hover:text-yellow-400 transition cursor-pointer p-1"
                            title="Editar Nome da Atividade"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        {saveSuccessId === item.id && (
                          <span className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1 mr-2">
                            <Check className="w-3.5 h-3.5" /> Salvo
                          </span>
                        )}
                        <button
                          onClick={() => handleExcluirAtividade(item.id)}
                          className="p-2 text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                          title="Apagar Atividade"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Hora & Dias */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      
                      {/* Hora */}
                      <div className="md:col-span-4 bg-gray-900/80 border border-yellow-500/30 rounded-xl p-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-yellow-400 font-bold uppercase text-xs">
                          <Clock className="w-4 h-4" />
                          <span>Hora:</span>
                        </div>
                        <div className="flex items-center text-yellow-400 font-mono font-bold text-base">
                          <span className="text-gray-400 text-xs mr-1">(</span>
                          <input 
                            type="time" 
                            value={item.hora || '18:00'}
                            onChange={(e) => handleHoraChange(item, e.target.value)}
                            className="bg-black/60 border border-yellow-500/30 text-yellow-400 font-mono text-sm px-2 py-1 rounded outline-none focus:border-yellow-400 text-center cursor-pointer"
                          />
                          <span className="text-gray-400 text-xs ml-1">)</span>
                        </div>
                      </div>

                      {/* Dias */}
                      <div className="md:col-span-8 bg-gray-900/80 border border-yellow-500/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-yellow-400 font-bold uppercase text-xs">
                          <Calendar className="w-4 h-4" />
                          <span>dia:</span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 md:gap-2">
                          {DIAS_SEMANA.map((d) => {
                            const isSelected = item.dias.includes(d.key);
                            return (
                              <button
                                key={d.key}
                                type="button"
                                onClick={() => handleToggleDia(item, d.key)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-black uppercase transition-all duration-200 cursor-pointer ${
                                  isSelected
                                    ? 'bg-yellow-400 text-black shadow-[0_0_10px_rgba(234,179,8,0.5)] scale-105'
                                    : 'bg-gray-800/80 border border-yellow-500/20 text-gray-400 hover:text-white hover:border-yellow-400/50'
                                }`}
                              >
                                ({d.label})
                              </button>
                            );
                          })}
                        </div>
                      </div>

                    </div>

                  </div>
                ))
              )}
            </div>

            {/* Bottom Add Activity Button */}
            <div className="pt-2 text-center mb-12">
              <button
                onClick={() => setShowModal(true)}
                className="w-full md:w-auto px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold uppercase text-sm rounded-2xl transition flex items-center justify-center gap-3 mx-auto cursor-pointer shadow-[0_0_25px_rgba(234,179,8,0.4)] hover:scale-105"
              >
                <Plus className="w-5 h-5 stroke-[3]" />
                <span>+ ADICIONAR NOVA ATIVIDADE ESPORTIVA</span>
              </button>
            </div>

            {/* ======================================================== */}
            {/* 3. SEÇÃO CONTROLE DE ALUNOS & ACESSOS (CORRESPONDENTE À IMAGEM) */}
            {/* ======================================================== */}
            <div className="relative border-2 border-emerald-500/60 bg-[#060a14] rounded-3xl p-5 md:p-8 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
              
              {/* Header section */}
              <div className="mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-emerald-500/30">
                  <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider font-chakra flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981]"></span>
                    <span>CONTROLE DE ALUNOS & ACESSOS</span>
                  </h2>

                  {/* Top Action Buttons (Trancar / Resetar) */}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleToggleTrancarInscricoes}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition flex items-center gap-2 border cursor-pointer ${
                        inscricoesTrancadas
                          ? 'bg-rose-500/20 border-rose-500 text-rose-400 hover:bg-rose-500 hover:text-black'
                          : 'bg-emerald-500/15 border-emerald-500/80 text-emerald-400 hover:bg-emerald-500 hover:text-black'
                      }`}
                    >
                      {inscricoesTrancadas ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      <span>{inscricoesTrancadas ? 'LIBERAR INSCRIÇÕES' : 'TRANCAR INSCRIÇÕES'}</span>
                    </button>

                    <button
                      onClick={handleResetarInscricoes}
                      className="px-4 py-2 bg-rose-950/60 border border-rose-500/50 text-rose-400 hover:bg-rose-500 hover:text-black rounded-xl text-xs font-black uppercase transition flex items-center gap-2 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>RESETAR INSCRIÇÕES</span>
                    </button>
                  </div>
                </div>

                {/* Sub-Header Batch Actions Bar */}
                <div className="mt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleLiberarTodos}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-[11px] uppercase rounded-lg transition cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                    >
                      LIBERAR TODOS
                    </button>
                    <button
                      onClick={handleBloquearTodos}
                      className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-extrabold text-[11px] uppercase rounded-lg transition cursor-pointer"
                    >
                      BLOQUEAR TODOS
                    </button>
                    <button
                      onClick={handleBloquearJustificarTodos}
                      className="px-3 py-1.5 bg-emerald-950/40 border border-emerald-500/60 text-emerald-400 hover:bg-emerald-500/20 font-bold text-[11px] uppercase rounded-lg transition cursor-pointer"
                    >
                      ✕ BLOQUEAR JUSTIFICAR (TODOS)
                    </button>
                  </div>

                  {/* Filter Tabs & Search */}
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <button
                      onClick={() => setFiltroStatus('todos')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition cursor-pointer ${
                        filtroStatus === 'todos'
                          ? 'bg-emerald-500 text-black font-extrabold shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                          : 'bg-gray-900 text-emerald-400/70 border border-emerald-500/20 hover:text-white'
                      }`}
                    >
                      TODOS ({countTodos})
                    </button>
                    <button
                      onClick={() => setFiltroStatus('liberados-justificar')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition cursor-pointer ${
                        filtroStatus === 'liberados-justificar'
                          ? 'bg-emerald-500 text-black font-extrabold shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                          : 'bg-gray-900 text-emerald-400/70 border border-emerald-500/20 hover:text-white'
                      }`}
                    >
                      LIBERADOS PARA JUSTIFICAR ({countLiberadosJustificar})
                    </button>
                    <button
                      onClick={() => setFiltroStatus('sem-autorizacao')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition cursor-pointer ${
                        filtroStatus === 'sem-autorizacao'
                          ? 'bg-rose-500 text-black font-extrabold shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                          : 'bg-gray-900 text-rose-400/70 border border-rose-500/20 hover:text-white'
                      }`}
                    >
                      SEM AUTORIZAÇÃO ({countSemAutorizacao})
                    </button>
                  </div>
                </div>

                {/* Search Bar for Alunos */}
                <div className="mt-4 relative">
                  <Search className="w-4 h-4 text-emerald-400 absolute left-3 top.1/2 -translate-y-1/2 top-3.5" />
                  <input 
                    type="text" 
                    value={buscaAluno}
                    onChange={e => setBuscaAluno(e.target.value)}
                    placeholder="BUSCAR ALUNO POR NOME OU TURMA..."
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-950 border border-emerald-500/30 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-400 placeholder:text-gray-500 uppercase tracking-wider"
                  />
                </div>
              </div>

              {/* Inscrições Trancadas Warning Banner */}
              {inscricoesTrancadas && (
                <div className="mb-6 bg-rose-950/80 border-2 border-rose-500/80 rounded-2xl p-4 text-center flex items-center justify-center gap-3 text-rose-300 font-bold uppercase text-xs tracking-wider animate-pulse">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                  <span>INSCRIÇÕES TRANCADAS GLOBALMENTE PELO PROFESSOR</span>
                </div>
              )}

              {/* Student Cards Grid / List */}
              <div className="space-y-4">
                {alunosFiltrados.length === 0 ? (
                  <div className="bg-gray-950/60 border border-emerald-500/20 rounded-2xl p-10 text-center text-gray-400 text-xs uppercase font-bold tracking-widest">
                    Nenhum aluno encontrado para os filtros selecionados.
                  </div>
                ) : (
                  alunosFiltrados.map((aluno) => {
                    const perm = getPermissaoAluno(aluno);
                    return (
                      <div 
                        key={aluno.nome}
                        className="bg-[#0b0e1b] border border-emerald-500/30 rounded-2xl p-4 md:p-6 shadow-md grid grid-cols-1 md:grid-cols-12 gap-6 items-start hover:border-emerald-500/70 transition duration-200"
                      >
                        
                        {/* LEFT COLUMN: Student Name, Toggle Liberar/Bloquear, and Aulas Permitidas Checkboxes */}
                        <div className="md:col-span-7 space-y-4">
                          
                          {/* Student Header & Main Toggle */}
                          <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/5">
                            <div>
                              <h3 className="text-base md:text-lg font-black text-white uppercase tracking-wider font-chakra">
                                {aluno.nome}
                              </h3>
                              {aluno.turma && (
                                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">
                                  TURMA: {aluno.turma}
                                </span>
                              )}
                            </div>

                            {/* Liberar / Bloquear Toggle Switch Pill */}
                            <div className="flex bg-black/80 border border-emerald-500/40 p-1 rounded-xl">
                              <button
                                type="button"
                                onClick={() => handleToggleLiberarAluno(aluno, true)}
                                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition cursor-pointer ${
                                  perm.liberado
                                    ? 'bg-emerald-500 text-black shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                              >
                                LIBERAR
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleLiberarAluno(aluno, false)}
                                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition cursor-pointer ${
                                  !perm.liberado
                                    ? 'bg-rose-500 text-black shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                              >
                                BLOQUEAR
                              </button>
                            </div>
                          </div>

                          {/* AULAS PERMITIDAS Checkbox Group */}
                          <div>
                            <span className="text-xs font-black uppercase text-emerald-400 tracking-wider block mb-2.5">
                              AULAS PERMITIDAS
                            </span>

                            {atividadesDinamicas.length === 0 ? (
                              <span className="text-[11px] text-gray-500 uppercase italic">
                                Nenhuma atividade cadastrada acima.
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-2.5">
                                {atividadesDinamicas.map((act) => {
                                  const checked = perm.aulasPermitidas.includes(act.titulo);
                                  return (
                                    <button
                                      key={act.id}
                                      type="button"
                                      onClick={() => handleToggleAulaPermitida(aluno, act.titulo)}
                                      className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold uppercase transition flex items-center gap-2 cursor-pointer ${
                                        checked
                                          ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                                          : 'bg-gray-900/60 border-gray-800 text-gray-500 hover:text-white hover:border-gray-600'
                                      }`}
                                    >
                                      {checked ? (
                                        <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                                      ) : (
                                        <Square className="w-3.5 h-3.5 text-gray-600" />
                                      )}
                                      <span>{act.titulo}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                        </div>

                        {/* RIGHT COLUMN: Justificar Ausência Toggle */}
                        <div className="md:col-span-5 bg-gray-950/70 border border-emerald-500/20 rounded-2xl p-4 flex flex-col justify-between h-full space-y-4">
                          <div>
                            <span className="text-xs font-black uppercase text-white tracking-wider block mb-1">
                              JUSTIFICAR AUSÊNCIA
                            </span>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                              Autorização para o aluno justificar falta em aulas
                            </p>
                          </div>

                          <div className="flex items-center justify-end">
                            <div className="flex bg-black/80 border border-emerald-500/40 p-1 rounded-xl">
                              <button
                                type="button"
                                onClick={() => handleToggleJustificarAluno(aluno, true)}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition cursor-pointer ${
                                  perm.liberadoJustificativa
                                    ? 'bg-emerald-500 text-black shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                              >
                                LIBERAR
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleJustificarAluno(aluno, false)}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition cursor-pointer ${
                                  !perm.liberadoJustificativa
                                    ? 'bg-rose-500 text-black shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                              >
                                BLOQUEAR
                              </button>
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>

            </div>

          </div>
        )}

      </div>

      {/* ======================================================== */}
      {/* MODAL 1: CRIAR NOVA ATIVIDADE */}
      {/* ======================================================== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f1224] border-2 border-yellow-400 p-6 md:p-8 rounded-3xl max-w-lg w-full shadow-[0_0_40px_rgba(234,179,8,0.3)]">
            <h3 className="text-2xl font-black text-yellow-400 uppercase tracking-wider mb-6 flex items-center gap-3 font-chakra">
              <Plus className="w-6 h-6 stroke-[3]" />
              <span>+ NOVA ATIVIDADE</span>
            </h3>

            <form onSubmit={handleAdicionarAtividade} className="space-y-6">
              <div>
                <label className="block text-xs uppercase text-yellow-400 font-bold mb-2">
                  Nome da Atividade / Treino
                </label>
                <input 
                  type="text"
                  value={novoTitulo}
                  onChange={e => setNovoTitulo(e.target.value)}
                  placeholder="EX: TREINO DE FUTSAL SUB-15"
                  className="w-full p-3.5 rounded-xl bg-gray-900 border border-yellow-500/40 text-white outline-none focus:border-yellow-400 font-bold text-sm uppercase tracking-wider"
                  required
                />
              </div>

              <div>
                <label className="block text-xs uppercase text-yellow-400 font-bold mb-2">
                  Horário (   :  )
                </label>
                <input 
                  type="time"
                  value={novaHora}
                  onChange={e => setNovaHora(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-gray-900 border border-yellow-500/40 text-yellow-400 font-mono font-bold text-lg outline-none focus:border-yellow-400 text-center cursor-pointer"
                  required
                />
              </div>

              <div>
                <label className="block text-xs uppercase text-yellow-400 font-bold mb-2">
                  Dias da Semana Selecionados
                </label>
                <div className="flex flex-wrap gap-2">
                  {DIAS_SEMANA.map((d) => {
                    const active = novosDias.includes(d.key);
                    return (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => toggleDiaModal(d.key)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase transition cursor-pointer ${
                          active
                            ? 'bg-yellow-400 text-black shadow-[0_0_12px_rgba(234,179,8,0.5)]'
                            : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
                        }`}
                      >
                        ({d.label})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-700 text-gray-400 p-3.5 rounded-xl uppercase text-xs font-bold hover:bg-gray-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-yellow-400 text-black p-3.5 rounded-xl uppercase text-xs font-black hover:bg-yellow-300 transition cursor-pointer shadow-[0_0_20px_rgba(234,179,8,0.4)]"
                >
                  Salvar Atividade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: EDITAR TÍTULO DA ATIVIDADE */}
      {/* ======================================================== */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f1224] border-2 border-yellow-400 p-6 rounded-3xl max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-yellow-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              <span>Editar Nome da Atividade</span>
            </h3>

            <form onSubmit={handleSalvarTituloEditado} className="space-y-4">
              <div>
                <label className="block text-xs uppercase text-yellow-400 font-bold mb-1">
                  Título da Atividade
                </label>
                <input 
                  type="text"
                  value={editingItem.titulo}
                  onChange={e => setEditingItem({ ...editingItem, titulo: e.target.value.toUpperCase() })}
                  className="w-full p-3.5 rounded-xl bg-gray-900 border border-yellow-500/40 text-white outline-none focus:border-yellow-400 font-bold text-sm uppercase"
                  required
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button 
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 border border-gray-700 text-gray-400 p-3 rounded-xl uppercase text-xs font-bold hover:bg-gray-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-yellow-400 text-black p-3 rounded-xl uppercase text-xs font-black hover:bg-yellow-300 transition cursor-pointer shadow-[0_0_15px_rgba(234,179,8,0.4)]"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
