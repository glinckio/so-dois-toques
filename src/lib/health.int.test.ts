import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { getEnv } from "@/env";
import { checkHealth } from "./health";

const client = new PrismaClient({
  adapter: new PrismaPg({ connectionString: getEnv().DATABASE_URL }),
});

afterAll(async () => {
  await client.$disconnect();
});

describe("checkHealth com PostgreSQL real", () => {
  it("FUND-CA-04: responde ok com o banco de testes no ar", async () => {
    await expect(checkHealth(client)).resolves.toEqual({ status: "ok", database: "ok" });
  });

  it("FUND-CA-04: responde indisponivel quando o banco não existe", async () => {
    const url = new URL(getEnv().DATABASE_URL);
    url.pathname = "/banco_que_nao_existe";
    const broken = new PrismaClient({
      adapter: new PrismaPg({ connectionString: url.toString() }),
    });
    try {
      await expect(checkHealth(broken)).resolves.toEqual({
        status: "indisponivel",
        database: "indisponivel",
      });
    } finally {
      await broken.$disconnect();
    }
  });
});
