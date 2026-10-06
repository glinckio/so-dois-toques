import { createHash, randomBytes, randomInt } from "node:crypto";

export const PERFIS = ["ADMINISTRADOR", "PROFESSOR", "ATENDENTE"] as const;
export type PerfilUsuario = (typeof PERFIS)[number];

// ---------------------------------------------------------------- senhas

export const SENHA_MINIMO = 10;
export const SENHA_MAXIMO = 128;

/** Senhas comuns com 10 caracteres ou mais (listas públicas de vazamentos + termos locais). */
const SENHAS_COMUNS = new Set([
  "1234567890",
  "0123456789",
  "12345678910",
  "123456789a",
  "a123456789",
  "1234567891",
  "0987654321",
  "1qaz2wsx3edc",
  "1q2w3e4r5t",
  "1q2w3e4r5t6y",
  "qwertyuiop",
  "qwerty1234",
  "qwerty12345",
  "asdfghjkl1",
  "zxcvbnm123",
  "password12",
  "password123",
  "password1234",
  "iloveyou12",
  "abcdef1234",
  "abc1234567",
  "abcd123456",
  "senha12345",
  "senha123456",
  "senhasenha",
  "minhasenha",
  "minhasenha1",
  "minhasenha123",
  "mudar12345",
  "trocar1234",
  "brasil1234",
  "brasil123456",
  "flamengo123",
  "flamengo10",
  "corinthians",
  "corinthians1",
  "palmeiras10",
  "palmeiras123",
  "saopaulo123",
  "vasco12345",
  "gremio1234",
  "cruzeiro123",
  "beachtennis",
  "beachtennis1",
  "futevolei1",
  "futevolei123",
  "sodoistoques",
  "sodoistoques1",
  "sodoistoques123",
  "administrador",
  "admin12345",
  "admin123456",
  "administrator",
  "welcome123",
  "letmein123",
  "dragon1234",
  "monkey1234",
  "princess12",
  "sunshine12",
  "football12",
  "baseball12",
  "superman12",
  "starwars12",
]);

export type ProblemaSenha = "CURTA" | "LONGA" | "COMUM" | "IGUAL_EMAIL" | "REPETIDA";

/** Política de senha da spec (ACESSO-CA-13/17): tamanho, lista de senhas comuns e e-mail. */
export function validarSenha(senha: string, email: string): ProblemaSenha | null {
  if (senha.length < SENHA_MINIMO) return "CURTA";
  if (senha.length > SENHA_MAXIMO) return "LONGA";
  const normalizada = senha.toLowerCase();
  if (normalizada === email.trim().toLowerCase()) return "IGUAL_EMAIL";
  if (new Set(normalizada).size === 1) return "REPETIDA";
  if (SENHAS_COMUNS.has(normalizada)) return "COMUM";
  return null;
}

export const MENSAGENS_SENHA: Record<ProblemaSenha, string> = {
  CURTA: `A senha precisa ter pelo menos ${SENHA_MINIMO} caracteres.`,
  LONGA: `A senha pode ter no máximo ${SENHA_MAXIMO} caracteres.`,
  COMUM: "Essa senha é muito comum. Escolha outra.",
  IGUAL_EMAIL: "A senha não pode ser igual ao e-mail.",
  REPETIDA: "A senha não pode ser um único caractere repetido.",
};

/** Sem caracteres que se confundem (0/O, 1/l/I). */
const ALFABETO_TEMPORARIA = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function gerarSenhaTemporaria(tamanho = 16): string {
  let senha = "";
  for (let i = 0; i < tamanho; i++)
    senha += ALFABETO_TEMPORARIA[randomInt(ALFABETO_TEMPORARIA.length)];
  return senha;
}

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

// ---------------------------------------------------------------- sessão

export const SESSAO_INATIVIDADE_MS = 12 * 60 * 60 * 1000;
export const SESSAO_DURACAO_MAXIMA_MS = 7 * 24 * 60 * 60 * 1000;
/** Evita gravar no banco a cada requisição: o último uso só é atualizado de minuto em minuto. */
export const SESSAO_ATUALIZAR_USO_MS = 60 * 1000;

export function gerarTokenSessao(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function sessaoValida(sessao: { ultimoUsoEm: Date; expiraEm: Date }, agora: Date): boolean {
  if (agora.getTime() >= sessao.expiraEm.getTime()) return false;
  return agora.getTime() - sessao.ultimoUsoEm.getTime() < SESSAO_INATIVIDADE_MS;
}

// ---------------------------------------------------------------- bloqueios

export const BLOQUEIO_TENTATIVAS_EMAIL = 5;
export const BLOQUEIO_TENTATIVAS_IP = 20;
export const BLOQUEIO_JANELA_MS = 15 * 60 * 1000;

/**
 * Bloqueio por e-mail (ACESSO-CA-03): com 5 ou mais falhas seguidas desde o último
 * acesso com sucesso, o e-mail fica bloqueado até 15 minutos depois da última falha.
 * Recebe as tentativas do e-mail da mais recente para a mais antiga.
 */
export function bloqueioEmailAte(
  tentativas: { sucesso: boolean; criadaEm: Date }[],
  agora: Date,
): Date | null {
  let falhasSeguidas = 0;
  for (const tentativa of tentativas) {
    if (tentativa.sucesso) break;
    falhasSeguidas++;
  }
  const ultima = tentativas[0];
  if (falhasSeguidas < BLOQUEIO_TENTATIVAS_EMAIL || !ultima) return null;
  const ate = new Date(ultima.criadaEm.getTime() + BLOQUEIO_JANELA_MS);
  return ate.getTime() > agora.getTime() ? ate : null;
}

/** Bloqueio por IP (ACESSO-CA-04): 20 falhas do mesmo IP nos últimos 15 minutos. */
export function ipBloqueado(falhasNaJanela: number): boolean {
  return falhasNaJanela >= BLOQUEIO_TENTATIVAS_IP;
}

// ---------------------------------------------------------------- permissões

export const AREAS = [
  "inicio",
  "aulas",
  "horarios",
  "estoque",
  "caixa",
  "contabil",
  "usuarios",
  "auditoria",
] as const;
export type Area = (typeof AREAS)[number];

const PERMISSOES: Record<PerfilUsuario, readonly Area[]> = {
  ADMINISTRADOR: AREAS,
  PROFESSOR: ["inicio", "aulas"],
  ATENDENTE: ["inicio", "horarios", "estoque", "caixa"],
};

export function podeAcessar(perfil: PerfilUsuario, area: Area): boolean {
  return PERMISSOES[perfil].includes(area);
}

export function areasDoPerfil(perfil: PerfilUsuario): Area[] {
  return [...PERMISSOES[perfil]];
}
