import { checkHealth } from "./health.js";

describe("checkHealth", () => {
  it("FUND-CA-04: informa ok quando o banco responde", async () => {
    const client = { $queryRaw: async () => [{ "?column?": 1 }] };
    await expect(checkHealth(client)).resolves.toEqual({ status: "ok", database: "ok" });
  });

  it("FUND-CA-04: não expõe a mensagem de erro do banco", async () => {
    const client = {
      $queryRaw: async () => {
        throw new Error("connect ECONNREFUSED usuario@db-interno:5432");
      },
    };
    const result = await checkHealth(client);
    expect(result).toEqual({ status: "indisponivel", database: "indisponivel" });
    expect(JSON.stringify(result)).not.toContain("db-interno");
  });
});
