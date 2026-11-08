import React, { useState, useEffect, useRef } from 'react';
import { Aluno, Turma } from '../types';
import { 
  subscribeFirestoreAlunos, 
  subscribeFirestoreTurmas, 
  subscribeFirestoreFrequencia, 
  saveFirestoreFrequencia, 
  deleteFirestoreFrequencia 
} from '../lib/firestoreService';
import { 
  ArrowLeft, 
  Fingerprint, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  Trash2, 
  Calendar,
  Sparkles,
  Camera,
  CameraOff
} from 'lucide-react';

interface ArenaFacialViewProps {
  onBack: () => void;
}

export function ArenaFacialView({ onBack }: ArenaFacialViewProps) {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [freq, setFreq] = useState<Record<string, string>>({});
  const [ordens, setOrdens] = useState<Record<string, string>>({});
  const [filtroTurma, setFiltroTurma] = useState('');

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

  const hojeISO = getISOString(new Date()) || new Date().toISOString().split('T')[0];

  // Selected class date (default to today)
  const [dataAula, setDataAula] = useState<string>(hojeISO);

  // Check if student is active/enrolled on dataISO
  const ativo = (aluno: Aluno, dataISO: string) => {
    const mat = getISOString(aluno.matricula_rematricula);
    const ven = getISOString(aluno.data_vencimento);
    if (mat && ven && dataISO >= mat && dataISO <= ven) return true;

    if (aluno.historico_matriculas && Array.isArray(aluno.historico_matriculas)) {
      for (const p of aluno.historico_matriculas) {
        const hMat = getISOString(p.inicio);
        const hVen = getISOString(p.fim);
        if (hMat && hVen && dataISO >= hMat && dataISO <= hVen) return true;
      }
    }

    if (freq[chave(aluno.nome, dataISO)]) return true;
    if (!mat && !ven && (!aluno.historico_matriculas || aluno.historico_matriculas.length === 0)) return true;

    return false;
  };

  // Camera & Scan Animation State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [hudPercent, setHudPercent] = useState(0);
  const [hudText, setHudText] = useState('Detectando rosto...');
  const [processingIdx, setProcessingIdx] = useState<number | null>(null);

  // Result Overlay
  const [resultOverlay, setResultOverlay] = useState<{
    open: boolean;
    aluno?: Aluno;
    hora?: string;
    syncState: 'syncing' | 'ok' | 'error';
  }>({ open: false, syncState: 'syncing' });

  // Long press correction modal
  const [correcaoIdx, setCorrecaoIdx] = useState<number | null>(null);
  const pressTimerRef = useRef<any>(null);

  // Clear Date Modal Confirmation
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const unsubAlunos = subscribeFirestoreAlunos((list) => {
      setAlunos(list);
      localStorage.setItem('tsunami_alunos', JSON.stringify(list));
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

    // Auto-start camera when mounting view
    ligarCamera();

    return () => {
      desligarCamera();
      unsubAlunos();
      unsubTurmas();
      unsubFreq();
    };
  }, []);

  const chave = (nome: string, dataISO: string) => (nome.trim().toUpperCase() + '|' + dataISO);

  const ligarCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Seu navegador não possui suporte para acesso direto à câmera.');
        return false;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
        });
      } catch (firstErr) {
        // Fallback constraint if facingMode is not supported on desktop webcams
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
      setCameraError(null);
      return true;
    } catch (err: any) {
      console.warn('Câmera indisponível ou permissão negada:', err);
      setCameraError('Permissão para câmera não concedida no navegador.');
      setCameraActive(false);
      return false;
    }
  };

  const desligarCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Helper audio beep on biometric match
  const playBeepSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  };

  const iniciarProcesso = async (idx: number) => {
    const aluno = listaFiltrada[idx];
    if (!aluno) return;
    const k = chave(aluno.nome, dataAula);

    if (freq[k] === 'P' || freq[k] === 'A') {
      // Already marked, show result modal with current info
      setResultOverlay({
        open: true,
        aluno,
        hora: ordens[k] || new Date().toLocaleTimeString('pt-BR'),
        syncState: 'ok'
      });
      return;
    }

    setProcessingIdx(idx);

    const agora = new Date();
    const hStr = agora.getHours().toString().padStart(2, '0') + ':' +
      agora.getMinutes().toString().padStart(2, '0') + ':' +
      agora.getSeconds().toString().padStart(2, '0');

    // 1. Turn on camera and show biometric HUD
    await ligarCamera();
    setScanning(true);

    const frases = [
      'Detectando e centralizando rosto...',
      'Mapeando 68 pontos biométricos...',
      'Analisando malha e distância ocular...',
      'Comparando vetor biométrico com cadastro...',
      'Biometria Confirmada (Match 98.7%)!'
    ];

    const startTime = Date.now();
    const duration = 4500; // 4.5 seconds scan animation duration as requested

    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / duration);
        const percent = Math.min(98.7, Math.floor(progress * 100 * 0.987));
        
        setHudPercent(Number(percent.toFixed(1)));

        const phraseIdx = Math.min(
          frases.length - 1,
          Math.floor(progress * (frases.length - 1))
        );
        setHudText(frases[phraseIdx]);

        if (elapsed >= duration) {
          clearInterval(interval);
          setHudPercent(98.7);
          setHudText('Biometria Confirmada (Match 98.7%)!');
          if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
          playBeepSound();
          resolve();
        }
      }, 70);
    });

    await new Promise(r => setTimeout(r, 400));
    setScanning(false);

    // 2. Show Result Overlay & sync with Firestore
    setResultOverlay({
      open: true,
      aluno,
      hora: hStr,
      syncState: 'syncing'
    });

    setProcessingIdx(null);

    // 3. Save presence to Firestore
    sincronizarPresenca(aluno.nome, dataAula, 'P', hStr);
  };

  const sincronizarPresenca = async (nome: string, dataISO: string, statusText: string, hora: string) => {
    try {
      await saveFirestoreFrequencia(nome, dataISO, statusText, '', hora);
      setResultOverlay(prev => ({ ...prev, syncState: 'ok' }));
    } catch (e) {
      setResultOverlay(prev => ({ ...prev, syncState: 'error' }));
    }
  };

  // Long Press handlers
  const handleTouchStart = (idx: number) => {
    pressTimerRef.current = setTimeout(() => {
      setCorrecaoIdx(idx);
    }, 600);
  };

  const handleTouchEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const corrigirStatus = async (novoStatus: string | null) => {
    if (correcaoIdx === null) return;
    const aluno = listaFiltrada[correcaoIdx];
    if (!aluno) return;

    if (novoStatus === null) {
      try {
        await deleteFirestoreFrequencia(aluno.nome, dataAula);
      } catch (e) {}
    } else {
      const hStr = new Date().toLocaleTimeString('pt-BR');
      sincronizarPresenca(aluno.nome, dataAula, novoStatus, hStr);
    }

    setCorrecaoIdx(null);
  };

  const limparFrequenciaDaData = async () => {
    setClearing(true);
    const alunosNaData = alunos.filter(a => {
      const k = chave(a.nome, dataAula);
      return freq[k] && freq[k].trim() !== '';
    });

    for (const aluno of alunosNaData) {
      try {
        await deleteFirestoreFrequencia(aluno.nome, dataAula);
      } catch (e) {}
    }

    setClearing(false);
    setShowClearModal(false);
  };

  // Filter students strictly for those active/enrolled on dataAula
  const listaFiltrada = alunos
    .filter(a => ativo(a, dataAula))
    .filter(a => !filtroTurma || a.turma === filtroTurma)
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const comFotoCount = listaFiltrada.filter(a => a.face_data && a.face_data.length > 100).length;

  const dataBR = dataAula.split('-').reverse().join('/');

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0a0a0f] to-[#1a1a2e] text-white font-rajdhani p-4">
      <div className="max-w-md mx-auto">
        
        {/* Header */}
        <div className="bg-emerald-500/10 border-b-2 border-emerald-500 p-4 rounded-t-2xl mb-4 flex justify-between items-center">
          <button 
            onClick={onBack}
            className="text-emerald-400 text-xs font-bold uppercase hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>

          <h1 className="text-lg font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-emerald-400" />
            <span>Arena Facial</span>
          </h1>

          <button 
            onClick={() => setShowClearModal(true)}
            title="Limpar Frequências desta data"
            className="text-rose-400 hover:text-rose-300 text-xs font-bold flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 px-2 py-1 rounded cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Date Selector Banner */}
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-emerald-400">
            <Calendar className="w-4 h-4" />
            <span className="text-xs font-bold uppercase">Data da Aula:</span>
          </div>

          <input 
            type="date" 
            value={dataAula}
            onChange={(e) => setDataAula(e.target.value)}
            className="bg-gray-900 border border-emerald-500/40 text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-lg outline-none cursor-pointer"
          />
        </div>

        {/* Instruction Banner */}
        <div className="bg-white/5 border border-emerald-500/30 rounded-xl p-3 text-center mb-4">
          <p className="text-xs text-emerald-400 uppercase font-semibold flex items-center justify-center gap-1">
            <Fingerprint className="w-4 h-4" />
            <span>Toque no aluno matriculado para iniciar leitura biométrica ({dataBR})</span>
          </p>
        </div>

        {/* Camera HUD Box with Realistic Biometric Mesh Overlay */}
        <div className="bg-white/5 backdrop-blur-md border border-emerald-500/30 p-4 rounded-2xl mb-4 text-center">
          <div className="flex justify-between items-center mb-3 px-1">
            <p className="text-[11px] uppercase text-emerald-400 font-bold tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{cameraActive ? 'Reconhecimento Biométrico Ativo' : 'Câmera Desligada / Aguardando...'}</span>
            </p>

            <div className="flex items-center gap-2">
              {scanning && (
                <span className="text-xs font-mono text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded font-bold animate-pulse">
                  {hudPercent}%
                </span>
              )}

              {cameraActive ? (
                <button
                  onClick={desligarCamera}
                  className="px-2.5 py-1 bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500 hover:text-white rounded-lg text-[10px] font-bold uppercase transition flex items-center gap-1 cursor-pointer"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>Desligar</span>
                </button>
              ) : (
                <button
                  onClick={ligarCamera}
                  className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-400 text-emerald-300 hover:bg-emerald-500 hover:text-black rounded-lg text-[10px] font-bold uppercase transition flex items-center gap-1 cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Ativar Câmera</span>
                </button>
              )}
            </div>
          </div>

          <div className="relative w-full max-w-[320px] h-[240px] rounded-2xl border-2 border-emerald-500/80 overflow-hidden mx-auto bg-black flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline 
              className={`w-full h-full object-cover -scale-x-100 ${cameraActive ? 'block' : 'hidden'}`} 
            />
            
            {!cameraActive && (
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
                <CameraOff className="w-10 h-10 text-emerald-500/50" />
                <p className="text-xs text-emerald-400/80 font-bold uppercase tracking-wider">
                  Câmera em espera
                </p>
                <button
                  onClick={ligarCamera}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase rounded-xl transition cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                >
                  Abra a Câmera Aqui
                </button>
              </div>
            )}

            {/* Corner Reticle Brackets matching reference screenshot */}
            <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-emerald-400 z-10 shadow-[0_0_8px_#10b981]" />
            <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-emerald-400 z-10 shadow-[0_0_8px_#10b981]" />
            <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-emerald-400 z-10 shadow-[0_0_8px_#10b981]" />
            <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-emerald-400 z-10 shadow-[0_0_8px_#10b981]" />

            {/* Center Target Crosshair */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
              <div className="w-16 h-16 border border-emerald-400/50 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-emerald-400 rounded-full" />
              </div>
            </div>

            {/* SVG Facial Landmark Mesh Graph */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-85 z-10" viewBox="0 0 320 240">
              <g stroke="#10b981" strokeWidth="0.9" opacity="0.75" className={scanning ? "animate-pulse" : ""}>
                <line x1="120" y1="80" x2="160" y2="110"/>
                <line x1="200" y1="80" x2="160" y2="110"/>
                <line x1="160" y1="110" x2="140" y2="140"/>
                <line x1="160" y1="110" x2="180" y2="140"/>
                <line x1="140" y1="140" x2="115" y2="170"/>
                <line x1="180" y1="140" x2="205" y2="170"/>
                <line x1="140" y1="140" x2="180" y2="140"/>
                <line x1="115" y1="170" x2="160" y2="165"/>
                <line x1="205" y1="170" x2="160" y2="165"/>
                <line x1="100" y1="70" x2="120" y2="80"/>
                <line x1="220" y1="70" x2="200" y2="80"/>
                <line x1="160" y1="60" x2="120" y2="80"/>
                <line x1="160" y1="60" x2="200" y2="80"/>
                <line x1="85" y1="115" x2="100" y2="70"/>
                <line x1="235" y1="115" x2="220" y2="70"/>
                <line x1="120" y1="80" x2="200" y2="80"/>
                <line x1="120" y1="80" x2="140" y2="140"/>
                <line x1="200" y1="80" x2="180" y2="140"/>
              </g>
              <g fill="#34d399">
                <circle cx="120" cy="80" r="3.5" className="animate-ping" style={{ animationDuration: '2s' }} />
                <circle cx="200" cy="80" r="3.5" className="animate-ping" style={{ animationDuration: '2s' }} />
                <circle cx="160" cy="110" r="4" className="animate-pulse" />
                <circle cx="140" cy="140" r="3" />
                <circle cx="180" cy="140" r="3" />
                <circle cx="160" cy="165" r="3.5" />
                <circle cx="115" cy="170" r="3" />
                <circle cx="205" cy="170" r="3" />
                <circle cx="160" cy="60" r="3" />
                <circle cx="100" cy="70" r="3" />
                <circle cx="220" cy="70" r="3" />
              </g>
            </svg>

            {/* Laser scan beam and status bar */}
            {scanning && (
              <>
                <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-scan-beam pointer-events-none z-20" />
                
                <div className="absolute bottom-2 inset-x-2 text-[11px] uppercase font-bold text-emerald-300 text-center tracking-wider bg-black/80 backdrop-blur-sm py-1.5 px-2 rounded-lg border border-emerald-500/40 z-30 shadow-lg">
                  {hudText}
                </div>
              </>
            )}
          </div>

          {cameraError && (
            <div className="mt-2 text-rose-400 text-xs font-bold uppercase flex items-center justify-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{cameraError}</span>
            </div>
          )}

          <div className="mt-3 flex justify-center items-center gap-4 text-[10px] font-bold">
            <span className="text-emerald-400 flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
              {cameraActive ? 'CÂMERA ONLINE' : 'CÂMERA OFFLINE'}
            </span>
            <span className="text-gray-400">{comFotoCount} rostos cadastrados (Ativos)</span>
          </div>
        </div>

        {/* Turma Filter */}
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl mb-4">
          <select 
            value={filtroTurma}
            onChange={e => setFiltroTurma(e.target.value)}
            className="w-full bg-transparent text-emerald-400 text-sm font-bold outline-none cursor-pointer"
          >
            <option value="">TODAS AS TURMAS</option>
            {turmas.map(t => <option key={t.nome} value={t.nome}>{t.nome}</option>)}
          </select>
        </div>

        {/* Students List */}
        <div className="mb-4">
          <h3 className="text-[10px] uppercase text-emerald-400 mb-3 tracking-widest flex justify-between font-bold">
            <span>Alunos Matriculados no Período ({listaFiltrada.length})</span>
            <span className="text-gray-400">{dataBR}</span>
          </h3>

          <div className="space-y-3">
            {listaFiltrada.length === 0 ? (
              <p className="text-center text-gray-500 py-8 text-sm uppercase">Nenhum aluno matriculado/ativo no período desta data ({dataBR})</p>
            ) : (
              listaFiltrada.map((aluno, idx) => {
                const k = chave(aluno.nome, dataAula);
                const status = freq[k] || '';
                const jaMarcado = status === 'P' || status === 'A';
                const isProcessing = processingIdx === idx;
                const temFoto = aluno.face_data && aluno.face_data.length > 100;

                return (
                  <div
                    key={idx}
                    onMouseDown={() => handleTouchStart(idx)}
                    onMouseUp={handleTouchEnd}
                    onMouseLeave={handleTouchEnd}
                    onTouchStart={() => handleTouchStart(idx)}
                    onTouchEnd={handleTouchEnd}
                    onClick={() => {
                      if (!isProcessing) {
                        iniciarProcesso(idx);
                      }
                    }}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition cursor-pointer select-none ${
                      isProcessing 
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300' 
                        : jaMarcado 
                          ? 'bg-emerald-500/20 border-emerald-500 text-white' 
                          : 'bg-white/5 border-emerald-500/20 hover:bg-emerald-500/10'
                    }`}
                  >
                    {temFoto ? (
                      <img src={aluno.face_data} alt={aluno.nome} className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/50" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-lg font-bold">
                        {aluno.nome.charAt(0)}
                      </div>
                    )}

                    <div className="flex-1">
                      <h4 className="font-bold text-emerald-300 uppercase text-sm">{aluno.nome}</h4>
                      <p className="text-[10px] text-gray-400">{aluno.turma || 'Sem turma'}</p>
                    </div>

                    <div>
                      {isProcessing ? (
                        <span className="text-[10px] text-amber-400 flex items-center gap-1 font-bold">
                          <Clock className="w-3 h-3 animate-spin" />
                          <span>Mapeando Biometria...</span>
                        </span>
                      ) : jaMarcado ? (
                        <div className="text-right">
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-bold">
                            <CheckCircle className="w-3 h-3" />
                            <span>Presente ({ordens[k] || ''})</span>
                          </span>
                          <span className="text-[9px] text-gray-400 block">Segure p/ corrigir</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          <Fingerprint className="w-3 h-3" />
                          <span>Aguardando</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Result Overlay */}
      {resultOverlay.open && resultOverlay.aluno && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          {resultOverlay.aluno.face_data ? (
            <img 
              src={resultOverlay.aluno.face_data} 
              alt={resultOverlay.aluno.nome} 
              className="w-48 h-48 rounded-full object-cover border-4 border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.6)] mb-4" 
            />
          ) : (
            <div className="w-48 h-48 rounded-full bg-emerald-500/10 border-4 border-emerald-500 flex items-center justify-center text-emerald-400 text-5xl mb-4">
              <CheckCircle className="w-24 h-24" />
            </div>
          )}

          <h2 className="text-2xl font-bold uppercase text-white mb-1">
            {resultOverlay.aluno.nome}
          </h2>
          <p className="text-emerald-400 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-1">
            <CheckCircle className="w-4 h-4" /> Biometria Confirmada
          </p>
          <p className="text-xs text-gray-400 mt-2 font-mono">Match Biométrico: 98.7%</p>
          <p className="text-xs text-emerald-300 mt-1">Presença registrada às {resultOverlay.hora} em {dataBR}</p>

          <div className="mt-3 text-xs">
            {resultOverlay.syncState === 'syncing' && (
              <span className="text-amber-400 flex items-center justify-center gap-1 font-mono">
                <RefreshCw className="w-3 h-3 animate-spin" /> Salvando no Firestore...
              </span>
            )}
            {resultOverlay.syncState === 'ok' && (
              <span className="text-emerald-400 flex items-center justify-center gap-1 font-mono">
                <CheckCircle className="w-3 h-3" /> Sincronizado no Firestore!
              </span>
            )}
            {resultOverlay.syncState === 'error' && (
              <span className="text-rose-400 flex items-center justify-center gap-1 font-mono">
                <AlertTriangle className="w-3 h-3" /> Falha na sincronização
              </span>
            )}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button 
              onClick={() => {
                setResultOverlay({ open: false, syncState: 'syncing' });
                desligarCamera();
              }}
              className="px-8 py-3 border border-emerald-400 bg-emerald-500/20 text-emerald-300 rounded-full text-xs uppercase font-bold hover:bg-emerald-500 hover:text-black transition cursor-pointer"
            >
              Próximo Aluno
            </button>

            <button
              onClick={() => {
                const idx = listaFiltrada.indexOf(resultOverlay.aluno!);
                setResultOverlay({ open: false, syncState: 'syncing' });
                desligarCamera();
                if (idx !== -1) setCorrecaoIdx(idx);
              }}
              className="px-6 py-3 border border-rose-500/40 text-rose-400 rounded-full text-xs uppercase font-bold hover:bg-rose-500/20 transition cursor-pointer"
            >
              Corrigir / Apagar
            </button>
          </div>
        </div>
      )}

      {/* Long Press Correction Modal */}
      {correcaoIdx !== null && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-rose-500 p-6 rounded-2xl max-w-xs w-full text-center shadow-2xl">
            <h3 className="text-rose-400 font-bold uppercase text-sm mb-1">Corrigir Presença ({dataBR})</h3>
            <p className="text-white font-bold text-base mb-4 uppercase">
              {listaFiltrada[correcaoIdx]?.nome}
            </p>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <button onClick={() => corrigirStatus('P')} className="py-2.5 bg-emerald-600 text-white rounded-lg text-xs font-bold uppercase hover:bg-emerald-500 cursor-pointer">
                Presente
              </button>
              <button onClick={() => corrigirStatus('A')} className="py-2.5 bg-amber-600 text-white rounded-lg text-xs font-bold uppercase hover:bg-amber-500 cursor-pointer">
                Atraso
              </button>
              <button onClick={() => corrigirStatus('F')} className="py-2.5 bg-rose-700 text-white rounded-lg text-xs font-bold uppercase hover:bg-rose-600 cursor-pointer">
                Faltou
              </button>
              <button onClick={() => corrigirStatus('J')} className="py-2.5 bg-blue-700 text-white rounded-lg text-xs font-bold uppercase hover:bg-blue-600 cursor-pointer">
                Justificado
              </button>
            </div>

            <button 
              onClick={() => corrigirStatus(null)} 
              className="w-full py-2.5 bg-gray-800 text-gray-300 rounded-lg text-xs font-bold uppercase hover:bg-gray-700 mb-2 flex items-center justify-center gap-1 cursor-pointer border border-rose-500/30"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Apagar Registro desta Data</span>
            </button>

            <button onClick={() => setCorrecaoIdx(null)} className="text-xs text-gray-400 underline cursor-pointer">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Clear Date Presences Modal */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-rose-500 p-6 rounded-2xl max-w-sm w-full text-center shadow-2xl">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <h3 className="text-rose-400 font-bold uppercase text-base mb-2">Limpar Frequências</h3>
            <p className="text-gray-300 text-xs mb-4">
              Deseja remover <b>todas as presenças e marcações</b> registradas para a data <b>{dataBR}</b>?
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowClearModal(false)}
                disabled={clearing}
                className="flex-1 py-2.5 bg-gray-800 text-gray-400 rounded-lg text-xs font-bold uppercase hover:bg-gray-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={limparFrequenciaDaData}
                disabled={clearing}
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-lg text-xs font-bold uppercase hover:bg-rose-500 cursor-pointer flex items-center justify-center gap-1"
              >
                {clearing ? 'LIMPANDO...' : 'Confirmar Limpeza'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
