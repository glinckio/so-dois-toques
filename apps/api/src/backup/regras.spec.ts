import {
  descreverConferencia,
  diferencas,
  nomeDeBancoValido,
  nomeDoArquivo,
  nomeDoBanco,
  separarSenha,
  urlDoBanco,
  type Conferencia,
} from "./regras.js";

const conferencia: Conferencia = {
  usuarios: 3,
  alunos: 10,
  lancamentos: 42,
  entradasCentavos: 150_000,
  saidasCentavos: 30_000,
  auditoria: 99,
};

describe("regras do backup", () => {
  it("LANC-CA-04: o nome do arquivo usa o horário de São Paulo", () => {
    // 02:30 UTC de 7/10 ainda é 23:30 de 6/10 em São Paulo.
    expect(nomeDoArquivo(new Date("2026-10-07T02:30:00Z"))).toBe(
      "so_dois_toques-2026-10-06-2330.dump",
    );
    expect(nomeDoArquivo(new Date("2026-01-05T12:05:00Z"))).toBe(
      "so_dois_toques-2026-01-05-0905.dump",
    );
  });

  it("LANC-CA-04: a senha sai da URL e o parâmetro do Prisma também", () => {
    const { url, senha } = separarSenha(
      "postgresql://sdt:s%40nha%3Asecreta@db.exemplo.com:5432/so_dois_toques?schema=public&sslmode=require",
    );
    expect(senha).toBe("s@nha:secreta");
    expect(url).toBe("postgresql://sdt@db.exemplo.com:5432/so_dois_toques?sslmode=require");
    expect(url).not.toContain("secreta");
    expect(separarSenha("postgresql://sdt@localhost/sdt").senha).toBeUndefined();
  });

  it("LANC-CA-06: só aceita nomes de banco simples", () => {
    expect(nomeDeBancoValido("so_dois_toques_restauracao")).toBe(true);
    expect(nomeDeBancoValido("Banco")).toBe(false);
    expect(nomeDeBancoValido('x"; DROP DATABASE y; --')).toBe(false);
    expect(nomeDeBancoValido("1banco")).toBe(false);
    expect(() => urlDoBanco("postgresql://u:p@h/a", "B-ruim")).toThrow("Nome de banco inválido");
  });

  it("LANC-CA-05: troca o banco mantendo a conexão", () => {
    expect(urlDoBanco("postgresql://u:p@h:5432/origem?sslmode=require", "destino")).toBe(
      "postgresql://u:p@h:5432/destino?sslmode=require",
    );
    expect(nomeDoBanco("postgresql://u:p@h:5432/origem")).toBe("origem");
  });

  it("LANC-CA-05: aponta os campos em que as conferências diferem", () => {
    expect(diferencas(conferencia, { ...conferencia })).toEqual([]);
    expect(diferencas(conferencia, { ...conferencia, lancamentos: 41, auditoria: 1 })).toEqual([
      "lancamentos",
      "auditoria",
    ]);
    expect(descreverConferencia(conferencia)).toContain("Lançamentos: 42");
  });
});
