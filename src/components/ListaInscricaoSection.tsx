import React, { useState, useEffect } from 'react';
import { Shuffle, Users, Share2, Flame, Clock } from 'lucide-react';
import { ProgramacaoItem, InscricaoEsporte } from '../types';
import { 
  subscribeFirestoreProgramacao, 
  subscribeFirestoreInscricoesEsporte 
} from '../lib/firestoreService';

export function ListaInscricaoSection() {
  const [programacaoItems, setProgramacaoItems] = useState<ProgramacaoItem[]>([]);
  const [inscricoesList, setInscricoesList] = useState<InscricaoEsporte[]>([]);

  // Modal Sorteio de Linhas
  const [sorteioModal, setSorteioModal] = useState<{ open: boolean; titulo: string; inscritos: string[] }>({
    open: false,
    titulo: '',
    inscritos: []
  });

  useEffect(() => {
    const unsubProg = subscribeFirestoreProgramacao(setProgramacaoItems);
    const unsubInsc = subscribeFirestoreInscricoesEsporte(setInscricoesList);

    return () => {
      unsubProg();
      unsubInsc();
    };
  }, []);

  // Lista de atividades incluindo a Célula Evangelística em ordem cronológica
  const todasAtividades = (() => {
    let list = [...programacaoItems];
    const temCelula = list.some(i => i.isFixa || i.id === 'celula_fixa' || i.titulo.toUpperCase().includes('CÉLULA') || i.titulo.toUpperCase().includes('CELULA'));
    if (!temCelula) {
      list.unshift({
        id: 'celula_fixa',
        titulo: 'CÉLULA EVANGELÍSTICA TSUNAMI',
        hora: '19:45',
        dias: ['seg', 'qua', 'sex'],
        isFixa: true
      });
    }
    return list.sort((a, b) => (a.hora || '00:00').localeCompare(b.hora || '00:00'));
  })();

  // Função para determinar vagas padrão por modalidade
  const getVagasPadrao = (act: ProgramacaoItem) => {
    if (act.vagas) return act.vagas;
    const t = act.titulo.toUpperCase();
    if (t.includes('VOLEI') || t.includes('VOLEIBOL')) return 15;
    if (t.includes('ALTINHA')) return 5;
    if (t.includes('FUTSAL 2X2')) return 10;
    return 15;
  };

  // Abrir Modal de Sorteio de Linhas
  const handleSortearLinhas = (actTitulo: string) => {
    const inscritos = inscricoesList
      .filter(i => i.turmasSelecionadas && i.turmasSelecionadas.includes(actTitulo))
      .map(i => i.alunoNome.toUpperCase());

    if (inscritos.length === 0) {
      alert(`Nenhum aluno inscrito na aula ${actTitulo} ainda.`);
      return;
    }

    setSorteioModal({
      open: true,
      titulo: actTitulo,
      inscritos: [...new Set(inscritos)]
    });
  };

  // Compartilhar Sorteio de Linhas no WhatsApp
  const handleCompartilharLinhasWhatsApp = () => {
    if (!sorteioModal.titulo || sorteioModal.inscritos.length === 0) return;

    // Embaralhar inscritos
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

  return (
    <div className="w-full max-w-3xl mx-auto my-8 font-rajdhani text-white">
      
      {/* Title & Solid White Underline Bar */}
      <div className="text-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-black font-chakra uppercase tracking-[0.15em] text-white">
          LISTA DE INSCRIÇÃO
        </h2>
        <div className="w-48 h-1 bg-white mx-auto mt-2 rounded-full shadow-[0_0_10px_#ffffff]"></div>
      </div>

      {/* Main Outer Box (Green Neon Border matching image_a141780a.png) */}
      <div className="bg-[#060a14] border-2 border-emerald-500/60 rounded-3xl p-5 md:p-8 space-y-6 shadow-[0_0_35px_rgba(16,185,129,0.2)]">
        
        {todasAtividades.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs uppercase font-bold tracking-widest">
            Nenhuma modalidade esportiva cadastrada na programação.
          </div>
        ) : (
          todasAtividades.map((act) => {
            const isCelula = act.isFixa || act.id === 'celula_fixa' || act.titulo.toUpperCase().includes('CÉLULA') || act.titulo.toUpperCase().includes('CELULA');
            const vagasTotais = isCelula ? 100 : getVagasPadrao(act);
            
            // Alunos inscritos nesta aula
            const inscritos = inscricoesList
              .filter(i => isCelula ? (i.celulaConfirmada !== false) : (i.turmasSelecionadas && i.turmasSelecionadas.includes(act.titulo)))
              .map(i => i.alunoNome.toUpperCase());

            const inscritosUnicos = [...new Set(inscritos)];
            const countInscritos = inscritosUnicos.length;
            const vagasRestantes = isCelula ? Math.max(0, 100 - countInscritos) : Math.max(0, vagasTotais - countInscritos);
            const percentual = isCelula ? Math.min(100, Math.round((countInscritos / 100) * 100)) : Math.min(100, Math.round((countInscritos / vagasTotais) * 100));

            return (
              <div 
                key={act.id}
                className={`border rounded-2xl p-5 shadow-lg space-y-4 text-left transition ${
                  isCelula
                    ? 'bg-[#120e06] border-amber-500/60 hover:border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                    : 'bg-[#080d19] border-emerald-500/40'
                }`}
              >
                
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/5">
                  <div>
                    <div className="flex items-center gap-2.5">
                      {isCelula && <Flame className="w-5 h-5 text-amber-400 animate-pulse shrink-0" />}
                      <h3 className={`text-lg md:text-xl font-black uppercase tracking-wider font-chakra ${isCelula ? 'text-amber-300' : 'text-white'}`}>
                        {act.titulo}
                      </h3>
                      {isCelula ? (
                        <span className="bg-amber-500/20 border border-amber-400 text-amber-300 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase font-mono">
                          PRESENÇA OBRIGATÓRIA
                        </span>
                      ) : (
                        <span className="bg-emerald-500/15 border border-emerald-400 text-emerald-300 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase font-mono">
                          {vagasTotais} VAGAS
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-gray-400 mt-1 flex items-center gap-1">
                      <Clock className={`w-3.5 h-3.5 ${isCelula ? 'text-amber-400' : 'text-emerald-400'}`} />
                      {act.hora || (isCelula ? '19:45' : '20:00')}
                    </p>
                  </div>

                  {/* Action Button: SORTEAR LINHAS */}
                  {!isCelula ? (
                    <button
                      onClick={() => handleSortearLinhas(act.titulo)}
                      className="px-3.5 py-2 bg-emerald-500/15 border border-emerald-400/80 text-emerald-300 hover:bg-emerald-500 hover:text-black transition rounded-xl text-xs font-black uppercase flex items-center gap-2 cursor-pointer shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span>SORTEAR LINHAS ⚖️</span>
                    </button>
                  ) : (
                    <span className="px-3 py-1 bg-amber-500/15 border border-amber-500/40 text-amber-300 font-extrabold text-xs uppercase rounded-lg shrink-0">
                      CÉLULA EVANGELÍSTICA TSUNAMI
                    </span>
                  )}
                </div>

                {/* Capacity Stats & Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                    <span className={isCelula ? 'text-amber-400' : 'text-emerald-400'}>
                      {isCelula ? `${countInscritos} CONFIRMADOS NA CÉLULA` : `${vagasRestantes} VAGAS RESTANTES`}
                    </span>
                    <span className="text-gray-400 font-mono">
                      {countInscritos} CONFIRMAÇÕES
                    </span>
                  </div>

                  <div className="w-full bg-gray-950 border border-gray-800 rounded-full h-2 overflow-hidden p-0.5">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCelula ? 'bg-gradient-to-r from-amber-500 to-yellow-300 shadow-[0_0_8px_#f59e0b]' : 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
                      }`}
                      style={{ width: `${Math.max(5, percentual)}%` }}
                    />
                  </div>
                </div>

                {/* Inner Box with Registered Students */}
                <div className={`border border-dashed rounded-2xl p-4 ${isCelula ? 'bg-black/50 border-amber-500/30' : 'bg-black/40 border-emerald-500/30'}`}>
                  {countInscritos === 0 ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
                      <span className={`text-xs font-black uppercase tracking-widest ${isCelula ? 'text-amber-400/80' : 'text-emerald-400/80'}`}>
                        NENHUM ALUNO INSCRITO AINDA
                      </span>
                      <span className={`px-3 py-1 border rounded-lg text-[10px] font-black uppercase ${
                        isCelula ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      }`}>
                        {isCelula ? '100 VAGAS LIVRES' : `${vagasTotais} VAGAS LIVRES`}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${isCelula ? 'text-amber-300' : 'text-emerald-400'}`}>
                          <Users className="w-3.5 h-3.5" />
                          <span>INSCRITOS CONFIRMADOS ({countInscritos}):</span>
                        </span>
                        <span className={`px-2.5 py-0.5 border rounded-md text-[10px] font-black uppercase ${
                          isCelula ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                        }`}>
                          {isCelula ? 'PRESENÇA REGISTRADA' : `${vagasRestantes} VAGAS LIVRES`}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                        {inscritosUnicos.map((nome, idx) => (
                          <div 
                            key={idx}
                            className={`p-2 rounded-xl border font-extrabold text-xs uppercase flex items-center gap-2 ${
                              isCelula
                                ? 'bg-amber-950/40 border-amber-500/30 text-amber-200'
                                : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                            }`}
                          >
                            <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-mono shrink-0 ${
                              isCelula ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                            }`}>
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
