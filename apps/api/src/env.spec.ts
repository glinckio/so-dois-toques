import { InvalidEnvError, parseEnv } from "./env.js";

const valid = {
  NODE_ENV: "test",
  PORT: "3001",
  DATABASE_URL: "postgresql://usuario:senha@localhost:5432/sdt",
  WEB_ORIGIN: "http://localhost:3000",
  INTERNAL_API_KEY: "k".repeat(32),
};

describe("parseEnv", () => {
  it("FUND-CA-03: aceita variáveis válidas", () => {
    expect(parseEnv(valid)).toEqual({ ...valid, PORT: 3001, GERACAO_AUTOMATICA: true });
  });

  it("MENS-CA-07: a geração automática de mensalidades pode ser desligada", () => {
    expect(parseEnv({ ...valid, GERACAO_AUTOMATICA: "false" }).GERACAO_AUTOMATICA).toBe(false);
    expect(() => parseEnv({ ...valid, GERACAO_AUTOMATICA: "talvez" })).toThrow(
      /GERACAO_AUTOMATICA/,
    );
  });

  it("FUND-CA-03: recusa quando DATABASE_URL está ausente", () => {
    expect(() => parseEnv({ NODE_ENV: "test" })).toThrow(InvalidEnvError);
  });

  it("FUND-CA-03: recusa URL que não é PostgreSQL", () => {
    expect(() => parseEnv({ ...valid, DATABASE_URL: "mysql://u:p@localhost/db" })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("FUND-CA-03: recusa origem do front-end inválida", () => {
    expect(() => parseEnv({ ...valid, WEB_ORIGIN: "qualquer-coisa" })).toThrow(/WEB_ORIGIN/);
  });

  it("FUND-CA-03: a mensagem de erro não expõe o valor da variável", () => {
    const secret = "postgresql-mas-invalida-segredo123";
    try {
      parseEnv({ ...valid, DATABASE_URL: secret });
      expect.fail("deveria ter lançado erro");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidEnvError);
      expect((error as Error).message).not.toContain("segredo123");
      expect((error as InvalidEnvError).fields).toEqual(["DATABASE_URL"]);
    }
  });

  it("FUND-CA-03: recusa chave interna curta", () => {
    expect(() => parseEnv({ ...valid, INTERNAL_API_KEY: "curta" })).toThrow(/INTERNAL_API_KEY/);
  });

  it("usa valores padrão para NODE_ENV, PORT e WEB_ORIGIN", () => {
    expect(
      parseEnv({ DATABASE_URL: valid.DATABASE_URL, INTERNAL_API_KEY: valid.INTERNAL_API_KEY }),
    ).toMatchObject({
      NODE_ENV: "development",
      PORT: 3001,
      WEB_ORIGIN: "http://localhost:3000",
    });
  });
});
