import { BadRequestException } from "@nestjs/common";
import { z } from "zod";
import { ZodPipe } from "./zod.pipe.js";

describe("ZodPipe", () => {
  const pipe = new ZodPipe(
    z.object({ nome: z.string().trim().min(2, "Informe o nome"), idade: z.number().optional() }),
  );

  it("devolve o valor já validado e transformado", () => {
    expect(pipe.transform({ nome: "  Ana  ", extra: "ignorado" })).toEqual({ nome: "Ana" });
  });

  it("recusa com 400 listando os campos, sem ecoar o valor enviado", () => {
    try {
      pipe.transform({ nome: "x", idade: "segredo" });
      expect.unreachable();
    } catch (erro) {
      expect(erro).toBeInstanceOf(BadRequestException);
      const corpo = (erro as BadRequestException).getResponse();
      expect(corpo).toMatchObject({
        statusCode: 400,
        message: "Dados inválidos",
        campos: expect.arrayContaining([{ campo: "nome", mensagem: "Informe o nome" }]),
      });
      expect(JSON.stringify(corpo)).not.toContain("segredo");
    }
  });
});
