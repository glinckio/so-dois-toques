import {
  areasDoPerfil,
  bloqueioEmailAte,
  gerarSenhaTemporaria,
  gerarTokenSessao,
  hashToken,
  ipBloqueado,
  normalizarEmail,
  podeAcessar,
  sessaoValida,
  validarSenha,
} from "./regras.js";

const agora = new Date("2026-10-06T12:00:00Z");
const minutosAtras = (min: number) => new Date(agora.getTime() - min * 60_000);
const horasAtras = (h: number) => minutosAtras(h * 60);

describe("validarSenha", () => {
  it("ACESSO-CA-13: aceita senha forte", () => {
    expect(validarSenha("cavalo azul correndo", "ana@exemplo.com")).toBeNull();
  });

  it("ACESSO-CA-13: recusa senha com menos de 10 caracteres", () => {
    expect(validarSenha("curta123", "ana@exemplo.com")).toBe("CURTA");
  });

  it("ACESSO-CA-13: recusa senha muito longa", () => {
    expect(validarSenha("x".repeat(60) + "y".repeat(69), "ana@exemplo.com")).toBe("LONGA");
  });

  it("ACESSO-CA-13: recusa senha comum, sem diferenciar maiúsculas", () => {
    expect(validarSenha("QwertyUiop", "ana@exemplo.com")).toBe("COMUM");
    expect(validarSenha("1234567890", "ana@exemplo.com")).toBe("COMUM");
  });

  it("ACESSO-CA-17: recusa senha igual ao e-mail", () => {
    expect(validarSenha("Ana@Exemplo.com", "ana@exemplo.com")).toBe("IGUAL_EMAIL");
  });

  it("recusa um único caractere repetido", () => {
    expect(validarSenha("aaaaaaaaaaaa", "ana@exemplo.com")).toBe("REPETIDA");
  });
});

describe("gerarSenhaTemporaria", () => {
  it("ACESSO-CA-12: gera senhas de 16 caracteres sem caracteres ambíguos e que passam na política", () => {
    const senhas = Array.from({ length: 100 }, () => gerarSenhaTemporaria());
    expect(new Set(senhas).size).toBe(100);
    for (const senha of senhas) {
      expect(senha).toHaveLength(16);
      expect(senha).not.toMatch(/[0O1lI]/);
      expect(validarSenha(senha, "x@y.com")).toBeNull();
    }
  });
});

describe("normalizarEmail", () => {
  it("remove espaços e usa minúsculas", () => {
    expect(normalizarEmail("  Ana@Exemplo.COM ")).toBe("ana@exemplo.com");
  });
});

describe("token de sessão", () => {
  it("ACESSO-CA-08: token aleatório de 32 bytes e hash SHA-256 de 64 caracteres", () => {
    const token = gerarTokenSessao();
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
    expect(gerarTokenSessao()).not.toBe(token);
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).not.toContain(token);
  });
});

describe("sessaoValida", () => {
  const expiraEm = new Date(agora.getTime() + 60_000);

  it("ACESSO-CA-06: vale enquanto usada nas últimas 12 horas", () => {
    expect(sessaoValida({ ultimoUsoEm: horasAtras(11.9), expiraEm }, agora)).toBe(true);
  });

  it("ACESSO-CA-06: expira após 12 horas sem uso", () => {
    expect(sessaoValida({ ultimoUsoEm: horasAtras(12), expiraEm }, agora)).toBe(false);
  });

  it("ACESSO-CA-06: expira no limite de 7 dias mesmo em uso", () => {
    expect(sessaoValida({ ultimoUsoEm: agora, expiraEm: agora }, agora)).toBe(false);
  });
});

describe("bloqueioEmailAte", () => {
  const falha = (min: number) => ({ sucesso: false, criadaEm: minutosAtras(min) });
  const sucesso = (min: number) => ({ sucesso: true, criadaEm: minutosAtras(min) });

  it("ACESSO-CA-03: 4 falhas não bloqueiam", () => {
    expect(bloqueioEmailAte([falha(1), falha(2), falha(3), falha(4)], agora)).toBeNull();
  });

  it("ACESSO-CA-03: 5 falhas seguidas bloqueiam por 15 minutos desde a última", () => {
    const ate = bloqueioEmailAte([falha(1), falha(2), falha(3), falha(4), falha(5)], agora);
    expect(ate).toEqual(new Date(minutosAtras(1).getTime() + 15 * 60_000));
  });

  it("ACESSO-CA-03: o bloqueio termina depois de 15 minutos", () => {
    expect(
      bloqueioEmailAte([falha(16), falha(17), falha(18), falha(19), falha(20)], agora),
    ).toBeNull();
  });

  it("ACESSO-CA-03: um acesso com sucesso zera a contagem", () => {
    expect(
      bloqueioEmailAte([falha(1), falha(2), sucesso(3), falha(4), falha(5), falha(6)], agora),
    ).toBeNull();
  });

  it("ACESSO-CA-03: depois do bloqueio, nova falha bloqueia de novo", () => {
    const tentativas = [falha(0), falha(20), falha(21), falha(22), falha(23), falha(24)];
    expect(bloqueioEmailAte(tentativas, agora)).not.toBeNull();
  });
});

describe("ipBloqueado", () => {
  it("ACESSO-CA-04: bloqueia a partir de 20 falhas na janela", () => {
    expect(ipBloqueado(19)).toBe(false);
    expect(ipBloqueado(20)).toBe(true);
  });
});

describe("permissões", () => {
  it("ACESSO-CA-10: administrador acessa tudo", () => {
    expect(podeAcessar("ADMINISTRADOR", "contabil")).toBe(true);
    expect(podeAcessar("ADMINISTRADOR", "usuarios")).toBe(true);
  });

  it("ACESSO-CA-10: professor só acessa aulas", () => {
    expect(podeAcessar("PROFESSOR", "aulas")).toBe(true);
    for (const area of [
      "contabil",
      "caixa",
      "estoque",
      "horarios",
      "usuarios",
      "auditoria",
    ] as const) {
      expect(podeAcessar("PROFESSOR", area)).toBe(false);
    }
  });

  it("ACESSO-CA-10: atendente acessa horários, estoque e caixa, sem contábil e usuários", () => {
    expect(areasDoPerfil("ATENDENTE")).toEqual(["inicio", "horarios", "estoque", "caixa"]);
    expect(podeAcessar("ATENDENTE", "contabil")).toBe(false);
    expect(podeAcessar("ATENDENTE", "usuarios")).toBe(false);
  });
});
