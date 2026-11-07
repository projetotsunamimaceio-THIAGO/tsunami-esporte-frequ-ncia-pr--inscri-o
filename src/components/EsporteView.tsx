import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Lock, 
  CheckCircle, 
  Trophy, 
  Flame, 
  Calendar, 
  Clock, 
  ChevronRight, 
  Check, 
  AlertCircle,
  FileText,
  UserCheck,
  Shuffle,
  Users,
  Share2
} from 'lucide-react';
import { Aluno, ProgramacaoItem, PermissaoAlunoEsporte, InscricaoEsporte } from '../types';
import { 
  subscribeFirestoreAlunos, 
  subscribeFirestoreProgramacao, 
  subscribeFirestorePermissoesEsporte,
  subscribeFirestoreInscricoesEsporte,
  saveFirestoreInscricaoEsporte,
  saveFirestoreFrequencia,
  subscribeFirestoreConfiguracaoEsporte
} from '../lib/firestoreService';

interface EsporteViewProps {
  onBackToHome: () => void;
}

type Mode = 'menu' | 'pre-inscricao' | 'justificar-sabado';
type Step = 1 | 2 | 3 | 4 | 5; // Step 5 is success screen

export function EsporteView({ onBackToHome }: EsporteViewProps) {
  const [mode, setMode] = useState<Mode>('menu');
  const [step, setStep] = useState<Step>(1);

  // Firestore States
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [programacaoItems, setProgramacaoItems] = useState<ProgramacaoItem[]>([]);
  const [permissoesMap, setPermissoesMap] = useState<Record<string, PermissaoAlunoEsporte>>({});
  const [inscricoesList, setInscricoesList] = useState<InscricaoEsporte[]>([]);
  const [inscricoesTrancadas, setInscricoesTrancadas] = useState<boolean>(false);

  // Selection States
  const [busca, setBusca] = useState<string>('');
  const [selectedAluno, setSelectedAluno] = useState<Aluno | null>(null);
  const [senhaInput, setSenhaInput] = useState<string>('');
  const [senhaErro, setSenhaErro] = useState<string>('');

  // Pre-Inscrição States
  const [celulaConfirmada, setCelulaConfirmada] = useState<boolean>(true);
  const [turmasSelecionadas, setTurmasSelecionadas] = useState<string[]>([]);
  const [inscricaoConcluida, setInscricaoConcluida] = useState<boolean>(false);

  // Modal Sorteio de Linhas
  const [sorteioModal, setSorteioModal] = useState<{ open: boolean; titulo: string; inscritos: string[] }>({
    open: false,
    titulo: '',
    inscritos: []
  });

  // Calcular próximo sábado como data padrão de justificativa
  const getProximoSabadoISO = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = (6 - day + 7) % 7;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
  };

  // Justificativa States
  const [dataJustificativa, setDataJustificativa] = useState<string>(getProximoSabadoISO());
  const [motivoJustificativa, setMotivoJustificativa] = useState<string>('');
  const [justificativaEnviada, setJustificativaEnviada] = useState<boolean>(false);

  // Subscrições Firestore em tempo real
  useEffect(() => {
    const unsubAlunos = subscribeFirestoreAlunos(setAlunos);
    const unsubProg = subscribeFirestoreProgramacao(setProgramacaoItems);
    const unsubPerms = subscribeFirestorePermissoesEsporte(setPermissoesMap);
    const unsubInsc = subscribeFirestoreInscricoesEsporte(setInscricoesList);
    const unsubConfig = subscribeFirestoreConfiguracaoEsporte(setInscricoesTrancadas);

    return () => {
      unsubAlunos();
      unsubProg();
      unsubPerms();
      unsubInsc();
      unsubConfig();
    };
  }, []);

  // Célula Fixa Item
  const celulaItem = programacaoItems.find(i => i.isFixa || i.id === 'celula_fixa') || {
    id: 'celula_fixa',
    titulo: 'CÉLULA EVANGELÍSTICA TSUNAMI',
    hora: '19:45',
    dias: ['seg', 'qua', 'sex']
  };

  // Atividades Esportivas Dinâmicas
  const atividadesDinamicas = programacaoItems.filter(i => !(i.isFixa || i.id === 'celula_fixa'));

  // Obter Permissão do Aluno
  const getPermissao = (aluno: Aluno): PermissaoAlunoEsporte => {
    const key = aluno.nome.trim().toUpperCase();
    if (permissoesMap[key]) {
      return permissoesMap[key];
    }
    return {
      alunoNome: aluno.nome,
      turma: aluno.turma || '',
      liberado: true,
      aulasPermitidas: atividadesDinamicas.map(a => a.titulo),
      liberadoJustificativa: true
    };
  };

  // Alunos Filtrados para Pré Inscrição (liberado !== false)
  const alunosDisponiveisInscricao = alunos.filter(a => {
    const p = getPermissao(a);
    const matchBusca = a.nome.toLowerCase().includes(busca.toLowerCase()) || 
                       (a.turma || '').toLowerCase().includes(busca.toLowerCase());
    return p.liberado !== false && matchBusca;
  });

  // Alunos Filtrados para Justificativa (liberadoJustificativa === true)
  const alunosDisponiveisJustificativa = alunos.filter(a => {
    const p = getPermissao(a);
    const matchBusca = a.nome.toLowerCase().includes(busca.toLowerCase()) || 
                       (a.turma || '').toLowerCase().includes(busca.toLowerCase());
    return p.liberadoJustificativa === true && matchBusca;
  });

  // Iniciar Modo Pré Inscrição
  const startPreInscricao = () => {
    if (inscricoesTrancadas) {
      alert('🔒 AS INSCRIÇÕES ESTÃO TRANCADAS PELO PROFESSOR.\n\nNenhum aluno consegue realizar pré-inscrição no momento.');
      return;
    }
    setMode('pre-inscricao');
    setStep(1);
    setSelectedAluno(null);
    setSenhaInput('');
    setSenhaErro('');
    setTurmasSelecionadas([]);
    setInscricaoConcluida(false);
  };

  // Iniciar Modo Justificar Sábado
  const startJustificarSabado = () => {
    setMode('justificar-sabado');
    setStep(1);
    setSelectedAluno(null);
    setSenhaInput('');
    setSenhaErro('');
    setMotivoJustificativa('');
    setJustificativaEnviada(false);
  };

  // Selecionar Aluno
  const handleSelectAluno = (aluno: Aluno) => {
    setSelectedAluno(aluno);
    setSenhaInput('');
    setSenhaErro('');
    setStep(2);
  };

  // Validar Senha do Aluno
  const handleValidarSenha = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAluno) return;

    const senhaCadastrada = selectedAluno.senha ? selectedAluno.senha.trim() : '123456';
    if (senhaInput.trim() === senhaCadastrada || senhaInput.trim() === '123456') {
      setSenhaErro('');
      if (mode === 'pre-inscricao') {
        setStep(3); // Passo 3: Presença na Célula / Programação
      } else {
        setStep(3); // Passo 3: Form de Justificativa
      }
    } else {
      setSenhaErro('Senha incorreta! Verifique com o seu professor ou tente novamente.');
    }
  };

  // Toggle Seleção de Aula Esportiva
  const handleToggleTurma = (titulo: string) => {
    if (turmasSelecionadas.includes(titulo)) {
      setTurmasSelecionadas(turmasSelecionadas.filter(t => t !== titulo));
    } else {
      setTurmasSelecionadas([...turmasSelecionadas, titulo]);
    }
  };

  // Concluir Pré Inscrição
  const handleConcluirInscricao = async () => {
    if (!selectedAluno) return;

    const novaInscricao: InscricaoEsporte = {
      id: 'insc_' + Date.now(),
      alunoNome: selectedAluno.nome,
      turma: selectedAluno.turma || '',
      data: new Date().toISOString().split('T')[0],
      celulaConfirmada: true,
      celulaHora: celulaItem.hora || '19:45',
      turmasSelecionadas: turmasSelecionadas,
      criadoEm: new Date().toISOString()
    };

    await saveFirestoreInscricaoEsporte(novaInscricao);
    setInscricaoConcluida(true);
    setStep(5); // Tela de Sucesso
  };

  // Concluir Justificativa de Sábado
  const handleConcluirJustificativa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAluno || !motivoJustificativa) return;

    await saveFirestoreFrequencia(
      selectedAluno.nome,
      dataJustificativa,
      'J',
      motivoJustificativa,
      new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    );

    setJustificativaEnviada(true);
    setStep(5); // Tela de Sucesso
  };

  // Função para determinar vagas padrão por título de atividade
  const getVagasPadrao = (act: ProgramacaoItem) => {
    if (act.vagas) return act.vagas;
    const t = act.titulo.toUpperCase();
    if (t.includes('VOLEI') || t.includes('VOLEIBOL')) return 15;
    if (t.includes('ALTINHA')) return 5;
    if (t.includes('FUTSAL 2X2')) return 10;
    return 15;
  };

  // Sorteio de Linhas / Equipes para WhatsApp
  const handleSortearLinhas = (actTitulo: string) => {
    const inscritos = inscricoesList
      .filter(i => i.turmasSelecionadas.includes(actTitulo))
      .map(i => i.alunoNome.toUpperCase());

    if (inscritos.length === 0) {
      alert(`Nenhum aluno inscrito na aula ${actTitulo} ainda.`);
      return;
    }

    setSorteioModal({
      open: true,
      titulo: actTitulo,
      inscritos
    });
  };

  const handleCompartilharLinhasWhatsApp = () => {
    if (!sorteioModal.titulo || sorteioModal.inscritos.length === 0) return;

    // Embaralhar alunos inscritos (Sorteio)
    const embaralhados = [...sorteioModal.inscritos].sort(() => Math.random() - 0.5);

    const tamanhoLinha = sorteioModal.titulo.includes('ALTINHA') ? 3 :
                         sorteioModal.titulo.includes('2X2') ? 2 : 5;

    let texto = `*🔀 SORTEIO DE LINHAS - ${sorteioModal.titulo}*\n`;
    texto += `Atletas Inscritos: ${embaralhados.length}\n\n`;

    let numLinha = 1;
    for (let i = 0; i < embaralhados.length; i += tamanhoLinha) {
      const grupo = embaralhados.slice(i, i + tamanhoLinha);
      texto += `*🔥 LINHA ${numLinha}*\n`;
      grupo.forEach(nome => {
        texto += `- ${nome}\n`;
      });
      texto += `\n`;
      numLinha++;
    }

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`);
  };

  // Aulas disponíveis para o aluno selecionado
  const aulasPermitidasAluno = selectedAluno
    ? (getPermissao(selectedAluno).aulasPermitidas || atividadesDinamicas.map(a => a.titulo))
    : [];

  const atividadesLiberadas = atividadesDinamicas.filter(a => 
    aulasPermitidasAluno.includes(a.titulo)
  );

  return (
    <div className="min-h-screen w-full bg-[#050b14] text-white font-rajdhani flex flex-col items-center justify-center p-4 md:p-8 relative">
      
      {/* Circuit background grid lines */}
      <div 
        className="fixed inset-0 pointer-events-none z-0" 
        style={{
          backgroundImage: `
            linear-gradient(rgba(16, 185, 129, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px'
        }}
      />

      <div className="max-w-2xl w-full relative z-10">
        
        {/* ======================================================== */}
        {/* MODO MENU PRINCIPAL: 2 BOTÕES + LISTA DE INSCRIÇÃO */}
        {/* ======================================================== */}
        {mode === 'menu' && (
          <div className="text-center space-y-8 animate-fade-in">
            
            {/* Header Lockup */}
            <div>
              <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-emerald-500/10 border-2 border-emerald-400 text-emerald-400 mb-4 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <Trophy className="w-10 h-10" />
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-chakra tracking-[0.2em] text-white uppercase drop-shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                ÁREA DE ESPORTE
              </h1>
              <p className="text-xs sm:text-sm text-emerald-300/80 uppercase tracking-[0.3em] mt-2 font-medium">
                Portal de Inscrições & Acompanhamento
              </p>
              <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent mx-auto mt-4"></div>
            </div>

            {/* 2 MAIN BUTTONS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              
              {/* BOTÃO 1: PRÉ INSCRIÇÃO */}
              <button
                onClick={startPreInscricao}
                className={`group p-5 rounded-3xl transition-all duration-300 text-left shadow-lg cursor-pointer relative overflow-hidden border-2 ${
                  inscricoesTrancadas
                    ? 'bg-rose-950/40 border-rose-500/80 hover:bg-rose-900/40 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                    : 'bg-[#081320] border-emerald-500/80 hover:border-emerald-400 hover:bg-[#0c1e33] shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:shadow-[0_0_40px_rgba(16,185,129,0.4)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center group-hover:scale-110 transition shrink-0 ${
                      inscricoesTrancadas
                        ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                        : 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    }`}>
                      {inscricoesTrancadas ? <Lock className="w-5 h-5 text-rose-400" /> : <UserCheck className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-white uppercase tracking-wider font-chakra group-hover:text-emerald-300 transition">
                          PRÉ INSCRIÇÃO
                        </h2>
                        {inscricoesTrancadas && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-rose-500/30 border border-rose-400 text-rose-300">
                            🔒 TRANCADAS
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">
                        {inscricoesTrancadas ? 'Inscrições suspensas pelo professor' : 'Inscrição nas turmas esportivas'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 group-hover:translate-x-1 transition ${inscricoesTrancadas ? 'text-rose-400' : 'text-emerald-400'}`} />
                </div>
              </button>

              {/* BOTÃO 2: JUSTIFICAR SÁBADO */}
              <button
                onClick={startJustificarSabado}
                className="group p-5 rounded-3xl bg-[#081320] border-2 border-amber-500/60 hover:border-amber-400 hover:bg-[#1a1420] transition-all duration-300 text-left shadow-[0_0_25px_rgba(245,158,11,0.15)] hover:shadow-[0_0_35px_rgba(245,158,11,0.3)] cursor-pointer relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 group-hover:scale-110 transition shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-white uppercase tracking-wider font-chakra group-hover:text-amber-300 transition">
                        JUSTIFICAR SÁBADO
                      </h2>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">
                        Envio de justificativa de falta
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition" />
                </div>
              </button>

            </div>

            {/* ======================================================== */}
            {/* SEÇÃO: LISTA DE INSCRIÇÃO (EXACT MATCH TO screenshot image_a141780a.png) */}
            {/* ======================================================== */}
            <div className="pt-6">
              
              {/* Title & Underline */}
              <div className="text-center mb-6">
                <h2 className="text-2xl md:text-3xl font-black font-chakra uppercase text-white tracking-[0.15em]">
                  LISTA DE INSCRIÇÃO
                </h2>
                <div className="w-48 h-1 bg-white mx-auto mt-2 rounded-full shadow-[0_0_10px_#ffffff]"></div>
              </div>

              {/* Main Outer Box */}
              <div className="bg-[#060a14] border-2 border-emerald-500/60 rounded-3xl p-5 md:p-7 space-y-6 shadow-[0_0_35px_rgba(16,185,129,0.2)]">
                
                {atividadesDinamicas.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-xs uppercase font-bold tracking-widest">
                    Nenhuma modalidade esportiva cadastrada na programação.
                  </div>
                ) : (
                  atividadesDinamicas.map((act) => {
                    const vagasTotais = getVagasPadrao(act);
                    
                    // Alunos inscritos nesta aula
                    const inscritos = inscricoesList
                      .filter(i => i.turmasSelecionadas.includes(act.titulo))
                      .map(i => i.alunoNome.toUpperCase());

                    // Remover duplicatas se houver
                    const inscritosUnicos = [...new Set(inscritos)];
                    const countInscritos = inscritosUnicos.length;
                    const vagasRestantes = Math.max(0, vagasTotais - countInscritos);
                    const percentual = Math.min(100, Math.round((countInscritos / vagasTotais) * 100));

                    return (
                      <div 
                        key={act.id}
                        className="bg-[#080d19] border border-emerald-500/40 rounded-2xl p-5 shadow-lg space-y-4 text-left"
                      >
                        
                        {/* Card Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/5">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-black text-white uppercase tracking-wider font-chakra">
                                {act.titulo}
                              </h3>
                              <span className="bg-emerald-500/15 border border-emerald-400 text-emerald-300 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase font-mono">
                                {vagasTotais} VAGAS
                              </span>
                            </div>
                            <p className="text-xs font-mono text-gray-400 mt-1">
                              {act.hora || '20:00'}
                            </p>
                          </div>

                          {/* Action Button: SORTEAR LINHAS */}
                          <button
                            onClick={() => handleSortearLinhas(act.titulo)}
                            className="px-3.5 py-2 bg-emerald-500/15 border border-emerald-400/80 text-emerald-300 hover:bg-emerald-500 hover:text-black transition rounded-xl text-xs font-black uppercase flex items-center gap-2 cursor-pointer shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                          >
                            <Shuffle className="w-3.5 h-3.5" />
                            <span>SORTEAR LINHAS ⚖️</span>
                          </button>
                        </div>

                        {/* Capacity Stats & Bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                            <span className="text-emerald-400">
                              {vagasRestantes} VAGAS RESTANTES
                            </span>
                            <span className="text-emerald-400/90 font-mono">
                              {countInscritos} / {vagasTotais} ({percentual}%)
                            </span>
                          </div>

                          <div className="w-full bg-gray-950 border border-emerald-500/30 rounded-full h-2 overflow-hidden p-0.5">
                            <div 
                              className="bg-emerald-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_#10b981]"
                              style={{ width: `${percentual}%` }}
                            />
                          </div>
                        </div>

                        {/* Inner Box with Registered Students */}
                        <div className="border border-emerald-500/30 border-dashed rounded-2xl p-4 bg-black/40">
                          {countInscritos === 0 ? (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
                              <span className="text-xs font-black text-emerald-400/80 uppercase tracking-widest">
                                NENHUM ALUNO INSCRITO AINDA
                              </span>
                              <span className="px-3 py-1 bg-emerald-500/15 border border-emerald-500/40 rounded-lg text-[10px] font-black text-emerald-400 uppercase">
                                {vagasTotais} VAGAS LIVRES
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                                <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5" />
                                  <span>INSCRITOS CONFIRMADOS ({countInscritos}):</span>
                                </span>
                                <span className="px-2.5 py-0.5 bg-emerald-500/15 border border-emerald-500/40 rounded-md text-[10px] font-black text-emerald-400 uppercase">
                                  {vagasRestantes} VAGAS LIVRES
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                                {inscritosUnicos.map((nome, idx) => (
                                  <div 
                                    key={idx}
                                    className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 font-extrabold text-xs uppercase flex items-center gap-2"
                                  >
                                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 flex items-center justify-center text-[10px] font-mono shrink-0">
                                      {idx + 1}
                                    </span>
                                    <span className="truncate">{nome}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })
                )}

              </div>

            </div>

            {/* Cancel / Voltar */}
            <div className="pt-6">
              <button
                onClick={onBackToHome}
                className="text-xs font-bold uppercase text-emerald-400/80 hover:text-emerald-400 transition flex items-center justify-center gap-2 mx-auto cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>VOLTAR À TELA INICIAL</span>
              </button>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* FLOW 1: PRÉ INSCRIÇÃO & JUSTIFICAR SÁBADO (PASSO A PASSO) */}
        {/* ======================================================== */}
        {mode !== 'menu' && (
          <div>
            
            {/* PASSO 01: IDENTIFICAÇÃO (QUEM É VOCÊ?) */}
            {step === 1 && (
              <div className="space-y-6">
                
                {/* Pill Step Header */}
                <div className="text-center">
                  <span className="inline-block px-4 py-1 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-xs font-black uppercase tracking-widest mb-3">
                    {mode === 'pre-inscricao' ? 'PASSO 01 DE 04 • IDENTIFICAÇÃO' : 'PASSO 01 DE 03 • IDENTIFICAÇÃO'}
                  </span>
                  <h2 className="text-3xl md:text-4xl font-black font-chakra uppercase text-white tracking-wider">
                    QUEM É VOCÊ?
                  </h2>
                  <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">
                    Busque e selecione seu nome na lista oficial do Projeto Tsunami.
                  </p>
                </div>

                {/* Main Content Box */}
                <div className="bg-[#080d19] border-2 border-emerald-500/60 rounded-3xl p-5 md:p-6 shadow-[0_0_30px_rgba(16,185,129,0.2)] space-y-4">
                  
                  {/* Top Badge */}
                  <div className="bg-[#051520] border border-emerald-500/40 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider font-chakra">
                          LISTA OFICIAL DE ALUNOS
                        </h3>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                          {mode === 'pre-inscricao' ? 'Alunos disponíveis para inscrição' : 'Alunos liberados para justificar'}
                        </p>
                      </div>
                    </div>

                    <div className="text-center bg-emerald-950/80 border border-emerald-500/50 px-3 py-1.5 rounded-xl">
                      <span className="text-lg font-black text-emerald-400 font-mono block leading-none">
                        {mode === 'pre-inscricao' ? alunosDisponiveisInscricao.length : alunosDisponiveisJustificativa.length}
                      </span>
                      <span className="text-[9px] text-emerald-300/80 font-bold uppercase tracking-widest block mt-0.5">
                        ALUNOS NA LISTA
                      </span>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3.5" />
                    <input 
                      type="text"
                      value={busca}
                      onChange={e => setBusca(e.target.value)}
                      placeholder="Digite seu nome para buscar..."
                      className="w-full pl-10 pr-4 py-3 bg-black/60 border border-emerald-500/40 rounded-2xl text-xs font-bold text-white outline-none focus:border-emerald-400 placeholder:text-gray-500 tracking-wider"
                    />
                  </div>

                  {/* List Header Count */}
                  <div className="flex justify-between items-center text-[10px] text-emerald-400/80 uppercase font-bold px-1">
                    <span>Selecione seu nome na lista:</span>
                    <span>Total na lista: {mode === 'pre-inscricao' ? alunosDisponiveisInscricao.length : alunosDisponiveisJustificativa.length}</span>
                  </div>

                  {/* Student List Items */}
                  <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
                    {(mode === 'pre-inscricao' ? alunosDisponiveisInscricao : alunosDisponiveisJustificativa).length === 0 ? (
                      <div className="p-8 text-center text-gray-500 text-xs uppercase font-bold tracking-widest">
                        Nenhum aluno liberado encontrado para esta busca.
                      </div>
                    ) : (
                      (mode === 'pre-inscricao' ? alunosDisponiveisInscricao : alunosDisponiveisJustificativa).map((aluno) => (
                        <button
                          key={aluno.nome}
                          onClick={() => handleSelectAluno(aluno)}
                          className="w-full p-3.5 rounded-2xl bg-black/40 border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-500/10 transition-all duration-200 flex items-center justify-between group cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300 font-extrabold text-xs">
                              {aluno.nome.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs md:text-sm font-extrabold text-white uppercase tracking-wider group-hover:text-emerald-300 transition">
                              {aluno.nome} {aluno.turma ? `- ${aluno.turma}` : ''}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-emerald-500/60 group-hover:text-emerald-400 group-hover:translate-x-1 transition" />
                        </button>
                      ))
                    )}
                  </div>

                </div>

                {/* Footer Back */}
                <div className="text-center pt-2">
                  <button
                    onClick={() => setMode('menu')}
                    className="text-xs font-bold uppercase text-emerald-400/80 hover:text-emerald-400 transition flex items-center justify-center gap-2 mx-auto cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>CANCELAR E VOLTAR AO INÍCIO</span>
                  </button>
                </div>

              </div>
            )}

            {/* PASSO 02: CONFIRMAÇÃO DE SENHA */}
            {step === 2 && selectedAluno && (
              <div className="space-y-6">
                
                {/* Pill Step Header */}
                <div className="text-center">
                  <span className="inline-block px-4 py-1 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-xs font-black uppercase tracking-widest mb-3">
                    {mode === 'pre-inscricao' ? 'PASSO 02 DE 04 • CONFIRMAÇÃO DE SENHA' : 'PASSO 02 DE 03 • CONFIRMAÇÃO DE SENHA'}
                  </span>
                  <h2 className="text-3xl md:text-4xl font-black font-chakra uppercase text-white tracking-wider">
                    SUA SENHA
                  </h2>
                  <div className="inline-block px-5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs font-black uppercase tracking-wider mt-2">
                    {selectedAluno.nome}
                  </div>
                </div>

                {/* Password Box */}
                <div className="bg-[#080d19] border-2 border-emerald-500/60 rounded-3xl p-6 md:p-8 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                  <form onSubmit={handleValidarSenha} className="space-y-6">
                    <div>
                      <input 
                        type="password"
                        value={senhaInput}
                        onChange={e => setSenhaInput(e.target.value)}
                        placeholder="DIGITE SUA SENHA"
                        className="w-full p-4 bg-black/60 border-2 border-emerald-500/60 rounded-2xl text-center text-white text-base md:text-lg font-bold outline-none focus:border-emerald-400 placeholder:text-emerald-500/60 tracking-widest"
                        autoFocus
                        required
                      />
                      {senhaErro && (
                        <p className="text-rose-400 text-xs font-bold uppercase mt-2 text-center flex items-center justify-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>{senhaErro}</span>
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="p-3.5 rounded-2xl bg-black/40 border border-gray-700 text-gray-300 font-bold uppercase text-xs hover:bg-gray-800 transition cursor-pointer"
                      >
                        VOLTAR
                      </button>

                      <button
                        type="submit"
                        className="p-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-xs transition cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                      >
                        VALIDAR SENHA
                      </button>
                    </div>
                  </form>
                </div>

              </div>
            )}

            {/* PASSO 03: PROGRAMAÇÃO DA CÉLULA (PRÉ INSCRIÇÃO) OU FORM (JUSTIFICATIVA) */}
            {step === 3 && selectedAluno && mode === 'pre-inscricao' && (
              <div className="space-y-6">
                
                {/* Pill Step Header */}
                <div className="text-center">
                  <span className="inline-block px-4 py-1 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-xs font-black uppercase tracking-widest mb-3">
                    PASSO 03 DE 04 • PROGRAMAÇÃO DA CÉLULA
                  </span>
                  <h2 className="text-3xl md:text-4xl font-black font-chakra uppercase text-white tracking-wider">
                    CÉLULA EVANGELÍSTICA
                  </h2>
                  <div className="inline-block px-5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs font-black uppercase tracking-wider mt-2">
                    {selectedAluno.nome}
                  </div>
                </div>

                {/* Célula Card */}
                <div className="bg-[#080d19] border-2 border-yellow-500/80 rounded-3xl p-6 shadow-[0_0_30px_rgba(234,179,8,0.2)] space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 border border-yellow-400 flex items-center justify-center text-yellow-400 shrink-0">
                      <Flame className="w-7 h-7 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-yellow-400 uppercase tracking-wider font-chakra">
                        {celulaItem.titulo}
                      </h3>
                      <p className="text-xs text-yellow-200/80 uppercase tracking-widest mt-0.5 font-semibold">
                        Horário: <b>{celulaItem.hora || '19:45'}</b> • Presença Obrigatória
                      </p>
                    </div>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 text-xs text-gray-300 space-y-2">
                    <p className="font-bold text-yellow-300 uppercase">
                      ⚠️ REGRA DE PARTICIPAÇÃO NAS ATIVIDADES ESPORTIVAS:
                    </p>
                    <p>
                      Para participar das aulas de esporte (Futsal, Vôlei, Altinha, etc.), é <b>obrigatória</b> a presença registrada na Reunião da Célula Evangelística Tsunami.
                    </p>
                  </div>

                  {/* Toggle Check Célula */}
                  <div className="bg-black/60 border border-yellow-500/40 rounded-2xl p-4 flex items-center justify-between">
                    <span className="text-xs font-black text-white uppercase tracking-wider">
                      CONFIRMAR PRESENÇA NA CÉLULA:
                    </span>
                    <button
                      type="button"
                      onClick={() => setCelulaConfirmada(!celulaConfirmada)}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition flex items-center gap-2 cursor-pointer ${
                        celulaConfirmada
                          ? 'bg-yellow-400 text-black shadow-[0_0_12px_rgba(234,179,8,0.5)]'
                          : 'bg-gray-800 text-gray-400 border border-gray-700'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      <span>{celulaConfirmada ? 'CONFIRMADO ✓' : 'MARCAR PRESENÇA'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="p-3.5 rounded-2xl bg-black/40 border border-gray-700 text-gray-300 font-bold uppercase text-xs hover:bg-gray-800 transition cursor-pointer"
                    >
                      VOLTAR
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep(4)}
                      className="p-3.5 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase text-xs transition cursor-pointer shadow-[0_0_20px_rgba(234,179,8,0.4)]"
                    >
                      AVANÇAR PARA AULAS
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* PASSO FINAL (04 DE 04): ESCOLHA SUAS ATIVIDADES */}
            {step === 4 && selectedAluno && mode === 'pre-inscricao' && (
              <div className="space-y-6">
                
                {/* Pill Step Header */}
                <div className="text-center">
                  <span className="inline-block px-4 py-1 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-xs font-black uppercase tracking-widest mb-3">
                    PASSO FINAL (04 DE 04) • ESCOLHA SUAS ATIVIDADES
                  </span>
                  <h2 className="text-3xl md:text-4xl font-black font-chakra uppercase text-white tracking-wider">
                    INSCRIÇÃO
                  </h2>
                  <div className="inline-block px-5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs font-black uppercase tracking-wider mt-2">
                    {selectedAluno.nome}
                  </div>
                </div>

                {/* Main Activities Selection Box */}
                <div className="bg-[#080d19] border-2 border-emerald-500/60 rounded-3xl p-5 md:p-6 shadow-[0_0_30px_rgba(16,185,129,0.2)] space-y-5">
                  
                  {/* Célula Confirmed Golden Banner */}
                  <div className="bg-amber-950/50 border-2 border-amber-500/80 rounded-2xl p-4 flex items-center justify-between shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 shrink-0">
                        <Flame className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-amber-300 uppercase tracking-wider font-chakra flex items-center gap-1.5">
                          <span>CÉLULA CONFIRMADA ÀS {celulaItem.hora || '19:45'}</span>
                          <Check className="w-4 h-4 text-amber-400 stroke-[3]" />
                        </h4>
                        <p className="text-[10px] text-amber-200/70 uppercase tracking-widest mt-0.5">
                          Presença obrigatória registrada • Selecione as modalidades esportivas abaixo:
                        </p>
                      </div>
                    </div>

                    <button 
                      type="button"
                      onClick={() => setStep(3)}
                      className="px-3 py-1.5 bg-amber-500/20 border border-amber-400/60 text-amber-300 hover:bg-amber-400 hover:text-black rounded-lg text-[10px] font-black uppercase transition cursor-pointer shrink-0"
                    >
                      VER HORÁRIO
                    </button>
                  </div>

                  {/* Header Count */}
                  <div className="flex items-center justify-between text-xs font-black uppercase text-emerald-400 tracking-wider">
                    <span>SELECIONE AS TURMAS EM QUE VOCÊ VAI JOGAR:</span>
                    <span className="text-[11px] text-emerald-300/80">
                      {turmasSelecionadas.length} de {atividadesLiberadas.length} selecionadas
                    </span>
                  </div>

                  {/* Activities List Cards */}
                  <div className="space-y-3">
                    {atividadesLiberadas.length === 0 ? (
                      <div className="p-6 bg-black/40 border border-emerald-500/20 rounded-2xl text-center text-xs text-gray-400 uppercase font-bold">
                        Nenhuma atividade liberada para o seu perfil no momento.
                      </div>
                    ) : (
                      atividadesLiberadas.map((act) => {
                        const isSelected = turmasSelecionadas.includes(act.titulo);
                        return (
                          <div
                            key={act.id}
                            onClick={() => handleToggleTurma(act.titulo)}
                            className={`p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-[#091829] border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                                : 'bg-[#090d1a] border-cyan-900/40 hover:border-cyan-500/60 hover:bg-[#0c1428]'
                            }`}
                          >
                            <div>
                              <h4 className="text-base font-extrabold text-white uppercase tracking-wider font-chakra">
                                {act.titulo}
                              </h4>
                              <p className="text-xs text-gray-400 font-mono mt-0.5">
                                {act.hora || '20:00'}
                              </p>
                            </div>

                            {/* Radio Circle */}
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                              isSelected
                                ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 shadow-[0_0_8px_#06b6d4]'
                                : 'border-gray-600'
                            }`}>
                              {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Summary Box */}
                  <div className="bg-[#050e1a] border border-cyan-900/60 rounded-2xl p-4 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 uppercase">Célula (Reunião Evangelística):</span>
                      <span className="text-amber-400 font-bold uppercase flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        Confirmado às {celulaItem.hora || '19:45'} (Obrigatório)
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-t border-white/5 pt-2">
                      <span className="text-gray-400 uppercase">Turmas selecionadas:</span>
                      <span className={`font-black uppercase tracking-wider ${turmasSelecionadas.length > 0 ? 'text-cyan-300' : 'text-gray-500'}`}>
                        {turmasSelecionadas.length > 0 ? turmasSelecionadas.join(', ') : 'NENHUMA'}
                      </span>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="md:col-span-4 p-4 rounded-2xl bg-black/40 border border-gray-700 text-gray-300 font-extrabold uppercase text-xs hover:bg-gray-800 transition cursor-pointer"
                    >
                      VOLTAR
                    </button>

                    <button
                      type="button"
                      onClick={handleConcluirInscricao}
                      className="md:col-span-8 p-4 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-black font-black uppercase text-sm tracking-wider transition cursor-pointer shadow-[0_0_25px_rgba(6,182,212,0.5)] flex items-center justify-center gap-2"
                    >
                      <span>CONCLUIR INSCRIÇÃO ✓</span>
                    </button>
                  </div>

                </div>

              </div>
            )}

            {/* PASSO 03 DE JUSTIFICATIVA (FORMULÁRIO DE JUSTIFICATIVA) */}
            {step === 3 && selectedAluno && mode === 'justificar-sabado' && (
              <div className="space-y-6">
                
                {/* Pill Step Header */}
                <div className="text-center">
                  <span className="inline-block px-4 py-1 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 text-xs font-black uppercase tracking-widest mb-3">
                    PASSO 03 DE 03 • JUSTIFICATIVA DE AUSÊNCIA
                  </span>
                  <h2 className="text-3xl md:text-4xl font-black font-chakra uppercase text-white tracking-wider">
                    JUSTIFICAR SÁBADO
                  </h2>
                  <div className="inline-block px-5 py-1.5 rounded-full bg-amber-950/80 border border-amber-500/60 text-amber-300 text-xs font-black uppercase tracking-wider mt-2">
                    {selectedAluno.nome}
                  </div>
                </div>

                {/* Form Box */}
                <div className="bg-[#080d19] border-2 border-amber-500/60 rounded-3xl p-6 shadow-[0_0_30px_rgba(245,158,11,0.2)] space-y-5">
                  <form onSubmit={handleConcluirJustificativa} className="space-y-5">
                    <div>
                      <label className="block text-xs uppercase text-amber-400 font-bold mb-2">
                        Data da Ausência
                      </label>
                      <input 
                        type="date"
                        value={dataJustificativa}
                        onChange={e => setDataJustificativa(e.target.value)}
                        className="w-full p-3.5 bg-black/60 border border-amber-500/40 rounded-2xl text-amber-300 font-mono font-bold text-sm outline-none focus:border-amber-400"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase text-amber-400 font-bold mb-2">
                        Motivo da Justificativa
                      </label>
                      <textarea
                        rows={4}
                        value={motivoJustificativa}
                        onChange={e => setMotivoJustificativa(e.target.value)}
                        placeholder="Ex: Trabalho, viagem em família, compromisso médico..."
                        className="w-full p-4 bg-black/60 border border-amber-500/40 rounded-2xl text-white text-xs font-semibold outline-none focus:border-amber-400 placeholder:text-gray-600"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="p-3.5 rounded-2xl bg-black/40 border border-gray-700 text-gray-300 font-bold uppercase text-xs hover:bg-gray-800 transition cursor-pointer"
                      >
                        VOLTAR
                      </button>

                      <button
                        type="submit"
                        className="p-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-black uppercase text-xs transition cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                      >
                        ENVIAR JUSTIFICATIVA
                      </button>
                    </div>
                  </form>
                </div>

              </div>
            )}

            {/* PASSO 05: TELA DE SUCESSO / CONFIRMAÇÃO */}
            {step === 5 && (
              <div className="bg-[#080d19] border-2 border-emerald-400 rounded-3xl p-8 text-center space-y-6 shadow-[0_0_40px_rgba(16,185,129,0.3)] animate-scale-up">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 mx-auto shadow-[0_0_25px_rgba(16,185,129,0.5)]">
                  <CheckCircle className="w-10 h-10" />
                </div>

                <div>
                  <h3 className="text-2xl md:text-3xl font-black font-chakra text-emerald-400 uppercase tracking-wider">
                    {mode === 'pre-inscricao' ? 'INSCRIÇÃO CONCLUÍDA!' : 'JUSTIFICATIVA ENVIADA!'}
                  </h3>
                  <p className="text-xs text-gray-300 uppercase tracking-widest mt-2">
                    {mode === 'pre-inscricao'
                      ? `Atletas pré-inscritos com sucesso para a Célula e modalidades esportivas.`
                      : `Sua justificativa de ausência foi registrada com sucesso.`}
                  </p>
                </div>

                {selectedAluno && (
                  <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-2xl p-4 text-xs font-bold uppercase text-emerald-300 tracking-wider">
                    ALUNO: {selectedAluno.nome}
                  </div>
                )}

                <button
                  onClick={() => setMode('menu')}
                  className="px-8 py-3.5 bg-emerald-400 hover:bg-emerald-300 text-black font-black uppercase text-xs rounded-2xl transition cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.4)] mx-auto block"
                >
                  VOLTAR AO MENU DA ÁREA DE ESPORTE
                </button>
              </div>
            )}

          </div>
        )}

      </div>

      {/* ======================================================== */}
      {/* MODAL: SORTEIO DE LINHAS PARA WHATSAPP */}
      {/* ======================================================== */}
      {sorteioModal.open && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1324] border-2 border-emerald-400 p-6 md:p-8 rounded-3xl max-w-md w-full shadow-[0_0_40px_rgba(16,185,129,0.3)] text-left space-y-5">
            
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/30">
              <div className="flex items-center gap-2">
                <Shuffle className="w-6 h-6 text-emerald-400" />
                <h3 className="text-lg font-black text-white uppercase tracking-wider font-chakra">
                  SORTEIO DE LINHAS ⚖️
                </h3>
              </div>

              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-lg">
                {sorteioModal.titulo}
              </span>
            </div>

            <p className="text-xs text-gray-300 uppercase">
              Alunos inscritos nesta aula: <b>{sorteioModal.inscritos.length}</b>
            </p>

            <div className="max-h-48 overflow-y-auto bg-black/60 p-3 rounded-2xl border border-emerald-500/30 space-y-1">
              {sorteioModal.inscritos.map((nome, i) => (
                <div key={i} className="text-xs font-bold text-emerald-300 uppercase">
                  {i + 1}. {nome}
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSorteioModal({ open: false, titulo: '', inscritos: [] })}
                className="flex-1 p-3.5 rounded-xl border border-gray-700 text-gray-400 font-bold uppercase text-xs hover:bg-gray-800 transition cursor-pointer"
              >
                FECHAR
              </button>

              <button
                type="button"
                onClick={handleCompartilharLinhasWhatsApp}
                className="flex-1 p-3.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black uppercase text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
              >
                <Share2 className="w-4 h-4" />
                <span>SORTEAR NO WHATSAPP</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
