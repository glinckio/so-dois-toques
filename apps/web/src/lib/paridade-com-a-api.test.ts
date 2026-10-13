import { describe, expect, it } from "vitest";
import { SENHA_MAXIMO, SENHA_MINIMO } from "../../../api/src/acesso/regras";
import { LIMITES_DA_SENHA } from "./base/senha";

// As prévias da tela repetem contas da API para responder enquanto se digita. Quem grava
// é a API; estes testes garantem que a prévia não se afasta do que será gravado.
describe("prévias iguais às regras da API", () => {
  it("VIVO-CA-10: o medidor de força usa os mesmos limites de tamanho da API", () => {
    expect(LIMITES_DA_SENHA).toEqual({ minimo: SENHA_MINIMO, maximo: SENHA_MAXIMO });
  });
});
