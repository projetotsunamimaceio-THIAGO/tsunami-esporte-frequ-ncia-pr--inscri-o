import React, { useState, useEffect, useRef } from 'react';
import { Aluno, Turma } from '../types';
import { 
  subscribeFirestoreAlunos, 
  saveFirestoreAluno, 
  deleteFirestoreAluno,
  subscribeFirestoreTurmas
} from '../lib/firestoreService';
import { ArrowLeft, UserPlus, User, Layers, Camera, Upload, Plus, RefreshCw, Search, Edit, Trash2, CheckCircle, X, Star, AlertTriangle, Key, Lock } from 'lucide-react';

interface AlunosViewProps {
  onBack: () => void;
}

export function AlunosView({ onBack }: AlunosViewProps) {
  const [activeTab, setActiveTab] = useState<'individual' | 'lote'>('individual');
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);

  // Individual Form
  const [nome, setNome] = useState('');
  const [turma, setTurma] = useState('');
  const [matricula, setMatricula] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [nivel, setNivel] = useState('1');
  const [senha, setSenha] = useState('123456');
  const [faceData, setFaceData] = useState<string | null>(null);

  // Camera State
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Lote Form
  const [turmaLote, setTurmaLote] = useState('');
  const [matriculaLote, setMatriculaLote] = useState('');
  const [vencimentoLote, setVencimentoLote] = useState('');
  const [nivelLote, setNivelLote] = useState('1');
  const [senhaLote, setSenhaLote] = useState('123456');
  const [listaNomes, setListaNomes] = useState('');

  // Edit Modal State
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editTurma, setEditTurma] = useState('');
  const [editMatricula, setEditMatricula] = useState('');
  const [editVencimento, setEditVencimento] = useState('');
  const [editNivel, setEditNivel] = useState('1');
  const [editSenha, setEditSenha] = useState('123456');
  const [editCameraActive, setEditCameraActive] = useState(false);
  const videoEdicaoRef = useRef<HTMLVideoElement | null>(null);
  const streamEdicaoRef = useRef<MediaStream | null>(null);

  // Delete Confirmation Modal State
  const [alunoParaExcluir, setAlunoParaExcluir] = useState<Aluno | null>(null);

  const NIVEIS: Record<string, string> = {
    '1': '⭐ Iniciante',
    '2': '⭐⭐ Básico',
    '3': '⭐⭐⭐ Intermediário',
    '4': '⭐⭐⭐⭐ Avançado',
    '5': '⭐⭐⭐⭐⭐ Elite'
  };

  useEffect(() => {
    setLoading(true);
    // Real-time Firestore subscriptions
    const unsubAlunos = subscribeFirestoreAlunos((list) => {
      setAlunos(list);
      localStorage.setItem('tsunami_alunos', JSON.stringify(list));
      setLoading(false);
    });

    const unsubTurmas = subscribeFirestoreTurmas((list) => {
      setTurmas(list.sort((a, b) => a.nome.localeCompare(b.nome)));
    });

    return () => {
      unsubAlunos();
      unsubTurmas();
      pararCamera();
    };
  }, []);

  const toggleCamera = async () => {
    if (cameraActive) {
      pararCamera();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);
      } catch (err) {
        alert('Câmera não disponível ou permissão negada.');
      }
    }
  };

  const pararCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (streamEdicaoRef.current) {
      streamEdicaoRef.current.getTracks().forEach(t => t.stop());
      streamEdicaoRef.current = null;
    }
    setCameraActive(false);
    setEditCameraActive(false);
  };

  const capturarFoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 400;
    canvas.height = 300;

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const data = canvas.toDataURL('image/jpeg', 0.9);
    setFaceData(data);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = 400;
        canvas.height = 300;

        const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width / 2) - (img.width / 2) * scale;
        const y = (canvas.height / 2) - (img.height / 2) * scale;

        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        const data = canvas.toDataURL('image/jpeg', 0.9);
        setFaceData(data);
        pararCamera();
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleIndividualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let currentFace = faceData;

    if (cameraActive && !currentFace) {
      capturarFoto();
    }

    const novoAluno: Aluno = {
      nome: nome.toUpperCase().trim(),
      turma: turma,
      matricula_rematricula: matricula,
      data_vencimento: vencimento,
      face_data: currentFace || '',
      nivel_aluno: nivel || '1',
      senha: senha || '123456'
    };

    try {
      await saveFirestoreAluno(novoAluno);
      alert('Aluno cadastrado no Firebase com sucesso!');
    } catch (err) {
      alert('Erro ao salvar no Firestore.');
    }

    setNome('');
    setTurma('');
    setMatricula('');
    setVencimento('');
    setNivel('1');
    setSenha('123456');
    setFaceData(null);
    pararCamera();
  };

  const handleLoteSubmit = async () => {
    if (!turmaLote || !matriculaLote || !vencimentoLote || !listaNomes.trim()) {
      alert('Preencha todos os campos da turma e lista de nomes!');
      return;
    }

    const nomes = listaNomes.split('\n').map(n => n.trim().toUpperCase()).filter(n => n.length > 0);
    setLoading(true);

    for (const n of nomes) {
      const a: Aluno = {
        nome: n,
        turma: turmaLote,
        matricula_rematricula: matriculaLote,
        data_vencimento: vencimentoLote,
        face_data: '',
        nivel_aluno: nivelLote,
        senha: senhaLote || '123456'
      };
      try {
        await saveFirestoreAluno(a);
      } catch (err) {}
    }

    setListaNomes('');
    alert('Cadastro em lote salvo no Firebase com sucesso!');
    setLoading(false);
  };

  const handleEdit = (idx: number) => {
    const aluno = alunos[idx];
    setEditIndex(idx);
    setEditNome(aluno.nome);
    setEditTurma(aluno.turma);
    setEditMatricula(aluno.matricula_rematricula);
    setEditVencimento(aluno.data_vencimento);
    setEditNivel(aluno.nivel_aluno || '1');
    setEditSenha(aluno.senha || '123456');
  };

  const salvarEdicao = async () => {
    if (editIndex === null) return;
    let newFace = alunos[editIndex].face_data || '';

    if (editCameraActive && videoEdicaoRef.current) {
      const video = videoEdicaoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        newFace = canvas.toDataURL('image/jpeg', 0.9);
      }
    }

    const alunoAtualizado: Aluno = {
      nome: editNome.toUpperCase().trim(),
      turma: editTurma,
      matricula_rematricula: editMatricula,
      data_vencimento: editVencimento,
      face_data: newFace,
      nivel_aluno: editNivel || '1',
      senha: editSenha || '123456'
    };

    try {
      await saveFirestoreAluno(alunoAtualizado);
      alert('Aluno atualizado no Firebase!');
    } catch (e) {
      alert('Erro ao atualizar no Firestore.');
    }

    setEditIndex(null);
    pararCamera();
  };

  const confirmarExclusaoAluno = async () => {
    if (!alunoParaExcluir) return;
    try {
      await deleteFirestoreAluno(alunoParaExcluir.nome, alunoParaExcluir.turma);
    } catch (err) {
      console.error('Erro ao excluir aluno no Firestore:', err);
    }
    setAlunoParaExcluir(null);
  };

  const formatarData = (dStr: string) => {
    if (!dStr) return '-';
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? dStr : d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const alunosFiltrados = alunos.filter(a => 
    a.nome.toLowerCase().includes(busca.toLowerCase()) || 
    (a.turma && a.turma.toLowerCase().includes(busca.toLowerCase()))
  ).sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0a0a0f] to-[#1a1a2e] text-white font-rajdhani p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <button 
            onClick={onBack}
            className="border border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-400 hover:bg-fuchsia-500 hover:text-black px-4 py-2 rounded-lg text-xs uppercase font-bold transition flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>
          
          <h1 className="text-2xl md:text-3xl font-bold text-fuchsia-400 tracking-widest uppercase text-center flex-1 flex items-center justify-center gap-3">
            <UserPlus className="w-7 h-7" />
            <span>Gerenciar Alunos (Firestore)</span>
          </h1>

          <div className="w-20"></div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-0">
          <button 
            onClick={() => setActiveTab('individual')}
            className={`px-5 py-2.5 rounded-t-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition ${
              activeTab === 'individual' 
                ? 'bg-fuchsia-500/20 text-fuchsia-300 border-t-2 border-x border-fuchsia-500/50' 
                : 'text-gray-400 border border-transparent hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Individual</span>
          </button>

          <button 
            onClick={() => setActiveTab('lote')}
            className={`px-5 py-2.5 rounded-t-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition ${
              activeTab === 'lote' 
                ? 'bg-fuchsia-500/20 text-fuchsia-300 border-t-2 border-x border-fuchsia-500/50' 
                : 'text-gray-400 border border-transparent hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Cadastro em Lote</span>
          </button>
        </div>

        {/* Tab Content: Individual */}
        {activeTab === 'individual' && (
          <div className="bg-white/5 backdrop-blur-md border border-fuchsia-500/20 p-6 rounded-b-2xl rounded-tr-2xl mb-8 shadow-2xl">
            <h2 className="text-sm uppercase tracking-[0.3em] text-fuchsia-300 mb-6 border-b border-fuchsia-500/20 pb-2 font-bold">
              Novo Aluno
            </h2>

            <form onSubmit={handleIndividualSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-3">
                <label className="block text-[10px] uppercase tracking-wider text-fuchsia-400 mb-2 font-semibold">
                  Nome Completo
                </label>
                <input 
                  type="text" 
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="EX: JOÃO SILVA" 
                  className="w-full p-3 rounded-lg outline-none uppercase bg-[#1a1a2e] border border-fuchsia-500/30 text-white focus:border-fuchsia-400"
                  required 
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] uppercase tracking-wider text-fuchsia-400 mb-2 font-semibold">
                  Turma
                </label>
                <select 
                  value={turma}
                  onChange={e => setTurma(e.target.value)}
                  className="w-full p-3 rounded-lg outline-none bg-[#1a1a2e] border border-fuchsia-500/30 text-white focus:border-fuchsia-400 cursor-pointer"
                  required
                >
                  <option value="">Selecione...</option>
                  {turmas.map(t => (
                    <option key={t.nome} value={t.nome}>{t.nome}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] uppercase tracking-wider text-fuchsia-400 mb-2 font-semibold">
                  Matrícula
                </label>
                <input 
                  type="date" 
                  value={matricula}
                  onChange={e => setMatricula(e.target.value)}
                  className="w-full p-3 rounded-lg outline-none bg-[#1a1a2e] border border-fuchsia-500/30 text-white focus:border-fuchsia-400 cursor-pointer"
                  required 
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] uppercase tracking-wider text-fuchsia-400 mb-2 font-semibold">
                  Vencimento
                </label>
                <input 
                  type="date" 
                  value={vencimento}
                  onChange={e => setVencimento(e.target.value)}
                  className="w-full p-3 rounded-lg outline-none bg-[#1a1a2e] border border-fuchsia-500/30 text-white focus:border-fuchsia-400 cursor-pointer"
                  required 
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-[10px] uppercase tracking-wider text-fuchsia-400 mb-2 font-semibold">
                  Nível
                </label>
                <select 
                  value={nivel}
                  onChange={e => setNivel(e.target.value)}
                  className="w-full p-3 rounded-lg outline-none bg-[#1a1a2e] border border-fuchsia-500/30 text-white focus:border-fuchsia-400 cursor-pointer text-xs font-bold"
                  required
                >
                  <option value="1">⭐ Iniciante</option>
                  <option value="2">⭐⭐ Básico</option>
                  <option value="3">⭐⭐⭐ Intermediário</option>
                  <option value="4">⭐⭐⭐⭐ Avançado</option>
                  <option value="5">⭐⭐⭐⭐⭐ Elite</option>
                </select>
              </div>

              <div className="md:col-span-1">
                <label className="block text-[10px] uppercase tracking-wider text-fuchsia-400 mb-2 font-semibold">
                  Senha
                </label>
                <input 
                  type="text" 
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="123456" 
                  className="w-full p-3 rounded-lg outline-none bg-[#1a1a2e] border border-fuchsia-500/30 text-white focus:border-fuchsia-400 font-mono text-center font-bold"
                  required 
                />
              </div>

              <div className="md:col-span-1 flex gap-1.5">
                <button 
                  type="button" 
                  onClick={toggleCamera}
                  title="Capturar Foto"
                  className={`flex-1 border p-3 rounded-lg h-[46px] flex items-center justify-center transition cursor-pointer ${
                    cameraActive 
                      ? 'border-rose-500 bg-rose-500/20 text-rose-400' 
                      : 'border-blue-500 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                </button>

                <label 
                  title="Upload de Arquivo"
                  className="flex-1 border border-emerald-500 bg-emerald-500/10 text-emerald-400 p-3 rounded-lg h-[46px] flex items-center justify-center hover:bg-emerald-500 hover:text-white transition cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              <div className="md:col-span-12 mt-4">
                <button 
                  type="submit"
                  className="w-full border border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-300 hover:bg-fuchsia-400 hover:text-black p-3.5 rounded-lg uppercase font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-[0_0_15px_rgba(255,0,255,0.25)]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Aluno</span>
                </button>
              </div>

              {/* Camera Preview Area */}
              {cameraActive && (
                <div className="md:col-span-12 flex flex-col items-center mt-4 p-4 border border-fuchsia-500/30 rounded-xl bg-black/40">
                  <p className="text-xs text-fuchsia-300 uppercase mb-2">Posicione o rosto no centro e clique em Capturar</p>
                  <video ref={videoRef} autoPlay muted playsInline className="w-full max-w-sm rounded-lg border-2 border-fuchsia-500 -scale-x-100" />
                  <canvas ref={canvasRef} className="hidden" />
                  <button 
                    type="button" 
                    onClick={capturarFoto}
                    className="mt-3 px-6 py-2 bg-fuchsia-500 text-black font-bold text-xs uppercase rounded-lg cursor-pointer hover:bg-fuchsia-400"
                  >
                    Tirar Foto
                  </button>
                </div>
              )}

              {faceData && (
                <div className="md:col-span-12 flex flex-col items-center mt-3">
                  <p className="text-xs text-emerald-400 flex items-center gap-1 mb-1 font-semibold">
                    <CheckCircle className="w-4 h-4" /> Foto pronta para cadastro!
                  </p>
                  <img src={faceData} alt="Preview Foto" className="w-32 h-24 object-cover rounded-lg border-2 border-emerald-500" />
                </div>
              )}
            </form>
          </div>
        )}

        {/* Tab Content: Lote */}
        {activeTab === 'lote' && (
          <div className="bg-white/5 backdrop-blur-md border border-fuchsia-500/20 p-6 rounded-b-2xl rounded-tr-2xl mb-8">
            <div className="flex justify-between items-center mb-6 border-b border-fuchsia-500/20 pb-2">
              <h2 className="text-sm uppercase tracking-[0.3em] text-fuchsia-300 font-bold">
                Cadastro em Lote
              </h2>
              <span className="text-xs text-gray-400">Um nome por linha</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
              <div className="md:col-span-3">
                <label className="block text-[10px] uppercase tracking-wider text-fuchsia-400 mb-2 font-semibold">Turma</label>
                <select 
                  value={turmaLote} 
                  onChange={e => setTurmaLote(e.target.value)}
                  className="w-full p-3 rounded-lg outline-none bg-[#1a1a2e] border border-fuchsia-500/30 text-white"
                >
                  <option value="">Selecione...</option>
                  {turmas.map(t => <option key={t.nome} value={t.nome}>{t.nome}</option>)}
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-[10px] uppercase tracking-wider text-fuchsia-400 mb-2 font-semibold">Matrícula</label>
                <input 
                  type="date" 
                  value={matriculaLote} 
                  onChange={e => setMatriculaLote(e.target.value)}
                  className="w-full p-3 rounded-lg outline-none bg-[#1a1a2e] border border-fuchsia-500/30 text-white" 
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-[10px] uppercase tracking-wider text-fuchsia-400 mb-2 font-semibold">Vencimento</label>
                <input 
                  type="date" 
                  value={vencimentoLote} 
                  onChange={e => setVencimentoLote(e.target.value)}
                  className="w-full p-3 rounded-lg outline-none bg-[#1a1a2e] border border-fuchsia-500/30 text-white" 
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] uppercase tracking-wider text-fuchsia-400 mb-2 font-semibold">Nível (padrão)</label>
                <select 
                  value={nivelLote} 
                  onChange={e => setNivelLote(e.target.value)}
                  className="w-full p-3 rounded-lg outline-none bg-[#1a1a2e] border border-fuchsia-500/30 text-white"
                >
                  <option value="1">⭐ Iniciante</option>
                  <option value="2">⭐⭐ Básico</option>
                  <option value="3">⭐⭐⭐ Intermediário</option>
                  <option value="4">⭐⭐⭐⭐ Avançado</option>
                  <option value="5">⭐⭐⭐⭐⭐ Elite</option>
                </select>
              </div>

              <div className="md:col-span-1">
                <label className="block text-[10px] uppercase tracking-wider text-fuchsia-400 mb-2 font-semibold">Senha</label>
                <input 
                  type="text" 
                  value={senhaLote} 
                  onChange={e => setSenhaLote(e.target.value)}
                  placeholder="123456" 
                  className="w-full p-3 rounded-lg outline-none bg-[#1a1a2e] border border-fuchsia-500/30 text-white font-mono text-center font-bold" 
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[10px] uppercase tracking-wider text-fuchsia-400 mb-2 font-semibold">
                Lista de Nomes (um por linha)
              </label>
              <textarea 
                value={listaNomes}
                onChange={e => setListaNomes(e.target.value)}
                placeholder={"CARLOS SILVA\nMARIA OLIVEIRA\nJOÃO SANTOS..."}
                className="w-full p-4 rounded-lg outline-none bg-[#1a1a2e] border border-fuchsia-500/30 text-white font-mono text-sm min-h-[140px]"
              />
            </div>

            <button 
              onClick={handleLoteSubmit}
              className="w-full border border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-300 hover:bg-fuchsia-400 hover:text-black p-4 rounded-lg uppercase font-bold tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-[0_0_15px_rgba(255,0,255,0.25)]"
            >
              <Layers className="w-5 h-5" />
              <span>Cadastrar Todos</span>
            </button>
          </div>
        )}

        {/* Registered Students List */}
        <div className="bg-white/5 backdrop-blur-md border border-fuchsia-500/20 p-6 rounded-2xl">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b border-fuchsia-500/20 pb-4">
            <h2 className="text-sm uppercase tracking-[0.3em] text-fuchsia-300 font-bold flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>Alunos Cadastrados ({alunosFiltrados.length})</span>
            </h2>

            <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span>Sincronizado via Firebase</span>
            </span>

            {/* Search Box */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-fuchsia-400" />
              <input 
                type="text" 
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar aluno..." 
                className="w-full p-3 pl-10 rounded-lg outline-none bg-white/5 border border-fuchsia-500/20 text-white text-sm focus:border-fuchsia-400 transition"
              />
            </div>
          </div>

          <div className="space-y-3">
            {alunosFiltrados.length === 0 ? (
              <p className="text-center py-12 text-fuchsia-400/40 text-sm uppercase">
                {loading ? 'Carregando alunos do Firestore...' : 'Nenhum aluno encontrado'}
              </p>
            ) : (
              alunosFiltrados.map((aluno, index) => {
                const vencido = aluno.data_vencimento ? new Date(aluno.data_vencimento) < new Date() : false;
                const temFoto = aluno.face_data && aluno.face_data.length > 100;
                const realIndex = alunos.findIndex(a => a.nome === aluno.nome && a.turma === aluno.turma);

                return (
                  <div 
                    key={index}
                    className="p-4 rounded-xl bg-white/[0.03] border border-fuchsia-500/10 border-l-4 border-l-fuchsia-500 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-fuchsia-500/[0.05] transition"
                  >
                    <div className="flex items-center gap-3">
                      {temFoto ? (
                        <img src={aluno.face_data} alt={aluno.nome} className="w-12 h-12 rounded-full object-cover border-2 border-fuchsia-500/50" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400">
                          <User className="w-6 h-6" />
                        </div>
                      )}

                      <div>
                        <h3 className="text-lg font-bold text-fuchsia-300 uppercase tracking-wider flex items-center gap-2">
                          <span>{aluno.nome}</span>
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-mono">
                            {NIVEIS[aluno.nivel_aluno || '1']}
                          </span>
                          {vencido && (
                            <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full font-bold uppercase">
                              Vencido
                            </span>
                          )}
                        </h3>

                        <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-1 items-center">
                          <span>Turma: <strong className="text-fuchsia-400">{aluno.turma || 'SEM TURMA'}</strong></span>
                          <span>Matrícula: {formatarData(aluno.matricula_rematricula)}</span>
                          <span className={vencido ? 'text-rose-400 font-semibold' : 'text-emerald-400'}>
                            Vence: {formatarData(aluno.data_vencimento)}
                          </span>
                          <span className="bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/30 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                            <Key className="w-3 h-3 text-fuchsia-400" /> Senha: {aluno.senha || '123456'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEdit(realIndex >= 0 ? realIndex : index)}
                        className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500 hover:text-black transition cursor-pointer"
                        title="Editar Aluno"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setAlunoParaExcluir(aluno)}
                        className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white transition cursor-pointer"
                        title="Excluir Aluno"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Edit Modal */}
      {editIndex !== null && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121826] border border-fuchsia-500/40 p-6 rounded-2xl max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-fuchsia-400 mb-4 uppercase">Editar Aluno</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-fuchsia-400 mb-1">Nome</label>
                <input 
                  type="text"
                  value={editNome}
                  onChange={e => setEditNome(e.target.value)}
                  className="w-full p-3 rounded-lg bg-gray-900 border border-fuchsia-500/30 text-white outline-none uppercase font-bold"
                />
              </div>

              <div>
                <label className="block text-xs text-fuchsia-400 mb-1">Turma</label>
                <select 
                  value={editTurma}
                  onChange={e => setEditTurma(e.target.value)}
                  className="w-full p-3 rounded-lg bg-gray-900 border border-fuchsia-500/30 text-white outline-none"
                >
                  <option value="">Selecione...</option>
                  {turmas.map(t => <option key={t.nome} value={t.nome}>{t.nome}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-fuchsia-400 mb-1">Matrícula</label>
                  <input 
                    type="date"
                    value={editMatricula}
                    onChange={e => setEditMatricula(e.target.value)}
                    className="w-full p-3 rounded-lg bg-gray-900 border border-fuchsia-500/30 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-fuchsia-400 mb-1">Vencimento</label>
                  <input 
                    type="date"
                    value={editVencimento}
                    onChange={e => setEditVencimento(e.target.value)}
                    className="w-full p-3 rounded-lg bg-gray-900 border border-fuchsia-500/30 text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-fuchsia-400 mb-1">Nível</label>
                  <select 
                    value={editNivel}
                    onChange={e => setEditNivel(e.target.value)}
                    className="w-full p-3 rounded-lg bg-gray-900 border border-fuchsia-500/30 text-white outline-none text-xs font-bold"
                  >
                    <option value="1">⭐ Iniciante</option>
                    <option value="2">⭐⭐ Básico</option>
                    <option value="3">⭐⭐⭐ Intermediário</option>
                    <option value="4">⭐⭐⭐⭐ Avançado</option>
                    <option value="5">⭐⭐⭐⭐⭐ Elite</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-fuchsia-400 mb-1">Senha do Aluno</label>
                  <input 
                    type="text"
                    value={editSenha}
                    onChange={e => setEditSenha(e.target.value)}
                    placeholder="123456"
                    className="w-full p-3 rounded-lg bg-gray-900 border border-fuchsia-500/30 text-white outline-none font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-fuchsia-500/10">
                <button 
                  onClick={() => setEditIndex(null)}
                  className="flex-1 border border-gray-500 text-gray-400 p-3 rounded-lg uppercase text-xs font-bold hover:bg-gray-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={salvarEdicao}
                  className="flex-1 border border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-300 p-3 rounded-lg uppercase text-xs font-bold hover:bg-fuchsia-400 hover:text-black transition cursor-pointer"
                >
                  Salvar no Firestore
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {alunoParaExcluir && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#180d1e] border-2 border-rose-500/80 p-6 rounded-2xl max-w-sm w-full text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center text-rose-400 mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-rose-400 uppercase tracking-wider">
                Excluir Aluno?
              </h3>
              <p className="text-white text-base font-bold uppercase mt-1">
                "{alunoParaExcluir.nome}"
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Essa ação removerá o aluno do banco de dados Firestore.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setAlunoParaExcluir(null)}
                className="flex-1 border border-gray-500 text-gray-300 p-3 rounded-lg uppercase text-xs font-bold hover:bg-gray-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarExclusaoAluno}
                className="flex-1 border border-rose-500 bg-rose-600 text-white p-3 rounded-lg uppercase text-xs font-bold hover:bg-rose-500 transition cursor-pointer shadow-[0_0_15px_rgba(244,63,94,0.4)]"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
