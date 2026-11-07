import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query,
  where,
  getDoc
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Turma, Aluno, User, ProgramacaoItem, PermissaoAlunoEsporte, InscricaoEsporte } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ==========================================
// USUÁRIOS / AUTH
// ==========================================
export async function getFirestoreUsers(): Promise<User[]> {
  const path = 'usuarios';
  try {
    const snap = await getDocs(collection(db, path));
    const users: User[] = [];
    snap.forEach(d => {
      const data = d.data();
      if (data.nome && data.senha) {
        users.push({ nome: data.nome, senha: data.senha });
      }
    });
    return users;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveFirestoreUser(user: User): Promise<void> {
  const path = 'usuarios';
  try {
    const docId = user.nome.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    await setDoc(doc(db, path, docId), {
      nome: user.nome.trim(),
      senha: user.senha.trim(),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==========================================
// TURMAS
// ==========================================
export async function getFirestoreTurmas(): Promise<Turma[]> {
  const path = 'turmas';
  try {
    const snap = await getDocs(collection(db, path));
    const list: Turma[] = [];
    snap.forEach(d => {
      const data = d.data();
      list.push({
        nome: data.nome || '',
        inicio: data.inicio || '',
        fim: data.fim || '',
        vagas: data.vagas || '',
        dias: data.dias || ''
      });
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveFirestoreTurma(turma: Turma): Promise<void> {
  const path = 'turmas';
  try {
    const docId = turma.nome.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
    await setDoc(doc(db, path, docId), {
      nome: turma.nome.trim().toUpperCase(),
      inicio: turma.inicio || '',
      fim: turma.fim || '',
      vagas: turma.vagas || '',
      dias: turma.dias || '',
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteFirestoreTurma(nomeTurma: string): Promise<void> {
  const path = 'turmas';
  try {
    const docId = nomeTurma.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
    await deleteDoc(doc(db, path, docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeFirestoreTurmas(onUpdate: (turmas: Turma[]) => void) {
  const path = 'turmas';
  return onSnapshot(collection(db, path), (snap) => {
    const list: Turma[] = [];
    snap.forEach(d => {
      const data = d.data();
      list.push({
        nome: data.nome || '',
        inicio: data.inicio || '',
        fim: data.fim || '',
        vagas: data.vagas || '',
        dias: data.dias || ''
      });
    });
    onUpdate(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}

// ==========================================
// ALUNOS
// ==========================================
export async function getFirestoreAlunos(): Promise<Aluno[]> {
  const path = 'alunos';
  try {
    const snap = await getDocs(collection(db, path));
    const list: Aluno[] = [];
    snap.forEach(d => {
      const data = d.data();
      list.push({
        nome: data.nome || '',
        turma: data.turma || '',
        matricula_rematricula: data.matricula_rematricula || '',
        data_vencimento: data.data_vencimento || '',
        face_data: data.face_data || '',
        nivel_aluno: data.nivel_aluno || '1',
        senha: data.senha || ''
      });
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveFirestoreAluno(aluno: Aluno): Promise<void> {
  const path = 'alunos';
  try {
    const docId = (aluno.nome.trim().toUpperCase() + '_' + (aluno.turma || '')).replace(/[^A-Z0-9]/g, '_');
    await setDoc(doc(db, path, docId), {
      nome: aluno.nome.trim().toUpperCase(),
      turma: aluno.turma || '',
      matricula_rematricula: aluno.matricula_rematricula || '',
      data_vencimento: aluno.data_vencimento || '',
      face_data: aluno.face_data || '',
      nivel_aluno: aluno.nivel_aluno || '1',
      senha: aluno.senha || '',
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteFirestoreAluno(nomeAluno: string, turmaAluno: string): Promise<void> {
  const path = 'alunos';
  try {
    const docId = (nomeAluno.trim().toUpperCase() + '_' + (turmaAluno || '')).replace(/[^A-Z0-9]/g, '_');
    await deleteDoc(doc(db, path, docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeFirestoreAlunos(onUpdate: (alunos: Aluno[]) => void) {
  const path = 'alunos';
  return onSnapshot(collection(db, path), (snap) => {
    const list: Aluno[] = [];
    snap.forEach(d => {
      const data = d.data();
      list.push({
        nome: data.nome || '',
        turma: data.turma || '',
        matricula_rematricula: data.matricula_rematricula || '',
        data_vencimento: data.data_vencimento || '',
        face_data: data.face_data || '',
        nivel_aluno: data.nivel_aluno || '1',
        senha: data.senha || ''
      });
    });
    onUpdate(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}

// ==========================================
// FREQUÊNCIA
// ==========================================
const SIGLAS_FREQ: Record<string, string> = {
  'Presente': 'P',
  'Atraso': 'A',
  'Faltou': 'F',
  'Justificado': 'J',
  'P': 'P',
  'A': 'A',
  'F': 'F',
  'J': 'J'
};

export async function getFirestoreFrequencia(): Promise<{ freq: Record<string, string>; ordens: Record<string, string> }> {
  const path = 'frequencia';
  try {
    const snap = await getDocs(collection(db, path));
    const freq: Record<string, string> = {};
    const ordens: Record<string, string> = {};

    snap.forEach(d => {
      const data = d.data();
      if (data.nome && data.data_aula) {
        const key = `${data.nome.trim().toUpperCase()}|${data.data_aula}`;
        if (data.status) {
          freq[key] = SIGLAS_FREQ[data.status] || data.status;
        }
        if (data.justificativa) {
          freq[`${key}-txt`] = data.justificativa;
        }
        if (data.hora) {
          ordens[key] = data.hora;
        }
      }
    });

    return { freq, ordens };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return { freq: {}, ordens: {} };
  }
}

export async function saveFirestoreFrequencia(
  nome: string, 
  dataISO: string, 
  status: string, 
  justificativa?: string, 
  hora?: string
): Promise<void> {
  if (!status || status.trim() === '' || status === 'Apagado') {
    return deleteFirestoreFrequencia(nome, dataISO);
  }
  const path = 'frequencia';
  try {
    const docId = (nome.trim().toUpperCase() + '_' + dataISO).replace(/[^A-Z0-9]/g, '_');
    const statusNorm = SIGLAS_FREQ[status] || status;
    await setDoc(doc(db, path, docId), {
      nome: nome.trim().toUpperCase(),
      data_aula: dataISO,
      status: statusNorm,
      justificativa: justificativa || '',
      hora: hora || '',
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteFirestoreFrequencia(nome: string, dataISO: string): Promise<void> {
  const path = 'frequencia';
  try {
    const docId = (nome.trim().toUpperCase() + '_' + dataISO).replace(/[^A-Z0-9]/g, '_');
    await deleteDoc(doc(db, path, docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeFirestoreFrequencia(onUpdate: (data: { freq: Record<string, string>; ordens: Record<string, string> }) => void) {
  const path = 'frequencia';
  return onSnapshot(collection(db, path), (snap) => {
    const freq: Record<string, string> = {};
    const ordens: Record<string, string> = {};

    snap.forEach(d => {
      const data = d.data();
      if (data.nome && data.data_aula) {
        const key = `${data.nome.trim().toUpperCase()}|${data.data_aula}`;
        const st = SIGLAS_FREQ[data.status] || data.status || '';
        if (st && st.trim() !== '') {
          freq[key] = st;
          if (data.justificativa) {
            freq[`${key}-txt`] = data.justificativa;
          }
          if (data.hora) {
            ordens[key] = data.hora;
          }
        }
      }
    });

    onUpdate({ freq, ordens });
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}

// ==========================================
// PROGRAMAÇÃO ESPORTIVA
// ==========================================
export async function getFirestoreProgramacao(): Promise<ProgramacaoItem[]> {
  const path = 'programacao';
  try {
    const snap = await getDocs(collection(db, path));
    const list: ProgramacaoItem[] = [];
    snap.forEach(d => {
      const data = d.data();
      list.push({
        id: d.id,
        titulo: data.titulo || '',
        isFixa: !!data.isFixa,
        hora: data.hora || '',
        dias: Array.isArray(data.dias) ? data.dias : []
      });
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveFirestoreProgramacao(item: ProgramacaoItem): Promise<void> {
  const path = 'programacao';
  try {
    const docId = item.id || (item.isFixa ? 'celula_fixa' : 'act_' + Date.now());
    await setDoc(doc(db, path, docId), {
      titulo: item.titulo,
      isFixa: !!item.isFixa,
      hora: item.hora || '',
      dias: item.dias || [],
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteFirestoreProgramacao(id: string): Promise<void> {
  const path = 'programacao';
  try {
    await deleteDoc(doc(db, path, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeFirestoreProgramacao(onUpdate: (items: ProgramacaoItem[]) => void) {
  const path = 'programacao';
  return onSnapshot(collection(db, path), (snap) => {
    const list: ProgramacaoItem[] = [];
    snap.forEach(d => {
      const data = d.data();
      list.push({
        id: d.id,
        titulo: data.titulo || '',
        isFixa: !!data.isFixa,
        hora: data.hora || '',
        dias: Array.isArray(data.dias) ? data.dias : []
      });
    });
    onUpdate(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}

// ==========================================
// PERMISSÕES ALUNOS (ÁREA DE ESPORTE)
// ==========================================
export function subscribeFirestorePermissoesEsporte(onUpdate: (permMap: Record<string, PermissaoAlunoEsporte>) => void) {
  const path = 'permissoes_esporte';
  return onSnapshot(collection(db, path), (snap) => {
    const permMap: Record<string, PermissaoAlunoEsporte> = {};
    snap.forEach(d => {
      const data = d.data();
      if (data.alunoNome) {
        const key = data.alunoNome.trim().toUpperCase();
        permMap[key] = {
          alunoNome: data.alunoNome || '',
          turma: data.turma || '',
          liberado: data.liberado !== false,
          aulasPermitidas: Array.isArray(data.aulasPermitidas) ? data.aulasPermitidas : [],
          liberadoJustificativa: !!data.liberadoJustificativa
        };
      }
    });
    onUpdate(permMap);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}

export async function saveFirestorePermissaoEsporte(permissao: PermissaoAlunoEsporte): Promise<void> {
  const path = 'permissoes_esporte';
  try {
    const docId = permissao.alunoNome.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
    await setDoc(doc(db, path, docId), {
      alunoNome: permissao.alunoNome.trim().toUpperCase(),
      turma: permissao.turma || '',
      liberado: permissao.liberado,
      aulasPermitidas: permissao.aulasPermitidas || [],
      liberadoJustificativa: permissao.liberadoJustificativa,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function batchSaveFirestorePermissoesEsporte(permissoes: PermissaoAlunoEsporte[]): Promise<void> {
  for (const p of permissoes) {
    await saveFirestorePermissaoEsporte(p);
  }
}

// ==========================================
// INSCRIÇÕES DE ESPORTE
// ==========================================
export async function saveFirestoreInscricaoEsporte(inscricao: InscricaoEsporte): Promise<void> {
  const path = 'inscricoes_esporte';
  try {
    const docId = (inscricao.alunoNome.trim().toUpperCase() + '_' + (inscricao.data || new Date().toISOString().split('T')[0])).replace(/[^A-Z0-9]/g, '_');
    await setDoc(doc(db, path, docId), {
      alunoNome: inscricao.alunoNome.trim().toUpperCase(),
      turma: inscricao.turma || '',
      data: inscricao.data || new Date().toISOString().split('T')[0],
      celulaConfirmada: inscricao.celulaConfirmada !== false,
      celulaHora: inscricao.celulaHora || '',
      turmasSelecionadas: inscricao.turmasSelecionadas || [],
      criadoEm: inscricao.criadoEm || new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeFirestoreInscricoesEsporte(onUpdate: (list: InscricaoEsporte[]) => void) {
  const path = 'inscricoes_esporte';
  return onSnapshot(collection(db, path), (snap) => {
    const list: InscricaoEsporte[] = [];
    snap.forEach(d => {
      const data = d.data();
      list.push({
        id: d.id,
        alunoNome: data.alunoNome || '',
        turma: data.turma || '',
        data: data.data || '',
        celulaConfirmada: !!data.celulaConfirmada,
        celulaHora: data.celulaHora || '',
        turmasSelecionadas: Array.isArray(data.turmasSelecionadas) ? data.turmasSelecionadas : [],
        criadoEm: data.criadoEm || ''
      });
    });
    onUpdate(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}

export async function clearAllFirestoreInscricoesEsporte(): Promise<void> {
  const path = 'inscricoes_esporte';
  try {
    const snap = await getDocs(collection(db, path));
    for (const d of snap.docs) {
      await deleteDoc(doc(db, path, d.id));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// CONFIGURAÇÃO GLOBAL ESPORTE (TRANCAR / LIBERAR INSCRIÇÕES)
// ==========================================
export async function saveFirestoreConfiguracaoEsporte(trancado: boolean): Promise<void> {
  const path = 'configuracoes_esporte';
  try {
    await setDoc(doc(db, path, 'status_geral'), {
      trancado: !!trancado,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeFirestoreConfiguracaoEsporte(onUpdate: (trancado: boolean) => void) {
  const path = 'configuracoes_esporte';
  return onSnapshot(doc(db, path, 'status_geral'), (snap) => {
    if (snap.exists()) {
      onUpdate(!!snap.data().trancado);
    } else {
      onUpdate(false);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}




