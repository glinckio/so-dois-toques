import { alunoSchema, novoAlunoSchema, presencaSchema, turmaSchema } from "./esquemas.js";

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

  it("ALU-CA-01: data de nascimento é opcional; vazia vira null", () => {
    for (const nascimento of ["", "  ", null, undefined]) {
      const dados = alunoSchema.parse({ ...aluno, nascimento });
      expect(dados.nascimento).toBeNull();
    }
  });

  it("ALU-CA-02: contato de emergência é opcional, mas nome e telefone andam juntos", () => {
    const sem = alunoSchema.parse({ ...aluno, emergenciaNome: "", emergenciaTelefone: "" });
    expect(sem).toMatchObject({ emergenciaNome: null, emergenciaTelefone: null });
    for (const metade of [
      { emergenciaNome: "Maria", emergenciaTelefone: "" },
      { emergenciaNome: "", emergenciaTelefone: "2134567890" },
    ]) {
      const recusado = novoAlunoSchema.safeParse({ ...aluno, ...metade, consentimento: true });
      expect(recusado.error?.issues[0]?.message).toBe(
        "Informe o nome e o telefone do contato de emergência, ou deixe os dois em branco.",
      );
    }
  });

  it("AULAS-CA-02: o cadastro novo exige consentimento verdadeiro", () => {
    expect(novoAlunoSchema.safeParse({ ...aluno, consentimento: true }).success).toBe(true);
    const recusado = novoAlunoSchema.safeParse({ ...aluno, consentimento: false });
    expect(recusado.error?.issues[0]?.message).toBe(
      "Registre o consentimento do aluno (ou do responsável) para salvar o cadastro.",
    );
  });

  it("TURMA-CA-01 e TURMA-CA-08: turma só com dia, início, fim, nível, categoria e vagas", () => {
    const turma = {
      diaSemana: 2,
      horaInicio: 19 * 60,
      horaFim: 20 * 60,
      nivel: "INICIANTE",
      categoria: "MISTO",
      vagas: 10,
    };
    expect(turmaSchema.parse(turma)).toEqual(turma);
    for (const errado of [
      { horaInicio: 4 * 60 },
      { horaFim: 24 * 60 },
      { horaInicio: 20 * 60, horaFim: 19 * 60 },
      { diaSemana: 7 },
      { vagas: 0 },
      { vagas: 41 },
      { nivel: "PRO" },
      { categoria: "INFANTIL" },
      { categoria: undefined },
    ]) {
      expect(turmaSchema.safeParse({ ...turma, ...errado }).success, JSON.stringify(errado)).toBe(
        false,
      );
    }
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
