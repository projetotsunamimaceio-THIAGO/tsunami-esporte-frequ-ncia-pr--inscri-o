import React, { useState, useEffect, useRef } from 'react';
import { Aluno } from '../types';
import { subscribeFirestoreAlunos, subscribeFirestoreFrequencia } from '../lib/firestoreService';
import { ArrowLeft, PieChart as PieIcon, Trophy, Star, Award, ChevronDown } from 'lucide-react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface RelatorioViewProps {
  onBack: () => void;
  apenasPontuacao?: boolean;
}

export function RelatorioView({ onBack, apenasPontuacao = false }: RelatorioViewProps) {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [freq, setFreq] = useState<Record<string, string>>({});
  const [ordens, setOrdens] = useState<Record<string, string>>({});

  // Filter States
  const [mesRef, setMesRef] = useState(new Date().toISOString().slice(0, 7));
  const [filtroTipo, setFiltroTipo] = useState('mes');
  const [filtroPeriodo, setFiltroPeriodo] = useState('30');

  // Stats Counters
  const [totalAlunosSab, setTotalAlunosSab] = useState(0);
  const [totalTurmasSab, setTotalTurmasSab] = useState(0);

  // Pontuação States
  const [mesRefPontos, setMesRefPontos] = useState(new Date().toISOString().slice(0, 7));
  const [janelaPontos, setJanelaPontos] = useState('1');

  // Chart Canvas Refs
  const pieCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const barCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lineCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const pieChartInst = useRef<Chart | null>(null);
  const barChartInst = useRef<Chart | null>(null);
  const lineChartInst = useRef<Chart | null>(null);

  const CORES_PALETA = ['#06b6d4', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#3b82f6', '#10b981'];
  const PTS_SISTEMA = { P: 5, A: 2, J: -1, F: -3 };

  useEffect(() => {
    const unsubAlunos = subscribeFirestoreAlunos((list) => {
      setAlunos(list);
      localStorage.setItem('tsunami_alunos', JSON.stringify(list));
    });

    const unsubFreq = subscribeFirestoreFrequencia(({ freq: fMap, ordens: oMap }) => {
      setFreq(fMap);
      setOrdens(oMap);
      localStorage.setItem('tsunami_freq', JSON.stringify(fMap));
      localStorage.setItem('tsunami_ordens', JSON.stringify(oMap));
    });

    return () => {
      unsubAlunos();
      unsubFreq();
    };
  }, []);

  useEffect(() => {
    if (alunos.length > 0) {
      processarDadosGraficos();
    }
  }, [alunos, freq, mesRef, filtroTipo, filtroPeriodo]);

  const processarDadosGraficos = () => {
    if (!mesRef) return;
    const [anoRef, mesRef0] = mesRef.split('-').map(Number);
    const dataFinalFiltro = new Date(anoRef, mesRef0, 0);
    const dataInicialFiltro = new Date(dataFinalFiltro);
    dataInicialFiltro.setDate(dataFinalFiltro.getDate() - parseInt(filtroPeriodo));

    const mapaAlunos: Record<string, string> = {};
    const statsIndividuais: Record<string, { P: number; F: number; turma: string; nomeOriginal: string }> = {};

    alunos.forEach(a => {
      const key = a.nome.trim().toUpperCase();
      mapaAlunos[key] = a.turma || 'S/T';
      statsIndividuais[key] = { P: 0, F: 0, turma: a.turma || 'S/T', nomeOriginal: a.nome };
    });

    const dadosTurmaColunas: Record<string, { P: number; F: number }> = {};
    const evolucaoPorData: Record<string, Record<string, number>> = {};
    const contagemAlunosSabado = new Set<string>();

    Object.entries(freq).forEach(([chave, status]) => {
      if (chave.endsWith('-txt')) return;
      const partes = chave.split('|');
      if (partes.length < 2) return;

      const nomeRaw = partes[0].trim().toUpperCase();
      const dataISO = partes[1];
      const dataF = new Date(dataISO + 'T00:00:00');

      if (dataF.getDay() !== 6) return; // Only Saturdays

      let dentroDoPeriodo = false;
      if (dataF >= dataInicialFiltro && dataF <= dataFinalFiltro) {
        const mRef = mesRef0 - 1;
        const mData = dataF.getMonth();

        if (filtroTipo === 'mes' && mData === mRef) dentroDoPeriodo = true;
        else if (filtroTipo === 'bimestre' && mData >= (mRef - 1) && mData <= mRef) dentroDoPeriodo = true;
        else if (filtroTipo === 'trimestre' && mData >= (mRef - 2) && mData <= mRef) dentroDoPeriodo = true;
        else if (filtroTipo === 'semestre' && mData >= (mRef - 5) && mData <= mRef) dentroDoPeriodo = true;
        else if (filtroTipo === 'ano' && dataF.getFullYear() === anoRef) dentroDoPeriodo = true;
      }

      if (dentroDoPeriodo) {
        const tNome = mapaAlunos[nomeRaw] || 'S/T';
        if (!dadosTurmaColunas[tNome]) dadosTurmaColunas[tNome] = { P: 0, F: 0 };
        if (!evolucaoPorData[dataISO]) evolucaoPorData[dataISO] = {};

        contagemAlunosSabado.add(nomeRaw);

        if (status === 'P' || status === 'A') {
          dadosTurmaColunas[tNome].P++;
          evolucaoPorData[dataISO][tNome] = (evolucaoPorData[dataISO][tNome] || 0) + 1;
          if (statsIndividuais[nomeRaw]) statsIndividuais[nomeRaw].P++;
        } else if (status === 'F') {
          dadosTurmaColunas[tNome].F++;
          if (statsIndividuais[nomeRaw]) statsIndividuais[nomeRaw].F++;
        }
      }
    });

    setTotalAlunosSab(contagemAlunosSabado.size);
    setTotalTurmasSab(Object.keys(dadosTurmaColunas).length);

    // Update Pie Chart
    if (pieCanvasRef.current) {
      if (pieChartInst.current) pieChartInst.current.destroy();
      const labels = Object.keys(dadosTurmaColunas);
      const data = labels.map(t => alunos.filter(a => (a.turma || 'S/T') === t).length);
      pieChartInst.current = new Chart(pieCanvasRef.current, {
        type: 'pie',
        data: {
          labels,
          datasets: [{ data, backgroundColor: CORES_PALETA }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: 'white', font: { size: 10 } } } }
        }
      });
    }

    // Update Bar Chart
    if (barCanvasRef.current) {
      if (barChartInst.current) barChartInst.current.destroy();
      const labels = Object.keys(dadosTurmaColunas);
      barChartInst.current = new Chart(barCanvasRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Presenças', backgroundColor: '#10b981', data: labels.map(l => dadosTurmaColunas[l].P) },
            { label: 'Faltas', backgroundColor: '#f43f5e', data: labels.map(l => dadosTurmaColunas[l].F) }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: 'white', font: { size: 10 } } } },
          scales: {
            x: { ticks: { color: 'white' } },
            y: { ticks: { color: 'white' }, beginAtZero: true }
          }
        }
      });
    }

    // Update Line Chart
    if (lineCanvasRef.current) {
      if (lineChartInst.current) lineChartInst.current.destroy();
      const datasOrd = Object.keys(evolucaoPorData).sort();
      const labels = datasOrd.map(d => d.split('-').reverse().slice(0, 2).join('/'));
      const turmasUnicas = Object.keys(dadosTurmaColunas).sort();
      const dataPointsGeral = datasOrd.map(dt => turmasUnicas.reduce((s, t) => s + (evolucaoPorData[dt][t] || 0), 0));

      const datasets: any[] = [{
        label: 'PRESENÇA TOTAL (SÁB)',
        data: dataPointsGeral,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.3
      }];

      turmasUnicas.forEach((t, idx) => {
        datasets.push({
          label: t,
          data: datasOrd.map(dt => evolucaoPorData[dt][t] || 0),
          borderColor: CORES_PALETA[idx % CORES_PALETA.length],
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.3
        });
      });

      lineChartInst.current = new Chart(lineCanvasRef.current, {
        type: 'line',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: 'white', font: { size: 10 } } } },
          scales: {
            x: { ticks: { color: 'white' } },
            y: { ticks: { color: 'white' }, beginAtZero: true }
          }
        }
      });
    }
  };

  // Pontuação Processing
  const calcularPontuacao = () => {
    if (!mesRefPontos) return { lista: [], totalArenas: 0 };
    const [anoRef, mes1] = mesRefPontos.split('-').map(Number);
    const janela = parseInt(janelaPontos);

    const periodos: { ano: number; mes: number }[] = [];
    for (let i = 0; i < janela; i++) {
      let m = mes1 - i, a = anoRef;
      if (m <= 0) { m += 12; a -= 1; }
      periodos.push({ ano: a, mes: m });
    }

    const sabadosNoPeriodo = new Set<string>();
    Object.keys(freq).forEach(chave => {
      if (chave.endsWith('-txt')) return;
      const partes = chave.split('|');
      if (partes.length < 2) return;
      const dataISO = partes[1];
      const dataF = new Date(dataISO + 'T00:00:00');
      if (dataF.getDay() !== 6) return;
      const mData = dataF.getMonth() + 1, aData = dataF.getFullYear();
      if (periodos.some(p => p.mes === mData && p.ano === aData)) {
        sabadosNoPeriodo.add(dataISO);
      }
    });

    const totalArenas = sabadosNoPeriodo.size;
    const statsMap: Record<string, any> = {};

    alunos.forEach(a => {
      const key = a.nome.trim().toUpperCase();
      statsMap[key] = { nomeOriginal: a.nome, turma: a.turma || '', P: 0, A: 0, J: 0, F: 0, chegadas: [] };
    });

    Object.entries(freq).forEach(([chave, status]) => {
      if (chave.endsWith('-txt')) return;
      const partes = chave.split('|');
      if (partes.length < 2) return;
      const nomeRaw = partes[0].trim().toUpperCase();
      const dataISO = partes[1];
      const dataF = new Date(dataISO + 'T00:00:00');
      if (dataF.getDay() !== 6) return;
      const mData = dataF.getMonth() + 1, aData = dataF.getFullYear();
      if (!periodos.some(p => p.mes === mData && p.ano === aData)) return;

      if (!statsMap[nomeRaw]) {
        const alunoEncontrado = alunos.find(a => a.nome.trim().toUpperCase() === nomeRaw);
        statsMap[nomeRaw] = { nomeOriginal: alunoEncontrado ? alunoEncontrado.nome : nomeRaw, turma: alunoEncontrado?.turma || '', P: 0, A: 0, J: 0, F: 0, chegadas: [] };
      }

      const s = (status || '').toUpperCase();
      if (s === 'P' || s === 'A') {
        if (s === 'P') statsMap[nomeRaw].P++;
        if (s === 'A') statsMap[nomeRaw].A++;
        const hora = ordens[chave];
        if (hora && typeof hora === 'string') {
          const match = hora.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
          if (match) {
            const h = parseInt(match[1]), min = parseInt(match[2]), seg = match[3] ? parseInt(match[3]) : 0;
            if (!isNaN(h) && !isNaN(min) && !isNaN(seg)) {
              statsMap[nomeRaw].chegadas.push(h * 3600 + min * 60 + seg);
            }
          }
        }
      } else if (s === 'J') statsMap[nomeRaw].J++;
      else if (s === 'F') statsMap[nomeRaw].F++;
    });

    const lista = Object.values(statsMap)
      .filter(a => {
        const t = (a.turma || '').trim().toUpperCase();
        if (!t || t === 'S/T' || t === 'SEM TURMA') return false;
        return a.P + a.A + a.J + a.F > 0;
      })
      .map(a => {
        const totalC = a.chegadas.length;
        const mediaSeg = totalC > 0 ? Math.round(a.chegadas.reduce((s: number, v: number) => s + v, 0) / totalC) : null;
        return {
          ...a,
          pontos: a.P * PTS_SISTEMA.P + a.A * PTS_SISTEMA.A + a.J * PTS_SISTEMA.J + a.F * PTS_SISTEMA.F,
          mediaChegada: mediaSeg,
          qAluno: a.P + a.A + a.J + a.F
        };
      })
      .sort((a, b) => {
        if (b.pontos !== a.pontos) return b.pontos - a.pontos;
        if (a.mediaChegada !== null && b.mediaChegada !== null && a.mediaChegada !== b.mediaChegada) {
          return a.mediaChegada - b.mediaChegada;
        }
        if (a.mediaChegada !== null && b.mediaChegada === null) return -1;
        if (a.mediaChegada === null && b.mediaChegada !== null) return 1;
        if (b.P !== a.P) return b.P - a.P;
        if (a.A !== b.A) return a.A - b.A;
        if (a.F !== b.F) return a.F - b.F;
        return 0;
      });

    return { lista, totalArenas };
  };

  const { lista: listaPontos, totalArenas } = calcularPontuacao();
  const maxPts = Math.max(...listaPontos.map(a => a.pontos), 1);
  const minPts = Math.min(...listaPontos.map(a => a.pontos), 0);
  const range = (maxPts - minPts) || 1;

  // Compute rankings (excluding S/T)
  const listaIndividuais = Object.values(alunos.reduce((acc: Record<string, any>, a) => {
    const t = (a.turma || '').trim().toUpperCase();
    if (!t || t === 'S/T' || t === 'SEM TURMA') return acc;
    const key = a.nome.trim().toUpperCase();
    let P = 0, F = 0;
    Object.entries(freq).forEach(([k, s]) => {
      if (k.startsWith(key + '|')) {
        if (s === 'P' || s === 'A') P++;
        if (s === 'F') F++;
      }
    });
    acc[key] = { nome: a.nome, turma: a.turma, P, F };
    return acc;
  }, {})).filter((a: any) => a.P > 0 || a.F > 0);

  const rankingPresencas = [...listaIndividuais].sort((a: any, b: any) => b.P - a.P).slice(0, 15);
  const rankingFaltas = [...listaIndividuais].sort((a: any, b: any) => b.F - a.F).slice(0, 15);

  if (apenasPontuacao) {
    return (
      <div className="min-h-screen w-full bg-[#0a0a0f] text-white font-rajdhani p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-violet-500/30 pb-4">
            <button 
              onClick={onBack}
              className="border border-violet-500/40 bg-violet-500/10 text-violet-300 hover:bg-violet-500 hover:text-white px-4 py-2 rounded-xl text-xs uppercase font-bold transition flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar à Tela Inicial</span>
            </button>

            <div className="text-center">
              <h1 className="text-3xl sm:text-4xl font-black text-yellow-400 tracking-wider uppercase font-chakra flex items-center justify-center gap-2 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">
                <Trophy className="w-8 h-8 text-yellow-400" />
                <span>RELATÓRIO DE PONTUAÇÃO</span>
              </h1>
              <p className="text-xs text-violet-300 tracking-[0.2em] uppercase mt-1">
                Acompanhamento Oficial de Desempenho
              </p>
            </div>

            <div className="flex flex-wrap gap-2 justify-center items-center">
              <input 
                type="month" 
                value={mesRefPontos}
                onChange={e => setMesRefPontos(e.target.value)}
                className="bg-[#1a1a2e] border border-violet-500 text-white p-2 rounded-lg outline-none text-xs font-bold"
              />

              <select 
                value={janelaPontos} 
                onChange={e => setJanelaPontos(e.target.value)}
                className="bg-[#1a1a2e] border border-violet-500 text-white p-2 rounded-lg outline-none text-xs font-bold"
              >
                <option value="1">Mês Atual</option>
                <option value="2">Mês Atual + Anterior</option>
                <option value="3">Mês Atual + 2 Anteriores</option>
              </select>
            </div>
          </div>

          {/* Rules Legend */}
          <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-xl flex flex-wrap gap-4 justify-center text-xs font-semibold border border-violet-500/30">
            <span className="text-gray-400 tracking-wider">SISTEMA DE PONTOS:</span>
            <span className="flex items-center gap-1">
              <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">P Presença</span>
              <b className="text-emerald-400">+5 pts</b>
            </span>
            <span className="flex items-center gap-1">
              <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-bold">A Atraso</span>
              <b className="text-amber-400">+2 pts</b>
            </span>
            <span className="flex items-center gap-1">
              <span className="bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded font-bold">J Justificativa</span>
              <b className="text-rose-400">−1 pt</b>
            </span>
            <span className="flex items-center gap-1">
              <span className="bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded font-bold">F Falta</span>
              <b className="text-rose-400">−3 pts</b>
            </span>
          </div>

          {/* Points Table */}
          <div className="bg-[#0e0a1a] backdrop-blur-md p-6 rounded-2xl border-2 border-violet-500/60 shadow-[0_0_30px_rgba(139,92,246,0.2)]">
            <div className="max-h-[600px] overflow-y-auto pr-1">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-violet-500/40 text-violet-300 font-chakra uppercase text-xs">
                    <th className="py-3 text-center w-12">#</th>
                    <th className="py-3 text-left">Aluno</th>
                    <th className="py-3 text-left">Turma</th>
                    <th className="py-3 text-center">P</th>
                    <th className="py-3 text-center">A</th>
                    <th className="py-3 text-center">J</th>
                    <th className="py-3 text-center">F</th>
                    <th className="py-3 text-center text-purple-300">Média Cheg.</th>
                    <th className="py-3 text-center text-emerald-400">
                      Q <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">{totalArenas}</span>
                    </th>
                    <th className="py-3 text-right">Pontuação</th>
                  </tr>
                </thead>

                <tbody>
                  {listaPontos.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-gray-400 uppercase font-bold text-xs">
                        Nenhum registro de pontuação para o período selecionado.
                      </td>
                    </tr>
                  ) : (
                    listaPontos.map((a: any, i: number) => {
                      const pos = i + 1;
                      const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
                      const pct = Math.max(0, ((a.pontos - minPts) / range) * 100);
                      const formatarMediaSegundos = (segTotal: number | null): string => {
                        if (segTotal === null) return '—';
                        const h = String(Math.floor(segTotal / 3600)).padStart(2, '0');
                        const m = String(Math.floor((segTotal % 3600) / 60)).padStart(2, '0');
                        const s = String(segTotal % 60).padStart(2, '0');
                        return `${h}:${m}:${s}`;
                      };
                      const horaFormatada = formatarMediaSegundos(a.mediaChegada);

                      return (
                        <tr key={i} className="border-b border-white/5 hover:bg-violet-950/20 transition">
                          <td className="py-2.5 text-center font-bold text-sm">
                            {medals[pos] ? medals[pos] : `${pos}º`}
                          </td>
                          <td className="py-2.5 font-extrabold text-white uppercase">{a.nomeOriginal}</td>
                          <td className="py-2.5 text-gray-400 font-semibold">{a.turma}</td>
                          <td className="py-2.5 text-center"><span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-extrabold">{a.P}</span></td>
                          <td className="py-2.5 text-center"><span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-extrabold">{a.A}</span></td>
                          <td className="py-2.5 text-center"><span className="bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded font-extrabold">{a.J}</span></td>
                          <td className="py-2.5 text-center"><span className="bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded font-extrabold">{a.F}</span></td>
                          <td className="py-2.5 text-center font-mono text-purple-300 font-bold">{horaFormatada}</td>
                          <td className="py-2.5 text-center font-bold text-emerald-400">
                            {a.qAluno}<span className="text-gray-500 text-[10px]">/{totalArenas}</span>
                          </td>
                          <td className="py-2.5 text-right">
                            <span className={`font-black text-sm ${a.pontos > 0 ? 'text-emerald-400' : a.pontos < 0 ? 'text-rose-400' : 'text-gray-400'}`}>
                              {a.pontos > 0 ? '+' : ''}{a.pontos} pts
                            </span>
                            <span className="inline-block w-14 h-1.5 bg-white/10 rounded-full overflow-hidden ml-2 align-middle">
                              <span className="block h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: a.pontos >= 0 ? '#10b981' : '#f43f5e' }}></span>
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0a0a0f] text-white font-rajdhani p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          <button 
            onClick={onBack}
            className="border border-violet-500/40 bg-violet-500/10 text-violet-300 hover:bg-violet-500 hover:text-white px-4 py-2 rounded-lg text-xs uppercase font-bold transition flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>

          <div className="text-center">
            <h1 className="text-3xl font-bold text-violet-400 tracking-widest uppercase drop-shadow-[0_0_10px_rgba(139,92,246,0.5)]">
              Estatísticas Arena
            </h1>
            <p className="text-[10px] text-violet-400 tracking-[0.3em] uppercase mt-1">
              Apenas dados de Sábado
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            <input 
              type="month" 
              value={mesRef}
              onChange={e => setMesRef(e.target.value)}
              className="bg-[#1a1a2e] border border-violet-500 text-white p-2 rounded-lg outline-none text-xs"
            />

            <select 
              value={filtroTipo} 
              onChange={e => setFiltroTipo(e.target.value)}
              className="bg-[#1a1a2e] border border-violet-500 text-white p-2 rounded-lg outline-none text-xs"
            >
              <option value="mes">Apenas o Mês</option>
              <option value="bimestre">Bimestre</option>
              <option value="trimestre">Trimestre</option>
              <option value="semestre">Semestre</option>
              <option value="ano">Ano Inteiro</option>
            </select>

            <select 
              value={filtroPeriodo} 
              onChange={e => setFiltroPeriodo(e.target.value)}
              className="bg-[#1a1a2e] border border-violet-500 text-white p-2 rounded-lg outline-none text-xs"
            >
              <option value="30">Últimos 30 dias</option>
              <option value="60">Últimos 60 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="120">Últimos 120 dias</option>
            </select>
          </div>
        </div>

        {/* Counter Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl text-center border-b-4 border-violet-500">
            <h3 className="text-xs uppercase text-violet-400 mb-1 font-bold">Alunos em Sábados</h3>
            <p className="text-4xl font-bold text-white">{totalAlunosSab}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl text-center border-b-4 border-cyan-500">
            <h3 className="text-xs uppercase text-cyan-400 mb-1 font-bold">Turmas Ativas (Sáb)</h3>
            <p className="text-4xl font-bold text-white">{totalTurmasSab}</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-violet-500/20">
            <h3 className="text-sm font-bold uppercase mb-4 text-violet-300">Alunos por Turma</h3>
            <div className="relative h-[300px] w-full">
              <canvas ref={pieCanvasRef}></canvas>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-cyan-500/20">
            <h3 className="text-sm font-bold uppercase mb-4 text-cyan-300">Presença vs Faltas (Sábados)</h3>
            <div className="relative h-[300px] w-full">
              <canvas ref={barCanvasRef}></canvas>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-emerald-500/20 md:col-span-2">
            <h3 className="text-sm font-bold uppercase mb-4 text-emerald-300">Evolução de Presenças aos Sábados</h3>
            <div className="relative h-[300px] w-full">
              <canvas ref={lineCanvasRef}></canvas>
            </div>
          </div>
        </div>

        {/* Rankings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border-t-2 border-emerald-500">
            <h3 className="text-sm font-bold uppercase mb-4 text-emerald-400 flex items-center gap-2">
              <Star className="w-4 h-4 fill-emerald-400 text-emerald-400" />
              <span>Ranking Sábado: 15 Mais Frequentes</span>
            </h3>
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-emerald-500/20 text-emerald-400">
                    <th className="text-left py-2">Aluno</th>
                    <th className="text-left py-2">Turma</th>
                    <th className="text-right py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingPresencas.map((a: any, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="py-2 font-bold">{a.nome}</td>
                      <td className="py-2 text-gray-400">{a.turma}</td>
                      <td className="py-2 text-right font-bold text-emerald-400">{a.P}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border-t-2 border-rose-500">
            <h3 className="text-sm font-bold uppercase mb-4 text-rose-400 flex items-center gap-2">
              <Star className="w-4 h-4 fill-rose-400 text-rose-400" />
              <span>Ranking Sábado: 15 Mais Faltas</span>
            </h3>
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-rose-500/20 text-rose-400">
                    <th className="text-left py-2">Aluno</th>
                    <th className="text-left py-2">Turma</th>
                    <th className="text-right py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingFaltas.map((a: any, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="py-2 font-bold">{a.nome}</td>
                      <td className="py-2 text-gray-400">{a.turma}</td>
                      <td className="py-2 text-right font-bold text-rose-400">{a.F}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Pontuação Section */}
        <div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <h2 className="text-xl font-bold text-violet-400 tracking-widest uppercase flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <span>Relatório de Pontuação</span>
            </h2>

            <div className="flex flex-wrap gap-2 justify-center items-center">
              <input 
                type="month" 
                value={mesRefPontos}
                onChange={e => setMesRefPontos(e.target.value)}
                className="bg-[#1a1a2e] border border-violet-500 text-white p-2 rounded-lg outline-none text-xs"
              />

              <select 
                value={janelaPontos} 
                onChange={e => setJanelaPontos(e.target.value)}
                className="bg-[#1a1a2e] border border-violet-500 text-white p-2 rounded-lg outline-none text-xs"
              >
                <option value="1">Mês Atual</option>
                <option value="2">Mês Atual + Anterior</option>
                <option value="3">Mês Atual + 2 Anteriores</option>
              </select>
            </div>
          </div>

          {/* Rules Legend */}
          <div className="bg-white/5 backdrop-blur-md p-3 rounded-xl mb-4 flex flex-wrap gap-4 justify-center text-xs font-semibold">
            <span className="text-gray-400 tracking-wider">SISTEMA:</span>
            <span className="flex items-center gap-1">
              <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">P Presença</span>
              <b className="text-emerald-400">+5 pts</b>
            </span>
            <span className="flex items-center gap-1">
              <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">A Atraso</span>
              <b className="text-amber-400">+2 pts</b>
            </span>
            <span className="flex items-center gap-1">
              <span className="bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">J Justificativa</span>
              <b className="text-rose-400">−1 pt</b>
            </span>
            <span className="flex items-center gap-1">
              <span className="bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded">F Falta</span>
              <b className="text-rose-400">−3 pts</b>
            </span>
          </div>

          {/* Points Ranking Table */}
          <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border-t-2 border-violet-500">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-violet-500/30 text-violet-300">
                    <th className="py-2 text-center w-10">#</th>
                    <th className="py-2 text-left">Aluno</th>
                    <th className="py-2 text-left">Turma</th>
                    <th className="py-2 text-center">P</th>
                    <th className="py-2 text-center">A</th>
                    <th className="py-2 text-center">J</th>
                    <th className="py-2 text-center">F</th>
                    <th className="py-2 text-center text-purple-300">Média Cheg.</th>
                    <th className="py-2 text-center text-emerald-400">
                      Q <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">{totalArenas}</span>
                    </th>
                    <th className="py-2 text-right">Pontuação</th>
                  </tr>
                </thead>

                <tbody>
                  {listaPontos.map((a: any, i: number) => {
                    const pos = i + 1;
                    const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
                    const pct = Math.max(0, ((a.pontos - minPts) / range) * 100);
                    const formatarMediaSegundos = (segTotal: number | null): string => {
                      if (segTotal === null) return '—';
                      const h = String(Math.floor(segTotal / 3600)).padStart(2, '0');
                      const m = String(Math.floor((segTotal % 3600) / 60)).padStart(2, '0');
                      const s = String(segTotal % 60).padStart(2, '0');
                      return `${h}:${m}:${s}`;
                    };
                    const horaFormatada = formatarMediaSegundos(a.mediaChegada);

                    return (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="py-2 text-center font-bold text-sm">
                          {medals[pos] ? medals[pos] : `${pos}º`}
                        </td>
                        <td className="py-2 font-bold text-white">{a.nomeOriginal}</td>
                        <td className="py-2 text-gray-400">{a.turma}</td>
                        <td className="py-2 text-center"><span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">{a.P}</span></td>
                        <td className="py-2 text-center"><span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">{a.A}</span></td>
                        <td className="py-2 text-center"><span className="bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded font-bold">{a.J}</span></td>
                        <td className="py-2 text-center"><span className="bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded font-bold">{a.F}</span></td>
                        <td className="py-2 text-center font-mono text-purple-300">{horaFormatada}</td>
                        <td className="py-2 text-center font-bold text-emerald-400">
                          {a.qAluno}<span className="text-gray-500 text-[10px]">/{totalArenas}</span>
                        </td>
                        <td className="py-2 text-right">
                          <span className={`font-bold ${a.pontos > 0 ? 'text-emerald-400' : a.pontos < 0 ? 'text-rose-400' : 'text-gray-400'}`}>
                            {a.pontos > 0 ? '+' : ''}{a.pontos} pts
                          </span>
                          <span className="inline-block w-14 h-1.5 bg-white/10 rounded-full overflow-hidden ml-2 align-middle">
                            <span className="block h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: a.pontos >= 0 ? '#10b981' : '#f43f5e' }}></span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
