import "reflect-metadata";
import { ConflictException } from "@nestjs/common";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { z } from "zod";
import { AuditoriaService } from "../auditoria/auditoria.service.js";
import { ehExecucaoDireta } from "../comum/execucao.js";
import { parseEnv } from "../env.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { criarAdminInicial, SenhaInvalidaError } from "../usuarios/usuarios.service.js";

/**
 * pnpm admin:criar — cria o primeiro administrador (ACESSO-CA-21).
 * Pergunta nome, e-mail e senha no terminal (a senha não aparece na tela).
 * Para automação (CI), aceita ADMIN_NOME, ADMIN_EMAIL e ADMIN_SENHA no ambiente.
 */

const dadosSchema = z.object({
  nome: z.string().trim().min(2, "Nome muito curto").max(120, "Nome muito longo"),
  email: z.email("E-mail inválido").max(254),
  senha: z.string(),
});

async function perguntar(): Promise<{ nome: string; email: string; senha: string }> {
  let silenciar = false;
  const saida = new Writable({
    write(pedaco, codificacao, feito) {
      if (!silenciar) process.stdout.write(pedaco, codificacao);
      feito();
    },
  });
  const rl = createInterface({ input: process.stdin, output: saida, terminal: true });
  try {
    const nome = await rl.question("Nome: ");
    const email = await rl.question("E-mail: ");
    process.stdout.write("Senha (não aparece na tela): ");
    silenciar = true;
    const senha = await rl.question("");
    silenciar = false;
    process.stdout.write("\n");
    return { nome, email, senha };
  } finally {
    rl.close();
  }
}

export async function executar(ambiente: NodeJS.ProcessEnv): Promise<number> {
  const env = parseEnv(ambiente);
  const { ADMIN_NOME, ADMIN_EMAIL, ADMIN_SENHA } = ambiente;
  const brutos =
    ADMIN_NOME && ADMIN_EMAIL && ADMIN_SENHA
      ? { nome: ADMIN_NOME, email: ADMIN_EMAIL, senha: ADMIN_SENHA }
      : await perguntar();

  const dados = dadosSchema.safeParse({ ...brutos, email: brutos.email.trim().toLowerCase() });
  if (!dados.success) {
    console.error(dados.error.issues.map((i) => i.message).join("\n"));
    return 1;
  }

  const prisma = new PrismaService(env);
  try {
    const usuario = await criarAdminInicial(prisma, new AuditoriaService(prisma), dados.data);
    console.log(`Administrador criado: ${usuario.nome} <${usuario.email}>`);
    return 0;
  } catch (erro) {
    if (erro instanceof SenhaInvalidaError) {
      console.error(erro.message);
      return 1;
    }
    if (erro instanceof ConflictException) {
      console.error("Já existe um administrador ativo. Nada foi feito.");
      return 1;
    }
    throw erro;
  } finally {
    await prisma.$disconnect();
  }
}

if (ehExecucaoDireta(import.meta.url, process.argv[1])) {
  process.exitCode = await executar(process.env);
}
