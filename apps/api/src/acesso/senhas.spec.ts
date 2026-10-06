import * as argon2 from "@node-rs/argon2";
import { gerarHashSenha, verificarSenha } from "./senhas.js";

// Embrulha o verify real num espião, para ver qual hash foi conferido.
vi.mock("@node-rs/argon2", async (original) => {
  const real = await original<typeof import("@node-rs/argon2")>();
  return { ...real, verify: vi.fn(real.verify) };
});

const PARAMETROS = /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/;

describe("senhas", () => {
  it("ACESSO-CA-09: gera hash Argon2id e confere só a senha certa", async () => {
    const hash = await gerarHashSenha("areia-quadra-2026");
    expect(hash).toMatch(PARAMETROS);
    expect(await verificarSenha("areia-quadra-2026", hash)).toBe(true);
    expect(await verificarSenha("outra-senha-qualquer", hash)).toBe(false);
    expect(await verificarSenha("areia-quadra-2026", "hash-corrompido")).toBe(false);
  });

  it("ACESSO-CA-02: usuário inexistente passa pelo mesmo Argon2id de uma senha errada", async () => {
    // Medir tempo no CI é instável; o que garante tempo equivalente é fazer a mesma
    // verificação Argon2id, com os mesmos parâmetros, quando o usuário não existe.
    const verify = vi.mocked(argon2.verify);
    verify.mockClear();
    expect(await verificarSenha("senha-errada-123", null)).toBe(false);
    expect(verify).toHaveBeenCalledTimes(1);
    const [hashFicticio, senha] = verify.mock.calls[0]!;
    expect(senha).toBe("senha-errada-123");
    expect(hashFicticio).toMatch(PARAMETROS);
    // E a senha digitada nunca confere com o hash fictício.
    expect(await verificarSenha(String(hashFicticio), null)).toBe(false);
  });
});
