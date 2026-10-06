import { gerarHashSenha, verificarSenha } from "./senhas.js";

async function medir(acao: () => Promise<unknown>): Promise<number> {
  const tempos: number[] = [];
  for (let i = 0; i < 5; i++) {
    const inicio = performance.now();
    await acao();
    tempos.push(performance.now() - inicio);
  }
  return tempos.sort((a, b) => a - b)[2]!;
}

describe("senhas", () => {
  it("ACESSO-CA-09: gera hash Argon2id e confere só a senha certa", async () => {
    const hash = await gerarHashSenha("areia-quadra-2026");
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(await verificarSenha("areia-quadra-2026", hash)).toBe(true);
    expect(await verificarSenha("outra-senha-qualquer", hash)).toBe(false);
    expect(await verificarSenha("areia-quadra-2026", "hash-corrompido")).toBe(false);
  });

  it("ACESSO-CA-02: usuário inexistente leva o mesmo tempo de uma senha errada", async () => {
    const hash = await gerarHashSenha("areia-quadra-2026");
    await verificarSenha("aquecimento", null);
    const senhaErrada = await medir(() => verificarSenha("senha-errada-123", hash));
    const inexistente = await medir(() => verificarSenha("senha-errada-123", null));
    expect(await verificarSenha("qualquer", null)).toBe(false);
    // Sem o hash fictício, o caso "inexistente" levaria quase zero.
    expect(inexistente).toBeGreaterThan(senhaErrada * 0.5);
    expect(inexistente).toBeLessThan(senhaErrada * 2);
  });
});
