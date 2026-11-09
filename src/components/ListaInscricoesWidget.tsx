import React, { useState, useEffect } from 'react';
import { 
  Shuffle, 
  Users, 
  Clock, 
  CheckCircle, 
  UserCheck, 
  Sparkles, 
  Share2, 
  X,
  Trophy,
  Flame
} from 'lucide-react';
import { ProgramacaoItem, InscricaoEsporte } from '../types';
import { 
  subscribeFirestoreProgramacao, 
  subscribeFirestoreInscricoesEsporte 
} from '../lib/firestoreService';

export function ListaInscricoesWidget() {
  const [atividades, setAtividades] = useState<ProgramacaoItem[]>([]);
  const [inscricoes, setInscricoes] = useState<InscricaoEsporte[]>([]);

  // Sorteio Modal State
  const [sorteioModal, setSorteioModal] = useState<{
    open: boolean;
    atividadeNome: string;
    linhas: string[][];
  }>({
    open: false,
    atividadeNome: '',
    linhas: []
  });

  useEffect(() => {
    const unsubProg = subscribeFirestoreProgramacao((list) => {
      let comCelula = [...list];
      const temCelula = comCelula.some(
        i => i.isFixa || i.id === 'celula_fixa' || i.titulo.toUpperCase().includes('CÉLULA') || i.titulo.toUpperCase().includes('CELULA')
      );
      if (!temCelula) {
        comCelula.unshift({
          id: 'celula_fixa',
          titulo: 'CÉLULA EVANGELÍSTICA TSUNAMI',
          hora: '19:45',
          dias: ['seg', 'qua', 'sex'],
          isFixa: true
        });
      }
      // Ordenar cronologicamente pelo horário (ex: 19:45, 20:00, etc.)
      comCelula.sort((a, b) => (a.hora || '00:00').localeCompare(b.hora || '00:00'));
      setAtividades(comCelula);
    });

    const unsubInsc = subscribeFirestoreInscricoesEsporte((list) => {
      setInscricoes(list);
    });

    return () => {
      unsubProg();
      unsubInsc();
    };
  }, []);

  // Obter inscritos em cada atividade específica (esporte ou célula) ordenados por ordem de chegada
  const getInscritosPorAtividade = (tituloAtividade: string, isCelula: boolean) => {
    const sortedInscricoes = [...inscricoes].sort((a, b) => {
      const tA = a.criadoEm ? new Date(a.criadoEm).getTime() : 0;
      const tB = b.criadoEm ? new Date(b.criadoEm).getTime() : 0;
      return tA - tB;
    });

    const inscritosUnicos: { nome: string; turma: string; criadoEm: string }[] = [];
    const nomesVistos = new Set<string>();

    sortedInscricoes.forEach(ins => {
      const bateuAtividade = isCelula
        ? (ins.celulaConfirmada !== false)
        : (ins.turmasSelecionadas && ins.turmasSelecionadas.includes(tituloAtividade));

      if (bateuAtividade) {
        const displayNome = ins.convidadoDe 
          ? `${ins.alunoNome.toUpperCase()} - CONVIDADO DE: ${ins.convidadoDe.toUpperCase()}`
          : ins.alunoNome.toUpperCase();

        const key = displayNome.trim();
        if (!nomesVistos.has(key)) {
          nomesVistos.add(key);
          inscritosUnicos.push({
            nome: displayNome,
            turma: ins.turma || '',
            criadoEm: ins.criadoEm || ''
          });
        }
      }
    });

    return inscritosUnicos;
  };

  // Sorteio de Linhas (Times/Linhas de 5 atletas)
  const handleSortearLinhas = (tituloAtividade: string) => {
    const inscritos = getInscritosPorAtividade(tituloAtividade, false);
    if (inscritos.length === 0) {
      alert('Nenhum aluno inscrito nesta modalidade ainda para sortear linhas!');
      return;
    }

    // Embaralhar alunos (Fisher-Yates)
    const embaralhados = [...inscritos].sort(() => Math.random() - 0.5);
    
    // Dividir em linhas de até 5 atletas
    const tamanhoLinha = 5;
    const linhasResult: string[][] = [];

    for (let i = 0; i < embaralhados.length; i += tamanhoLinha) {
      const pedaco = embaralhados.slice(i, i + tamanhoLinha).map(a => a.nome);
      linhasResult.push(pedaco);
    }

    setSorteioModal({
      open: true,
      atividadeNome: tituloAtividade,
      linhas: linhasResult
    });
  };

  // Compartilhar Sorteio no WhatsApp
  const handleCompartilharWhatsApp = () => {
    if (!sorteioModal.atividadeNome || sorteioModal.linhas.length === 0) return;

    let texto = `*⚽ PROJETO TSUNAMI - LINHAS SORTEADAS*\nModalidade: *${sorteioModal.atividadeNome}*\n\n`;

    sorteioModal.linhas.forEach((linha, idx) => {
      texto += `*🔥 LINHA ${idx + 1}* (${linha.length} atletas):\n`;
      linha.forEach((aluno, aIdx) => {
        texto += `  ${aIdx + 1}. ${aluno}\n`;
      });
      texto += `\n`;
    });

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`);
  };

  const getVagasPadrao = (act: ProgramacaoItem) => {
    if (act.vagas && act.vagas > 0) return act.vagas;
    const t = act.titulo.toUpperCase();
    if (t.includes('VOLEI') || t.includes('VOLEIBOL')) return 15;
    if (t.includes('ALTINHA')) return 5;
    if (t.includes('FUTSAL 2X2')) return 10;
    return 15;
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-8 space-y-6">
      
      {/* Header Title Lockup matching image 2 */}
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-black font-chakra uppercase tracking-widest text-white">
          LISTA DE INSCRIÇÃO
        </h2>
        <div className="w-48 h-[3px] bg-white mx-auto mt-2 shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
      </div>

      {/* Main Container */}
      <div className="bg-[#050a14]/90 border-2 border-emerald-500/60 rounded-3xl p-5 sm:p-7 shadow-[0_0_35px_rgba(16,185,129,0.2)] space-y-5">
        
        {atividades.length === 0 ? (
          <div className="p-10 border border-dashed border-emerald-500/30 rounded-2xl text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
            Nenhuma modalidade esportiva cadastrada na Programação Esportiva.
          </div>
        ) : (
          atividades.map((act) => {
            const isCelula = act.isFixa || act.id === 'celula_fixa' || act.titulo.toUpperCase().includes('CÉLULA') || act.titulo.toUpperCase().includes('CELULA');
            const vagasTotais = isCelula ? 100 : getVagasPadrao(act);
            const inscritos = getInscritosPorAtividade(act.titulo, isCelula);
            const qtdInscritos = inscritos.length;
            const confirmados = inscritos.slice(0, vagasTotais);
            const emEsperaLista = !isCelula && qtdInscritos > vagasTotais ? inscritos.slice(vagasTotais) : [];
            const emEspera = emEsperaLista.length;
            const vagasRestantes = isCelula ? Math.max(0, 100 - qtdInscritos) : Math.max(0, vagasTotais - qtdInscritos);
            const porcentagem = isCelula ? Math.min(100, Math.round((qtdInscritos / 100) * 100)) : Math.min(100, Math.round((qtdInscritos / vagasTotais) * 100));

            return (
              <div 
                key={act.id}
                className={`border rounded-2xl p-5 transition shadow-lg space-y-4 ${
                  isCelula
                    ? 'bg-[#120e06] border-amber-500/60 hover:border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                    : emEspera > 0
                    ? 'bg-[#1a0810] border-rose-500/80 hover:border-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.2)]'
                    : 'bg-[#080e1c] border-emerald-500/40 hover:border-emerald-400/80'
                }`}
              >
                {/* Top Row: Title, Badge, Time & Action Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    {isCelula && (
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 shrink-0">
                        <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                      </div>
                    )}
                    <h3 className={`text-xl font-black font-chakra uppercase tracking-wider ${isCelula ? 'text-amber-300' : 'text-white'}`}>
                      {act.titulo}
                    </h3>
                    
                    {isCelula ? (
                      <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/80 text-amber-300 font-black text-[10px] uppercase">
                        PRESENÇA OBRIGATÓRIA
                      </span>
                    ) : emEspera > 0 ? (
                      <span className="px-2.5 py-0.5 rounded-md bg-rose-500/30 border border-rose-400 text-rose-300 font-black text-[10px] uppercase animate-pulse">
                        ⚠️ {emEspera} NA LISTA DE ESPERA
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 font-extrabold text-[10px] uppercase">
                        {vagasTotais} VAGAS
                      </span>
                    )}

                    <span className="text-xs font-mono text-gray-400 flex items-center gap-1 font-bold">
                      <Clock className={`w-3.5 h-3.5 ${isCelula ? 'text-amber-400' : emEspera > 0 ? 'text-rose-400' : 'text-emerald-400'}`} />
                      {act.hora || (isCelula ? '19:45' : '20:00')}
                    </span>
                  </div>

                  {!isCelula ? (
                    <button
                      onClick={() => handleSortearLinhas(act.titulo)}
                      className="px-4 py-2 bg-emerald-950/80 border border-emerald-500/80 text-emerald-300 hover:bg-emerald-500 hover:text-black rounded-xl font-extrabold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.3)] shrink-0"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span>SORTEAR LINHAS ⚖️</span>
                    </button>
                  ) : (
                    <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-[11px] font-black uppercase tracking-wider shrink-0">
                      CÉLULA EVANGELÍSTICA TSUNAMI
                    </div>
                  )}
                </div>

                {/* Progress Bar & Vacancies Status */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                    <span className={`font-black ${isCelula ? 'text-amber-400' : emEspera > 0 ? 'text-rose-400 font-black' : 'text-emerald-400'}`}>
                      {isCelula 
                        ? `${qtdInscritos} CONFIRMADOS NA CÉLULA` 
                        : emEspera > 0 
                        ? `⚠️ VAGAS PREENCHIDAS (${vagasTotais}/${vagasTotais}) • ${emEspera} NA LISTA DE ESPERA`
                        : `${vagasRestantes} VAGAS RESTANTES`}
                    </span>
                    <span className="text-gray-400 font-mono">
                      {qtdInscritos} / {vagasTotais} INSCRITOS
                    </span>
                  </div>

                  <div className="w-full h-2 bg-gray-900 border rounded-full overflow-hidden border-gray-800">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        isCelula 
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-300 shadow-[0_0_8px_#f59e0b]' 
                          : emEspera > 0
                          ? 'bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 shadow-[0_0_10px_#f43f5e]'
                          : 'bg-gradient-to-r from-emerald-500 to-emerald-300 shadow-[0_0_8px_#10b981]'
                      }`}
                      style={{ width: `${Math.max(5, Math.min(100, porcentagem))}%` }}
                    />
                  </div>
                </div>

                {/* Inner Enrolled Students Box */}
                <div className={`border border-dashed rounded-xl p-4 space-y-4 ${
                  isCelula 
                    ? 'bg-black/50 border-amber-500/40' 
                    : emEspera > 0
                    ? 'bg-black/60 border-rose-500/50'
                    : 'bg-[#030710] border-emerald-500/30'
                }`}>
                  {qtdInscritos === 0 ? (
                    <div className={`text-xs font-bold uppercase tracking-wider ${isCelula ? 'text-amber-400/80' : 'text-emerald-400/70'}`}>
                      NENHUM ALUNO CONFIRMADO AINDA
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* VAGAS CONFIRMADAS */}
                      <div className="space-y-2">
                        <div className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">
                          VAGAS CONFIRMADAS (ORDEM DE CHEGADA - {confirmados.length}/{vagasTotais}):
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {confirmados.map((aluno, i) => (
                            <div 
                              key={i}
                              className={`p-2 px-3 rounded-xl border font-bold text-xs uppercase flex items-center justify-between gap-2 ${
                                isCelula
                                  ? 'bg-amber-950/40 border-amber-500/30 text-amber-200'
                                  : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] font-mono shrink-0 ${isCelula ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-emerald-500/20 border-emerald-400 text-emerald-300'}`}>
                                  {i + 1}
                                </span>
                                <span className="truncate tracking-tight font-extrabold">{aluno.nome}</span>
                              </div>
                              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                                isCelula 
                                  ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' 
                                  : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                              }`}>
                                CONFIRMADO
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* LISTA DE ESPERA (COLOCADA ABAIXO DOS NOMES CONFIRMADOS) */}
                      {emEspera > 0 && (
                        <div className="space-y-2 pt-3 border-t border-rose-500/40">
                          <div className="text-[10px] font-black uppercase text-rose-300 tracking-wider">
                            ⚠️ LISTA DE ESPERA - ORDEM DE CHEGADA ({emEspera} ALUNO{emEspera > 1 ? 'S' : ''}):
                          </div>
                          <div className="flex flex-col gap-1.5">
                            {emEsperaLista.map((aluno, i) => {
                              const posFila = i + 1;
                              const posGeral = vagasTotais + i + 1;
                              return (
                                <div 
                                  key={i}
                                  className="p-2 px-3 rounded-xl border font-bold text-xs uppercase flex items-center justify-between gap-2 bg-rose-950/80 border-rose-500/80 text-rose-200 shadow-[0_0_10px_rgba(244,63,94,0.3)]"
                                >
                                  <div className="flex items-center gap-2.5 truncate">
                                    <span className="w-4 h-4 rounded-full border border-rose-400 bg-rose-500/30 flex items-center justify-center text-[9px] font-mono text-rose-200 shrink-0 font-bold">
                                      {posGeral}
                                    </span>
                                    <span className="truncate tracking-tight font-extrabold">{aluno.nome}</span>
                                  </div>
                                  <span className="text-[9px] font-black uppercase text-rose-200 bg-rose-500/40 px-2 py-0.5 rounded border border-rose-400/80 shrink-0">
                                    ⏳ {posFila}º NA FILA
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="shrink-0 text-right pt-1">
                    <span className={`px-3 py-1 font-extrabold text-xs uppercase rounded-lg inline-block border ${
                      isCelula
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                        : emEspera > 0
                        ? 'bg-rose-500/20 border-rose-500/60 text-rose-300'
                        : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    }`}>
                      {isCelula 
                        ? `${qtdInscritos} ALUNOS NA CÉLULA` 
                        : emEspera > 0
                        ? `⚠️ ${emEspera} EM ESPERA`
                        : `${vagasRestantes} VAGAS LIVRES`}
                    </span>
                  </div>
                </div>

              </div>
            );
          })
        )}

      </div>

      {/* ======================================================== */}
      {/* MODAL SORTEIO DE LINHAS */}
      {/* ======================================================== */}
      {sorteioModal.open && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#090e1a] border-2 border-emerald-400 p-6 rounded-3xl max-w-lg w-full shadow-[0_0_40px_rgba(16,185,129,0.3)] space-y-6">
            
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300">
                  <Shuffle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wider font-chakra">
                    LINHAS SORTEADAS
                  </h3>
                  <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest">
                    {sorteioModal.atividadeNome}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setSorteioModal({ open: false, atividadeNome: '', linhas: [] })}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of Sorted Lines */}
            <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
              {sorteioModal.linhas.map((linha, idx) => (
                <div 
                  key={idx}
                  className="bg-[#040812] border border-emerald-500/40 rounded-2xl p-4 space-y-2"
                >
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      LINHA {idx + 1}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono font-bold uppercase">
                      {linha.length} ATLETAS
                    </span>
                  </div>

                  <div className="space-y-1">
                    {linha.map((aluno, aIdx) => (
                      <div key={aIdx} className="text-xs font-bold text-white uppercase flex items-center gap-2">
                        <span className="text-emerald-500 font-mono text-[10px]">{aIdx + 1}.</span>
                        <span>{aluno}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleSortearLinhas(sorteioModal.atividadeNome)}
                className="flex-1 p-3.5 rounded-xl border border-emerald-500/60 text-emerald-300 font-bold uppercase text-xs hover:bg-emerald-500/10 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Shuffle className="w-4 h-4" />
                <span>RE-SORTEAR</span>
              </button>

              <button
                onClick={handleCompartilharWhatsApp}
                className="flex-1 p-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-xs transition cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span>ENVIAR NO WHATSAPP</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
