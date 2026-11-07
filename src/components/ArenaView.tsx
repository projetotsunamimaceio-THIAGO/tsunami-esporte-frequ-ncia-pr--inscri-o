import React, { useState, useEffect } from 'react';
import { Aluno, Turma } from '../types';
import { 
  subscribeFirestoreAlunos, 
  subscribeFirestoreTurmas, 
  subscribeFirestoreFrequencia, 
  saveFirestoreFrequencia 
} from '../lib/firestoreService';
import { ArrowLeft, CheckCheck, ChevronLeft, ChevronRight, Share2, Clock, Dice5, Save, RefreshCw, X, AlertTriangle, CheckCircle } from 'lucide-react';

interface ArenaViewProps {
  onBack: () => void;
}

export function ArenaView({ onBack }: ArenaViewProps) {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [freq, setFreq] = useState<Record<string, string>>({});
  const [ordens, setOrdens] = useState<Record<string, string>>({});
  const [dataAtual, setDataAtual] = useState(new Date());
  const [filtroTurma, setFiltroTurma] = useState('');
  const [editando, setEditando] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ msg: string; tipo: 'ok' | 'erro' | 'info' } | null>(null);

  // Modal Justificativa
  const [justModal, setJustModal] = useState<{ open: boolean; aIdx: number; dIdx: number; texto: string }>({
    open: false,
    aIdx: -1,
    dIdx: -1,
    texto: ''
  });

  const CICLO = ['', 'F', 'P', 'A', 'J'];
  const CORES: Record<string, string> = {
    '': 'bg-white/5 border-white/10 text-transparent',
    'F': 'bg-rose-500/20 border-rose-500 text-rose-400 font-bold',
    'P': 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold',
    'A': 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold',
    'J': 'bg-cyan-500/20 border-cyan-500 text-cyan-400 font-bold'
  };

  const TEXTO: Record<string, string> = {
    'P': 'Presente',
    'A': 'Atraso',
    'F': 'Faltou',
    'J': 'Justificado'
  };

  const SIGLAS: Record<string, string> = {
    'Presente': 'P',
    'Atraso': 'A',
    'Faltou': 'F',
    'Justificado': 'J'
  };

  const NIVEIS: Record<string, string> = {
    '1': '⭐',
    '2': '⭐⭐',
    '3': '⭐⭐⭐',
    '4': '⭐⭐⭐⭐',
    '5': '⭐⭐⭐⭐⭐'
  };

  useEffect(() => {
    const unsubAlunos = subscribeFirestoreAlunos((list) => {
      setAlunos(list);
      const semFoto = list.map((a: Aluno) => { const c = { ...a }; delete c.face_data; return c; });
      localStorage.setItem('tsunami_alunos', JSON.stringify(semFoto));
    });

    const unsubTurmas = subscribeFirestoreTurmas((list) => {
      setTurmas(list);
      localStorage.setItem('tsunami_turmas', JSON.stringify(list));
    });

    const unsubFreq = subscribeFirestoreFrequencia(({ freq: fMap, ordens: oMap }) => {
      setFreq(fMap);
      setOrdens(oMap);
      localStorage.setItem('tsunami_freq', JSON.stringify(fMap));
      localStorage.setItem('tsunami_ordens', JSON.stringify(oMap));
    });

    return () => {
      unsubAlunos();
      unsubTurmas();
      unsubFreq();
    };
  }, []);

  const getISOString = (data: any): string | null => {
    if (!data) return null;
    let d: Date;
    if (typeof data === 'string') {
      const dataLimpa = data.split(' ')[0];
      if (dataLimpa.includes('/')) {
        const [dia, mes, ano] = dataLimpa.split('/').map(Number);
        d = new Date(ano, mes - 1, dia);
      } else {
        d = new Date(data);
      }
    } else if (data instanceof Date) {
      d = data;
    } else {
      return null;
    }
    if (isNaN(d.getTime())) return null;
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  const chave = (nome: string, dataISO: string) => (nome.trim().toUpperCase() + '|' + dataISO);

  const ativo = (aluno: Aluno, dataISO: string) => {
    const mat = getISOString(aluno.matricula_rematricula);
    const ven = getISOString(aluno.data_vencimento);
    if (!mat || !ven) return true;
    return dataISO >= mat && dataISO <= ven;
  };

  const noMes = (aluno: Aluno, ano: number, mes: number) => {
    const mat = getISOString(aluno.matricula_rematricula);
    const ven = getISOString(aluno.data_vencimento);
    if (!mat || !ven) return true;
    const iniMes = getISOString(new Date(ano, mes, 1))!;
    const fimMes = getISOString(new Date(ano, mes + 1, 0))!;
    return mat <= fimMes && ven >= iniMes;
  };

  const limparHora = (valor: any) => {
    if (!valor) return '';
    const s = String(valor);
    let match = s.match(/(\d{2}:\d{2}:\d{2})/);
    if (match) return match[1];
    match = s.match(/(\d{2}:\d{2})/);
    if (match) return match[1] + ':00';
    return s;
  };

  const horaParaSegundos = (h: string) => {
    if (!h || h === '') return 999999;
    const partes = h.split(':').map(Number);
    let s = 0;
    if (partes.length === 3) s = (partes[0] * 3600) + (partes[1] * 60) + partes[2];
    else if (partes.length === 2) s = (partes[0] * 3600) + (partes[1] * 60);
    return s;
  };

  const sincronizar = () => {
    showStatus('✅ Dados sincronizados em tempo real via Firebase!', 'ok');
  };

  const showStatus = (msg: string, tipo: 'ok' | 'erro' | 'info') => {
    setStatusMsg({ msg, tipo });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  // Compute Saturdays for month
  const ano = dataAtual.getFullYear();
  const mes = dataAtual.getMonth();
  const nomesMes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const dias: string[] = [];
  let dTemp = new Date(ano, mes, 1);
  while (dTemp.getMonth() === mes) {
    if (dTemp.getDay() === 6) dias.push(getISOString(dTemp)!);
    dTemp.setDate(dTemp.getDate() + 1);
  }

  let listaAlunos = alunos.filter(a => noMes(a, ano, mes)).sort((a, b) => a.nome.localeCompare(b.nome));
  if (filtroTurma) listaAlunos = listaAlunos.filter(a => a.turma === filtroTurma);

  const cicloStatus = (aIdx: number, dIdx: number) => {
    const kEdit = aIdx + '-' + dIdx;
    const aluno = listaAlunos[aIdx];
    const dia = dias[dIdx];
    const kFreq = chave(aluno.nome, dia);

    const atual = editando[kEdit] !== undefined ? editando[kEdit] : (freq[kFreq] || '');
    const prox = CICLO[(CICLO.indexOf(atual) + 1) % CICLO.length];

    if (prox === 'J') {
      const txtExistente = editando[kEdit + '-txt'] || freq[kFreq + '-txt'] || '';
      setJustModal({ open: true, aIdx, dIdx, texto: txtExistente });
      return;
    }

    const novasOrdens = { ...ordens };
    if (prox === 'P' || prox === 'A') {
      const agora = new Date();
      const hStr = agora.getHours().toString().padStart(2, '0') + ':' + agora.getMinutes().toString().padStart(2, '0') + ':' + agora.getSeconds().toString().padStart(2, '0');
      novasOrdens[kFreq] = hStr;
    } else {
      delete novasOrdens[kFreq];
    }
    setOrdens(novasOrdens);
    localStorage.setItem('tsunami_ordens', JSON.stringify(novasOrdens));

    setEditando({ ...editando, [kEdit]: prox });
  };

  const salvarJustificativa = () => {
    const kEdit = justModal.aIdx + '-' + justModal.dIdx;
    setEditando({
      ...editando,
      [kEdit]: 'J',
      [kEdit + '-txt']: justModal.texto
    });
    setJustModal({ open: false, aIdx: -1, dIdx: -1, texto: '' });
  };

  const loteDia = (dIdx: number) => {
    const dia = dias[dIdx];
    let primeiro = '';
    for (let i = 0; i < listaAlunos.length; i++) {
      if (ativo(listaAlunos[i], dia)) {
        primeiro = editando[i + '-' + dIdx] !== undefined ? editando[i + '-' + dIdx] : (freq[chave(listaAlunos[i].nome, dia)] || '');
        break;
      }
    }
    const prox = CICLO[(CICLO.indexOf(primeiro) + 1) % CICLO.length];
    if (prox === 'J') return;

    const agora = new Date();
    const hStr = agora.getHours().toString().padStart(2, '0') + ':' + agora.getMinutes().toString().padStart(2, '0') + ':' + agora.getSeconds().toString().padStart(2, '0');
    const novoEdit = { ...editando };
    const novasOrdens = { ...ordens };

    listaAlunos.forEach((aluno, aIdx) => {
      if (ativo(aluno, dia)) {
        novoEdit[aIdx + '-' + dIdx] = prox;
        const kFreq = chave(aluno.nome, dia);
        if (prox === 'P' || prox === 'A') {
          novasOrdens[kFreq] = hStr;
        } else {
          delete novasOrdens[kFreq];
        }
      }
    });

    setOrdens(novasOrdens);
    localStorage.setItem('tsunami_ordens', JSON.stringify(novasOrdens));
    setEditando(novoEdit);
  };

  // WhatsApp Share Functions
  const compartilharGeral = (dIdx: number) => {
    const dataISO = dias[dIdx];
    const dataBR = dataISO.split('-').reverse().join('/');
    let texto = `*Frequência ARENA*\nDia: ${dataBR}\n\n`;

    const turmasNoRelatorio = [...new Set(listaAlunos.map(a => a.turma))];
    let totalGeral = 0;
    let justificativas: { nome: string; motivo: string }[] = [];

    turmasNoRelatorio.forEach(turmaNome => {
      let alunosDaTurma = listaAlunos.filter(a => a.turma === turmaNome);
      let presentesNaTurma: string[] = [];

      alunosDaTurma.forEach(aluno => {
        const aIdx = listaAlunos.indexOf(aluno);
        const kEdit = aIdx + '-' + dIdx;
        const s = editando[kEdit] !== undefined ? editando[kEdit] : (freq[chave(aluno.nome, dataISO)] || '');

        if (s === 'P' || s === 'A') {
          let nomeLinha = aluno.nome.toUpperCase();
          if (s === 'A') nomeLinha += ' ⚠️';
          presentesNaTurma.push(nomeLinha);
        } else if (s === 'J') {
          const motivo = editando[aIdx + '-' + dIdx + '-txt'] || freq[chave(aluno.nome, dataISO) + '-txt'] || 'Não informada';
          justificativas.push({ nome: aluno.nome.toUpperCase(), motivo });
        }
      });

      if (presentesNaTurma.length > 0) {
        texto += `*🔹(${turmaNome || 'SEM TURMA'})*\n`;
        presentesNaTurma.forEach(p => texto += `${p}\n`);
        texto += `-Total: ${presentesNaTurma.length} alunos\n\n`;
        totalGeral += presentesNaTurma.length;
      }
    });

    texto += `#Total: ${totalGeral} alunos\n`;
    if (justificativas.length > 0) {
      texto += `\n🗣️ *Justificados:*\n`;
      justificativas.forEach(j => { texto += `${j.nome} (${j.motivo})\n`; });
    }

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`);
  };

  const compartilharOrdem = (dIdx: number) => {
    const dataISO = dias[dIdx];
    const dataBR = dataISO.split('-').reverse().join('/');
    let texto = `*Frequência ARENA - ORDEM DE CHEGADA*\nDia: ${dataBR}\n\n`;
    let registros: any[] = [];

    listaAlunos.forEach(aluno => {
      const kFreq = chave(aluno.nome, dataISO);
      const s = freq[kFreq] || '';
      const horaOriginal = ordens[kFreq];

      if ((s === 'P' || s === 'A') && horaOriginal) {
        let hFormatada = limparHora(horaOriginal);
        registros.push({
          nome: aluno.nome.toUpperCase(),
          horaExibicao: hFormatada,
          segundos: horaParaSegundos(hFormatada),
          status: s
        });
      }
    });

    registros.sort((a, b) => a.segundos - b.segundos);

    if (registros.length > 0) {
      registros.forEach((r, idx) => {
        let aviso = r.status === 'A' ? ' ⚠️' : '';
        texto += `${idx + 1}º ${r.nome} (${r.horaExibicao})${aviso}\n`;
      });
    } else {
      texto += 'Nenhum registro de presença para este dia.';
    }

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`);
  };

  const compartilharSorteio = (dIdx: number) => {
    const dataISO = dias[dIdx];
    const dataBR = dataISO.split('-').reverse().join('/');
    let turmasPresentes: Record<string, any[]> = {};

    listaAlunos.forEach(aluno => {
      const aIdx = listaAlunos.indexOf(aluno);
      const kEdit = aIdx + '-' + dIdx;
      const s = editando[kEdit] !== undefined ? editando[kEdit] : (freq[chave(aluno.nome, dataISO)] || '');

      if (s === 'P' || s === 'A') {
        const turmaNome = aluno.turma || 'SEM TURMA';
        if (!turmasPresentes[turmaNome]) turmasPresentes[turmaNome] = [];
        turmasPresentes[turmaNome].push({
          nome: aluno.nome.toUpperCase(),
          nivel: parseInt(aluno.nivel_aluno || '1'),
          turma: turmaNome
        });
      }
    });

    if (Object.keys(turmasPresentes).length === 0) {
      alert('Nenhum aluno presente para criar grupos!');
      return;
    }

    let texto = `*🎲 SORTEIO ARENA - GRUPOS*\nDia: ${dataBR}\n\n`;
    let totalGeral = 0;

    for (const turmaNome in turmasPresentes) {
      const alunosTurma = turmasPresentes[turmaNome];
      if (alunosTurma.length === 0) continue;

      let todosAlunos = [...alunosTurma];
      todosAlunos.sort((a, b) => b.nivel - a.nivel);

      let numGrupos = Math.ceil(alunosTurma.length / 5);
      let grupos: any[][] = Array(numGrupos).fill(null).map(() => []);

      let indice = 0;
      let rodada = 0;

      while (indice < todosAlunos.length) {
        let ordem = rodada % 2 === 0
          ? Array.from({ length: numGrupos }, (_, i) => i)
          : Array.from({ length: numGrupos }, (_, i) => numGrupos - 1 - i);

        for (let g of ordem) {
          if (indice < todosAlunos.length && grupos[g].length < 5) {
            grupos[g].push(todosAlunos[indice]);
            indice++;
          }
        }
        rodada++;
      }

      texto += `*🔹 TURMA: ${turmaNome}*\n`;
      grupos.forEach((grupo, idx) => {
        if (grupo.length === 0) return;
        let somaEstrelas = grupo.reduce((sum, a) => sum + a.nivel, 0);
        texto += `\n*🔥 GRUPO ${idx + 1}* (${grupo.length} pessoas) - Total: ${somaEstrelas}⭐\n`;
        grupo.sort((a, b) => a.nivel - b.nivel);
        grupo.forEach(aluno => {
          texto += `${NIVEIS[aluno.nivel] || '⭐'} ${aluno.nome}\n`;
        });
      });
      texto += `\n\n`;
      totalGeral += alunosTurma.length;
    }

    texto += `*Total: ${totalGeral} alunos*`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`);
  };

  const salvarTudo = async () => {
    setSaving(true);
    const itens = Object.keys(editando).filter(k => !k.includes('-txt'));
    if (itens.length === 0) {
      showStatus('Nenhuma alteração para salvar.', 'info');
      setSaving(false);
      return;
    }

    let erros = 0;

    for (const k of itens) {
      const [aIdx, dIdx] = k.split('-').map(Number);
      const aluno = listaAlunos[aIdx];
      const dia = dias[dIdx];
      const status = editando[k];
      const kFreq = chave(aluno.nome, dia);

      try {
        await saveFirestoreFrequencia(
          aluno.nome,
          dia,
          status,
          editando[k + '-txt'] || '',
          ordens[kFreq] || ''
        );
      } catch (e) {
        erros++;
      }
    }

    setEditando({});
    setSaving(false);

    if (erros === 0) showStatus(`✅ ${itens.length} registro(s) salvo(s) no Firebase!`, 'ok');
    else showStatus(`⚠️ ${erros} erro(s) ao salvar no Firebase.`, 'erro');
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0a0a0f] to-[#1a1a2e] text-white font-rajdhani p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Status Toast */}
        {statusMsg && (
          <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-2.5 rounded-xl font-bold text-xs uppercase shadow-2xl flex items-center gap-2 border ${
            statusMsg.tipo === 'ok' ? 'bg-emerald-600 text-white border-emerald-400' :
            statusMsg.tipo === 'erro' ? 'bg-rose-600 text-white border-rose-400' :
            'bg-slate-800 text-cyan-300 border-cyan-400'
          }`}>
            <span>{statusMsg.msg}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={onBack}
            className="border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black px-4 py-2 rounded-lg text-xs uppercase font-bold transition flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>
          
          <h1 className="text-2xl md:text-3xl font-bold text-emerald-400 tracking-widest uppercase text-center flex-1 flex items-center justify-center gap-3">
            <CheckCheck className="w-7 h-7" />
            <span>Frequência Arena</span>
          </h1>

          <div className="w-20"></div>
        </div>

        {/* Matrix Card */}
        <div className="bg-white/5 backdrop-blur-md border border-emerald-500/20 rounded-2xl overflow-hidden shadow-2xl">
          
          {/* Header Controls */}
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setDataAtual(new Date(ano, mes - 1, 1))}
                className="w-10 h-10 border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black rounded-lg flex items-center justify-center transition cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <h2 className="text-lg font-bold uppercase tracking-wider text-emerald-300 min-w-[180px] text-center">
                {nomesMes[mes]} {ano}
              </h2>

              <button 
                onClick={() => setDataAtual(new Date(ano, mes + 1, 1))}
                className="w-10 h-10 border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black rounded-lg flex items-center justify-center transition cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2">
              <select 
                value={filtroTurma}
                onChange={e => setFiltroTurma(e.target.value)}
                className="px-4 py-2.5 rounded-lg text-sm bg-gray-900 border border-emerald-500/30 text-white outline-none font-bold"
              >
                <option value="">TODAS AS TURMAS</option>
                {turmas.map(t => <option key={t.nome} value={t.nome}>{t.nome}</option>)}
              </select>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                {/* Saturdays Row */}
                <tr className="bg-emerald-500/10 border-b border-emerald-500/20">
                  <th className="w-64 text-left text-[11px] uppercase text-emerald-400 p-3 font-bold">Atleta</th>
                  {dias.map(d => (
                    <th key={d} className="w-20 p-2 text-center border-l border-emerald-500/10">
                      <div className="text-[9px] text-gray-400 font-bold uppercase">SÁB</div>
                      <div className="text-xl font-bold text-emerald-400">{d.split('-')[2]}</div>
                    </th>
                  ))}
                  <th className="w-20 text-center text-[11px] uppercase text-emerald-400 p-3 font-bold border-l border-emerald-500/10">Faltas</th>
                </tr>

                {/* Actions / Reports Row */}
                <tr className="bg-blue-500/10 border-b border-emerald-500/20">
                  <td className="text-[10px] uppercase text-blue-400 font-bold px-4 py-2">Relatórios / Ações</td>
                  {dias.map((_, i) => (
                    <td key={i} className="p-2 text-center border-l border-emerald-500/10">
                      <div className="flex flex-col gap-1 items-center justify-center">
                        <button onClick={() => compartilharGeral(i)} title="Relatório Geral WhatsApp" className="w-9 py-1 bg-emerald-500 text-black rounded text-[10px] font-bold hover:bg-emerald-400 transition cursor-pointer">
                          <Share2 className="w-3 h-3 mx-auto" />
                        </button>
                        <button onClick={() => compartilharOrdem(i)} title="Ordem de Chegada WhatsApp" className="w-9 py-1 bg-amber-400 text-black rounded text-[10px] font-bold hover:bg-amber-300 transition cursor-pointer">
                          <Clock className="w-3 h-3 mx-auto" />
                        </button>
                        <button onClick={() => compartilharSorteio(i)} title="Sorteio de Grupos WhatsApp" className="w-9 py-1 bg-purple-500 text-white rounded text-[10px] font-bold hover:bg-purple-400 transition cursor-pointer">
                          <Dice5 className="w-3 h-3 mx-auto" />
                        </button>
                        <button onClick={() => loteDia(i)} className="w-9 py-0.5 bg-blue-600 text-white rounded text-[9px] font-bold hover:bg-blue-500 transition cursor-pointer">
                          ALL
                        </button>
                      </div>
                    </td>
                  ))}
                  <td className="border-l border-emerald-500/10"></td>
                </tr>
              </thead>

              <tbody>
                {listaAlunos.length === 0 ? (
                  <tr>
                    <td colSpan={2 + dias.length} className="p-8 text-center text-gray-500 text-sm uppercase tracking-widest">
                      Nenhum aluno ativo encontrado
                    </td>
                  </tr>
                ) : (
                  listaAlunos.map((aluno, aIdx) => {
                    return (
                      <tr key={aIdx} className="border-b border-emerald-500/10 hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-left border-r border-emerald-500/10">
                          <div className="font-bold text-emerald-300 uppercase text-sm">{aluno.nome}</div>
                          <div className="text-[10px] text-gray-400 font-semibold">{aluno.turma || 'SEM TURMA'}</div>
                        </td>

                        {dias.map((dia, dIdx) => {
                          const isAtivo = ativo(aluno, dia);
                          if (!isAtivo) {
                            return (
                              <td key={dIdx} className="p-2 text-center border-r border-emerald-500/10">
                                <span className="text-[10px] bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded font-mono">N/M</span>
                              </td>
                            );
                          }

                          const kEdit = aIdx + '-' + dIdx;
                          const s = editando[kEdit] !== undefined ? editando[kEdit] : (freq[chave(aluno.nome, dia)] || '');
                          const txtJust = editando[kEdit + '-txt'] || freq[chave(aluno.nome, dia) + '-txt'] || '';

                          return (
                            <td key={dIdx} className="p-2 text-center border-r border-emerald-500/10">
                              <button
                                onClick={() => cicloStatus(aIdx, dIdx)}
                                title={s === 'J' ? `Justificativa: ${txtJust || 'Não informada'}` : undefined}
                                className={`w-9 h-9 rounded-lg font-bold text-sm transition cursor-pointer border flex items-center justify-center mx-auto relative ${CORES[s]}`}
                              >
                                {s}
                                {s === 'J' && txtJust && (
                                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full shadow-[0_0_6px_#22d3ee]"></span>
                                )}
                              </button>
                            </td>
                          );
                        })}

                        {/* Total Absences */}
                        <td className="p-2 text-center">
                          {(() => {
                            let fTotal = 0;
                            dias.forEach((dia, dIdx) => {
                              const kEdit = aIdx + '-' + dIdx;
                              const s = editando[kEdit] !== undefined ? editando[kEdit] : (freq[chave(aluno.nome, dia)] || '');
                              if (s === 'F' || s === 'J') fTotal++;
                            });
                            return (
                              <span className="bg-rose-500/20 text-rose-400 px-3 py-1 rounded-full text-xs font-bold border border-rose-500/40">
                                {fTotal}
                              </span>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Attendance Totals Footer */}
              <tfoot>
                <tr className="bg-emerald-500/10 font-bold border-t border-emerald-500/30">
                  <td className="text-left text-xs uppercase text-emerald-400 px-4 py-3">Presenças / Dia</td>
                  {dias.map((dia, dIdx) => {
                    let totalPresencas = 0;
                    listaAlunos.forEach((aluno, aIdx) => {
                      const kEdit = aIdx + '-' + dIdx;
                      const s = editando[kEdit] !== undefined ? editando[kEdit] : (freq[chave(aluno.nome, dia)] || '');
                      if (s === 'P' || s === 'A') totalPresencas++;
                    });
                    return (
                      <td key={dIdx} className="p-2 text-center border-l border-emerald-500/10 text-emerald-400 text-sm">
                        {totalPresencas}
                      </td>
                    );
                  })}
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Bottom Action Footer */}
          <div className="p-4 border-t border-emerald-500/20 flex flex-col sm:flex-row gap-3 justify-end bg-black/40">
            <button 
              onClick={sincronizar}
              disabled={syncing}
              className="px-6 py-3 rounded-lg border border-cyan-400 text-cyan-300 hover:bg-cyan-500/20 transition text-xs uppercase font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>Sincronizar</span>
            </button>

            <button 
              onClick={salvarTudo}
              disabled={saving}
              className="px-6 py-3 rounded-lg border border-emerald-400 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-black transition text-xs uppercase font-bold flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'SALVANDO...' : 'Salvar Tudo'}</span>
            </button>
          </div>

        </div>

      </div>

      {/* Justification Modal */}
      {justModal.open && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121826] border border-cyan-500/40 p-6 rounded-2xl max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-cyan-400 mb-4 uppercase">Justificar Falta</h3>
            <textarea 
              value={justModal.texto}
              onChange={e => setJustModal({ ...justModal, texto: e.target.value })}
              placeholder="Digite o motivo da falta..."
              className="w-full p-3 rounded-lg bg-gray-900 border border-cyan-500/30 text-white text-sm outline-none mb-4 min-h-[100px]"
            />
            <div className="flex gap-3">
              <button 
                onClick={() => setJustModal({ open: false, aIdx: -1, dIdx: -1, texto: '' })}
                className="flex-1 border border-gray-500 text-gray-400 p-3 rounded-lg uppercase text-xs font-bold hover:bg-gray-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={salvarJustificativa}
                className="flex-1 bg-cyan-500 text-black p-3 rounded-lg uppercase text-xs font-bold hover:bg-cyan-400 transition cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
