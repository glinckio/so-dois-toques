import { NotFoundException } from "@nestjs/common";
import type { AuditoriaService } from "../auditoria/auditoria.service.js";
import { ehAdmin, negarForaDoEscopo } from "./comum.js";
import {
  alunoSchema,
  localSchema,
  novoAlunoSchema,
  presencaSchema,
  turmaSchema,
} from "./esquemas.js";

const aluno = {
  nome: "  Ana Areia ",
  telefone: "(21) 99876-5432",
  nascimento: "1990-05-10",
  emergenciaNome: "Maria",
  emergenciaTelefone: "2134567890",
};

describe("validação de entrada de Aulas", () => {
  it("AULAS-CA-04: normaliza telefones e campos opcionais vazios", () => {
    const dados = alunoSchema.parse({
      ...aluno,
      email: " ANA@Exemplo.com ",
      observacoes: "",
      responsavelNome: "",
      responsavelTelefone: "  ",
    });
    expect(dados).toEqual({
      nome: "Ana Areia",
      telefone: "21998765432",
      nascimento: "1990-05-10",
      email: "ana@exemplo.com",
      observacoes: null,
      emergenciaNome: "Maria",
      emergenciaTelefone: "2134567890",
      responsavelNome: null,
      responsavelTelefone: null,
    });
    expect(alunoSchema.safeParse({ ...aluno, responsavelTelefone: "123" }).success).toBe(false);
    expect(alunoSchema.safeParse({ ...aluno, emergenciaTelefone: "99876-5432" }).success).toBe(
      false,
    );
    expect(alunoSchema.safeParse({ ...aluno, email: "não é e-mail" }).success).toBe(false);
  });

  it("AULAS-CA-01: data de nascimento precisa existir e não pode ser futura", () => {
    expect(alunoSchema.safeParse({ ...aluno, nascimento: "2090-01-01" }).success).toBe(false);
    expect(alunoSchema.safeParse({ ...aluno, nascimento: "1990-02-30" }).success).toBe(false);
    expect(alunoSchema.safeParse({ ...aluno, nascimento: "1850-01-01" }).success).toBe(false);
  });

  it("AULAS-CA-02: o cadastro novo exige consentimento verdadeiro", () => {
    expect(novoAlunoSchema.safeParse({ ...aluno, consentimento: true }).success).toBe(true);
    const recusado = novoAlunoSchema.safeParse({ ...aluno, consentimento: false });
    expect(recusado.error?.issues[0]?.message).toBe(
      "Registre o consentimento do aluno (ou do responsável) para salvar o cadastro.",
    );
  });

  it("AULAS-CA-09 e AULAS-CA-10: local e turma", () => {
    expect(localSchema.parse({ nome: "Arena", tipo: "PROPRIA" })).toEqual({
      nome: "Arena",
      tipo: "PROPRIA",
      endereco: null,
      ativo: true,
    });
    const turma = {
      nome: "Iniciantes",
      nivel: "INICIANTE",
      localId: "0b8f9a3e-1c2d-4e5f-8a9b-0c1d2e3f4a5b",
      professorId: "1b8f9a3e-1c2d-4e5f-8a9b-0c1d2e3f4a5b",
      vagas: 10,
      horarios: [{ diaSemana: 1, inicio: 420, fim: 480 }],
    };
    expect(turmaSchema.safeParse(turma).success).toBe(true);
    expect(turmaSchema.safeParse({ ...turma, horarios: [] }).success).toBe(false);
    expect(
      turmaSchema.safeParse({ ...turma, horarios: [{ diaSemana: 1, inicio: 480, fim: 420 }] })
        .success,
    ).toBe(false);
    expect(turmaSchema.safeParse({ ...turma, vagas: 41 }).success).toBe(false);
  });

  it("AULAS-CA-17: presença sem aluno repetido", () => {
    const id = "0b8f9a3e-1c2d-4e5f-8a9b-0c1d2e3f4a5b";
    expect(presencaSchema.safeParse({ registros: [{ alunoId: id, presente: true }] }).success).toBe(
      true,
    );
    expect(
      presencaSchema.safeParse({
        registros: [
          { alunoId: id, presente: true },
          { alunoId: id, presente: false },
        ],
      }).success,
    ).toBe(false);
  });
});

describe("escopo do professor", () => {
  it("AULAS-CA-20: fora do escopo responde não encontrado e audita", async () => {
    const registrar = vi.fn().mockResolvedValue(undefined);
    const auditoria = { registrar } as unknown as AuditoriaService;
    const professor = { id: "p1", perfil: "PROFESSOR" as const, ip: "2001:db8::1" };
    expect(ehAdmin(professor)).toBe(false);
    expect(ehAdmin({ ...professor, perfil: "ADMINISTRADOR" })).toBe(true);

    await expect(negarForaDoEscopo(auditoria, professor, "turma", "t1")).rejects.toThrow(
      new NotFoundException("Turma não encontrada."),
    );
    await expect(negarForaDoEscopo(auditoria, professor, "aluno", "a1")).rejects.toThrow(
      "Aluno não encontrado.",
    );
    expect(registrar).toHaveBeenCalledWith({
      acao: "ACESSO_NEGADO",
      atorId: "p1",
      ip: "2001:db8::1",
      alvoTipo: "Turma",
      alvoId: "t1",
      detalhes: { area: "aulas", recurso: "turma" },
    });
  });
});
