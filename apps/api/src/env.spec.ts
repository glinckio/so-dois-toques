import { InvalidEnvError, parseEnv } from "./env.js";

const valid = {
  NODE_ENV: "test",
  PORT: "3001",
  DATABASE_URL: "postgresql://usuario:senha@localhost:5432/sdt",
  WEB_ORIGIN: "http://localhost:3000",
};

describe("parseEnv", () => {
  it("FUND-CA-03: aceita variáveis válidas", () => {
    expect(parseEnv(valid)).toEqual({ ...valid, PORT: 3001 });
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

  it("usa valores padrão para NODE_ENV, PORT e WEB_ORIGIN", () => {
    expect(parseEnv({ DATABASE_URL: valid.DATABASE_URL })).toMatchObject({
      NODE_ENV: "development",
      PORT: 3001,
      WEB_ORIGIN: "http://localhost:3000",
    });
  });
});
