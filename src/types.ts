export interface Turma {
  nome: string;
  inicio: string;
  fim: string;
  vagas: number | string;
  dias: string;
}

export interface Aluno {
  nome: string;
  turma: string;
  matricula_rematricula: string;
  data_vencimento: string;
  face_data?: string;
  nivel_aluno?: string;
  senha?: string;
}

export interface User {
  nome: string;
  senha: string;
}

export interface FrequenciaRecord {
  nome: string;
  data_aula: string;
  status: string;
  justificativa?: string;
  hora?: string;
}

export interface ProgramacaoItem {
  id: string;
  titulo: string;
  isFixa?: boolean;
  hora: string;
  dias: string[]; // e.g. ['seg', 'ter', 'qua', 'qui', 'sex']
}

export interface PermissaoAlunoEsporte {
  alunoNome: string;
  turma: string;
  liberado: boolean;
  aulasPermitidas: string[];
  liberadoJustificativa: boolean;
}

export const URL_SCRIPT = "https://script.google.com/macros/s/AKfycby-23cMovuAZ0m6JouTueAara4JIYnAQVvRImBzhZWMh26gWhm0aB_KiFpRo2t2CcEQCA/exec";
