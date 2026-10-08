import { describe, expect, it } from "vitest";
import { SENHA_MAXIMO, SENHA_MINIMO } from "../../../api/src/acesso/regras";
import { custoMedio } from "../../../api/src/estoque/regras";
import { LIMITES_DA_SENHA } from "./base/senha";
import { custoMedioPrevisto } from "./estoque/resumos";

// As prévias da tela repetem contas da API para responder enquanto se digita. Quem grava
// é a API; estes testes garantem que a prévia não se afasta do que será gravado.
describe("prévias iguais às regras da API", () => {
  it("ESTQ-CA-02: o custo médio previsto na compra é o mesmo que a API grava", () => {
    for (const saldo of [-2, 0, 1, 7, 250]) {
      for (const custo of [0, 99, 333, 1250]) {
        for (const quantidade of [1, 3, 12]) {
          for (const total of [0, 1, 1000, 12345]) {
            expect(custoMedioPrevisto(saldo, custo, quantidade, total)).toBe(
              custoMedio(saldo, custo, quantidade, total),
            );
          }
        }
      }
    }
  });

  it("VIVO-CA-10: o medidor de força usa os mesmos limites de tamanho da API", () => {
    expect(LIMITES_DA_SENHA).toEqual({ minimo: SENHA_MINIMO, maximo: SENHA_MAXIMO });
  });
});
