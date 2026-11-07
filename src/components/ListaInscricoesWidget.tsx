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
  Trophy
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
      // Filtrar apenas atividades esportivas (não a Célula)
      const apenasEsportes = list.filter(i => !(i.isFixa || i.id === 'celula_fixa'));
      setAtividades(apenasEsportes);
    });

    const unsubInsc = subscribeFirestoreInscricoesEsporte((list) => {
      setInscricoes(list);
    });

    return () => {
      unsubProg();
      unsubInsc();
    };
  }, []);

  // Obter inscritos em cada atividade específica
  const getInscritosPorAtividade = (tituloAtividade: string) => {
    const inscritosUnicos: { nome: string; turma: string }[] = [];
    const nomesVistos = new Set<string>();

    inscricoes.forEach(ins => {
      if (ins.turmasSelecionadas && ins.turmasSelecionadas.includes(tituloAtividade)) {
        const key = ins.alunoNome.trim().toUpperCase();
        if (!nomesVistos.has(key)) {
          nomesVistos.add(key);
          inscritosUnicos.push({
            nome: ins.alunoNome,
            turma: ins.turma || ''
          });
        }
      }
    });

    return inscritosUnicos;
  };

  // Sorteio de Linhas (Times/Linhas de 5 atletas)
  const handleSortearLinhas = (tituloAtividade: string) => {
    const inscritos = getInscritosPorAtividade(tituloAtividade);
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
            const vagasTotais = 15; // Capacidade padrão por modalidade
            const inscritos = getInscritosPorAtividade(act.titulo);
            const qtdInscritos = inscritos.length;
            const vagasRestantes = Math.max(0, vagasTotais - qtdInscritos);
            const porcentagem = Math.min(100, Math.round((qtdInscritos / vagasTotais) * 100));

            return (
              <div 
                key={act.id}
                className="bg-[#080e1c] border border-emerald-500/40 rounded-2xl p-5 transition hover:border-emerald-400/80 shadow-lg space-y-4"
              >
                {/* Top Row: Title, Badge, Time & Sortear Linhas Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-black font-chakra text-white uppercase tracking-wider">
                      {act.titulo}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 font-extrabold text-[10px] uppercase">
                      {vagasTotais} VAGAS
                    </span>
                    <span className="text-xs font-mono text-gray-400 flex items-center gap-1 font-bold">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      {act.hora || '20:00'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleSortearLinhas(act.titulo)}
                    className="px-4 py-2 bg-emerald-950/80 border border-emerald-500/80 text-emerald-300 hover:bg-emerald-500 hover:text-black rounded-xl font-extrabold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.3)] shrink-0"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>SORTEAR LINHAS ⚖️</span>
                  </button>
                </div>

                {/* Progress Bar & Vacancies Status */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                    <span className="text-emerald-400 font-black">
                      {vagasRestantes} VAGAS RESTANTES
                    </span>
                    <span className="text-gray-400 font-mono">
                      {qtdInscritos} / {vagasTotais} ({porcentagem}%)
                    </span>
                  </div>

                  <div className="w-full h-2 bg-gray-900 border border-emerald-500/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-all duration-500 shadow-[0_0_8px_#10b981]"
                      style={{ width: `${porcentagem}%` }}
                    />
                  </div>
                </div>

                {/* Inner Enrolled Students Box matching image 2 */}
                <div className="bg-[#030710] border border-dashed border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {qtdInscritos === 0 ? (
                    <div className="text-xs font-bold text-emerald-400/70 uppercase tracking-wider">
                      NENHUM ALUNO INSCRITO AINDA
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 max-h-28 overflow-y-auto">
                      {inscritos.map((aluno, i) => (
                        <span 
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/50 text-emerald-200 font-bold text-[11px] uppercase flex items-center gap-1.5"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          {aluno.nome}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="shrink-0 text-right">
                    <span className="px-3 py-1 bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-extrabold text-xs uppercase rounded-lg inline-block">
                      {vagasRestantes} VAGAS LIVRES
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
