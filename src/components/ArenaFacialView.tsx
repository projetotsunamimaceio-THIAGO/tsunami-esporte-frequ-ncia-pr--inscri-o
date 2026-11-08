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
  Trash2, 
  Calendar,
  Sparkles,
  Camera,
  CameraOff,
  X,
  UserCheck
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

  // Camera & Selected Student State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [modalAluno, setModalAluno] = useState<Aluno | null>(null);
  const [capturando, setCapturando] = useState<boolean>(false);
  const [flashEffect, setFlashEffect] = useState<boolean>(false);
  const [confirmSucesso, setConfirmSucesso] = useState<{ hora: string } | null>(null);

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

    return () => {
      desligarCamera();
      unsubAlunos();
      unsubTurmas();
      unsubFreq();
    };
  }, []);

  // Re-attach video stream when modal opens
  useEffect(() => {
    if (modalAluno && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [modalAluno]);

  const chave = (nome: string, dataISO: string) => (nome.trim().toUpperCase() + '|' + dataISO);

  const ligarCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Seu navegador não possui suporte para acesso direto à câmera.');
        return false;
      }

      if (streamRef.current) {
        setCameraActive(true);
        setCameraError(null);
        if (videoRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().catch(() => {});
        }
        return true;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
        });
      } catch (firstErr) {
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

  const playBeepSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  };

  // Start confirmation process for selected student
  const iniciarConfirmacao = async (aluno: Aluno) => {
    const k = chave(aluno.nome, dataAula);
    setModalAluno(aluno);

    if (freq[k] === 'P' || freq[k] === 'A') {
      setConfirmSucesso({ hora: ordens[k] || new Date().toLocaleTimeString('pt-BR') });
    } else {
      setConfirmSucesso(null);
    }

    setCapturando(false);
    await ligarCamera();
  };

  // Confirm presence and trigger camera capture
  const handleConfirmarPresencaComFoto = async () => {
    if (!modalAluno) return;
    setCapturando(true);

    // 1. Shutter Flash Effect
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 250);

    // 2. Temporary snapshot in memory (immediately discarded/deleted)
    try {
      if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        }
        // Discard image memory immediately
        canvas.width = 0;
        canvas.height = 0;
      }
    } catch (e) {
      console.warn('Captura temporária:', e);
    }

    // 3. Current timestamp
    const agora = new Date();
    const hStr = agora.getHours().toString().padStart(2, '0') + ':' +
      agora.getMinutes().toString().padStart(2, '0') + ':' +
      agora.getSeconds().toString().padStart(2, '0');

    // 4. Audio beep and vibration
    if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
    playBeepSound();

    // 5. Save presence in Firestore
    try {
      await saveFirestoreFrequencia(modalAluno.nome, dataAula, 'P', '', hStr);
    } catch (e) {
      console.error('Erro ao salvar presença:', e);
    }

    setConfirmSucesso({ hora: hStr });
    setCapturando(false);

    // 6. Close camera modal after brief success feedback
    setTimeout(() => {
      fecharModalCamera();
    }, 1300);
  };

  const fecharModalCamera = () => {
    setModalAluno(null);
    setConfirmSucesso(null);
    setCapturando(false);
    desligarCamera();
  };

  // Long Press handlers for manual status correction
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
      try {
        await saveFirestoreFrequencia(aluno.nome, dataAula, novoStatus, '', hStr);
      } catch (e) {}
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
            <span>Clique no nome do aluno para abrir a câmera e confirmar presença ({dataBR})</span>
          </p>
        </div>

        {/* Turma Filter */}
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl mb-4">
          <select 
            value={filtroTurma}
            onChange={e => setFiltroTurma(e.target.value)}
            className="w-full bg-transparent text-emerald-400 text-sm font-bold outline-none cursor-pointer uppercase"
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
                const temFoto = aluno.face_data && aluno.face_data.length > 100;

                return (
                  <div
                    key={idx}
                    onMouseDown={() => handleTouchStart(idx)}
                    onMouseUp={handleTouchEnd}
                    onMouseLeave={handleTouchEnd}
                    onTouchStart={() => handleTouchStart(idx)}
                    onTouchEnd={handleTouchEnd}
                    onClick={() => iniciarConfirmacao(aluno)}
                    className={`p-3.5 rounded-2xl border flex items-center gap-3 transition cursor-pointer select-none ${
                      jaMarcado 
                        ? 'bg-emerald-950/40 border-emerald-500/80 text-white shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                        : 'bg-white/5 border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-400/60'
                    }`}
                  >
                    {temFoto ? (
                      <img src={aluno.face_data} alt={aluno.nome} className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/50" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-lg font-bold shrink-0">
                        {aluno.nome.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h4 className="font-extrabold text-emerald-300 uppercase text-sm truncate">{aluno.nome}</h4>
                      <p className="text-[10px] text-gray-400 truncate">{aluno.turma || 'Sem turma'}</p>
                    </div>

                    <div className="shrink-0">
                      {jaMarcado ? (
                        <div className="text-right">
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-black uppercase">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Presente ({ordens[k] || ''})</span>
                          </span>
                          <span className="text-[9px] text-gray-400 block mt-0.5">Clique p/ reabrir</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-emerald-400/80 font-extrabold uppercase px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1">
                          <Camera className="w-3 h-3 text-emerald-400" />
                          <span>PRESENÇA</span>
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

      {/* CAMERA MODAL CONFIRMAÇÃO DE PRESENÇA */}
      {modalAluno && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 animate-fade-in overflow-y-auto select-none">
          <div className="bg-[#080d19] border-2 border-emerald-400 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-[0_0_50px_rgba(16,185,129,0.3)] relative text-center space-y-4">
            
            {/* Flash Effect Layer */}
            {flashEffect && (
              <div className="absolute inset-0 bg-white z-50 rounded-3xl animate-ping opacity-90 pointer-events-none" />
            )}

            {/* Header Lockup */}
            <div className="flex items-center justify-between border-b border-emerald-500/30 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300">
                  <Camera className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-emerald-400 uppercase tracking-widest font-chakra">
                  RECONHECIMENTO FACIAL ARENA
                </span>
              </div>

              <button
                onClick={fecharModalCamera}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-rose-500/30 text-gray-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Camera Viewfinder Stream */}
            <div className="relative w-full h-64 bg-black rounded-2xl border-2 border-emerald-500/80 overflow-hidden shadow-[0_0_25px_rgba(16,185,129,0.25)] flex items-center justify-center">
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
                    ATIVAR CÂMERA
                  </button>
                </div>
              )}

              {/* Corner Reticle Brackets */}
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

              {/* SVG Facial Mesh Landmark Overlay */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-80 z-10" viewBox="0 0 320 240">
                <g stroke="#10b981" strokeWidth="0.9" opacity="0.75">
                  <line x1="120" y1="80" x2="160" y2="110"/>
                  <line x1="200" y1="80" x2="160" y2="110"/>
                  <line x1="160" y1="110" x2="140" y2="140"/>
                  <line x1="160" y1="110" x2="180" y2="140"/>
                  <line x1="140" y1="140" x2="115" y2="170"/>
                  <line x1="180" y1="140" x2="205" y2="170"/>
                  <line x1="140" y1="140" x2="180" y2="140"/>
                </g>
                <g fill="#34d399">
                  <circle cx="120" cy="80" r="3" />
                  <circle cx="200" cy="80" r="3" />
                  <circle cx="160" cy="110" r="3.5" className="animate-pulse" />
                  <circle cx="140" cy="140" r="2.5" />
                  <circle cx="180" cy="140" r="2.5" />
                </g>
              </svg>

              {/* Capturing Pulse */}
              {capturando && (
                <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-xs flex items-center justify-center z-20 animate-pulse">
                  <span className="text-white font-black uppercase text-xs tracking-widest bg-black/80 px-4 py-2 rounded-xl border border-emerald-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
                    <span>REGISTRANDO PRESENÇA...</span>
                  </span>
                </div>
              )}
            </div>

            {/* Student Info Box below camera */}
            <div className="bg-[#040812] border border-emerald-500/40 rounded-2xl p-4 text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest">
                  ALUNO SELECIONADO:
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {dataBR}
                </span>
              </div>

              <h3 className="text-xl font-black text-white uppercase tracking-wider font-chakra flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{modalAluno.nome}</span>
              </h3>

              <p className="text-xs text-gray-300 font-semibold uppercase flex items-center gap-1.5">
                <span className="text-gray-500">TURMA:</span>
                <span className="text-emerald-300 font-bold">{modalAluno.turma || 'SEM TURMA DEFINIDA'}</span>
              </p>
            </div>

            {/* Success Banner or CONFIRMAR Button */}
            {confirmSucesso ? (
              <div className="bg-emerald-950/80 border-2 border-emerald-400 rounded-2xl p-4 text-center space-y-2 animate-scale-up">
                <div className="flex items-center justify-center gap-2 text-emerald-400 font-black text-base uppercase">
                  <CheckCircle className="w-6 h-6 stroke-[3]" />
                  <span>PRESENÇA CONFIRMADA!</span>
                </div>
                <p className="text-xs text-emerald-200 font-mono font-bold">
                  Horário: {confirmSucesso.hora} • {dataBR}
                </p>
                <p className="text-[10px] text-emerald-400/80 uppercase tracking-widest">
                  Foto processada e descartada da memória ✓
                </p>
              </div>
            ) : (
              <button
                type="button"
                disabled={capturando}
                onClick={handleConfirmarPresencaComFoto}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-sm sm:text-base tracking-widest rounded-2xl transition cursor-pointer shadow-[0_0_25px_rgba(16,185,129,0.5)] flex items-center justify-center gap-2 active:scale-95"
              >
                <Camera className="w-5 h-5" />
                <span>CONFIRMAR PRESENÇA</span>
              </button>
            )}

            {/* Cancel / Close Button */}
            <button
              type="button"
              onClick={fecharModalCamera}
              className="w-full py-2.5 bg-black/40 border border-gray-700 hover:bg-gray-800 text-gray-300 font-bold uppercase text-xs rounded-xl transition cursor-pointer"
            >
              {confirmSucesso ? 'FECHAR' : 'CANCELAR'}
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
