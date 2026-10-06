import {
  conflitosDeHorario,
  dadosAnonimizados,
  dataValida,
  deDataDoBanco,
  diaDaSemana,
  exigeResponsavel,
  horaDe,
  horarioValido,
  horariosSobrepostos,
  hojeEmSaoPaulo,
  idadeEm,
  matriculaValeEm,
  minutosDe,
  normalizarBusca,
  normalizarTelefone,
  paraDataDoBanco,
  temSobreposicaoInterna,
  validarDataDePresenca,
} from "./regras.js";

describe("regras de Aulas", () => {
  it("AULAS-CA-04: telefone guardado só com dígitos e com DDD", () => {
    expect(normalizarTelefone("(21) 99876-5432")).toBe("21998765432");
    expect(normalizarTelefone("21 3456-7890")).toBe("2134567890");
    expect(normalizarTelefone("99876-5432")).toBeNull();
    expect(normalizarTelefone("(21) 99876-54321")).toBeNull();
    expect(normalizarTelefone("(01) 99876-5432")).toBeNull();
    expect(normalizarTelefone("(21) 09876-5432")).toBeNull();
  });

  it("AULAS-CA-05: busca ignora acentos, maiúsculas e espaços extras", () => {
    expect(normalizarBusca("  João   da Conceição ")).toBe("joao da conceicao");
    expect(normalizarBusca("ÁGUEDA")).toBe("agueda");
  });

  it("valida datas de calendário reais", () => {
    expect(dataValida("2026-02-28")).toBe(true);
    expect(dataValida("2026-02-29")).toBe(false);
    expect(dataValida("2028-02-29")).toBe(true);
    expect(dataValida("06/10/2026")).toBe(false);
    expect(dataValida("2026-13-01")).toBe(false);
  });

  it("calcula hoje no fuso de São Paulo", () => {
    expect(hojeEmSaoPaulo(new Date("2026-10-07T02:59:00Z"))).toBe("2026-10-06");
    expect(hojeEmSaoPaulo(new Date("2026-10-07T03:00:00Z"))).toBe("2026-10-07");
  });

  it("converte datas para a coluna DATE e de volta", () => {
    expect(deDataDoBanco(paraDataDoBanco("2026-10-06"))).toBe("2026-10-06");
    expect(diaDaSemana("2026-10-06")).toBe(2);
  });

  it("AULAS-CA-03: menor de 18 anos exige responsável", () => {
    expect(idadeEm("2008-10-06", "2026-10-06")).toBe(18);
    expect(idadeEm("2008-10-07", "2026-10-06")).toBe(17);
    expect(idadeEm("2008-11-01", "2026-10-06")).toBe(17);
    expect(exigeResponsavel("2008-10-07", "2026-10-06")).toBe(true);
    expect(exigeResponsavel("2008-10-06", "2026-10-06")).toBe(false);
  });

  it("AULAS-CA-10: horário entre 05:00 e 23:59, com fim depois do início", () => {
    expect(horarioValido({ diaSemana: 1, inicio: 7 * 60, fim: 8 * 60 })).toBe(true);
    expect(horarioValido({ diaSemana: 1, inicio: 8 * 60, fim: 7 * 60 })).toBe(false);
    expect(horarioValido({ diaSemana: 1, inicio: 4 * 60, fim: 6 * 60 })).toBe(false);
    expect(horarioValido({ diaSemana: 7, inicio: 7 * 60, fim: 8 * 60 })).toBe(false);
    expect(horarioValido({ diaSemana: 1, inicio: 22 * 60, fim: 24 * 60 })).toBe(false);
    expect(horarioValido({ diaSemana: 1.5, inicio: 7 * 60, fim: 8 * 60 })).toBe(false);
    expect(minutosDe("07:30")).toBe(450);
    expect(minutosDe("24:00")).toBeNull();
    expect(minutosDe("7:30")).toBeNull();
    expect(horaDe(450)).toBe("07:30");
  });

  it("AULAS-CA-12: detecta horários sobrepostos no mesmo dia", () => {
    const segunda7 = { diaSemana: 1, inicio: 420, fim: 480 };
    expect(horariosSobrepostos(segunda7, { diaSemana: 1, inicio: 450, fim: 510 })).toBe(true);
    expect(horariosSobrepostos(segunda7, { diaSemana: 1, inicio: 480, fim: 540 })).toBe(false);
    expect(horariosSobrepostos(segunda7, { diaSemana: 2, inicio: 420, fim: 480 })).toBe(false);
    expect(temSobreposicaoInterna([segunda7, { diaSemana: 1, inicio: 470, fim: 500 }])).toBe(true);
    expect(temSobreposicaoInterna([segunda7, { diaSemana: 3, inicio: 420, fim: 480 }])).toBe(false);
    const existentes = [
      { diaSemana: 1, inicio: 450, fim: 500, turma: "A" },
      { diaSemana: 1, inicio: 600, fim: 660, turma: "B" },
    ];
    expect(conflitosDeHorario([segunda7], existentes).map((e) => e.turma)).toEqual(["A"]);
  });

  it("AULAS-CA-18: presença só em dia de aula, entre a criação da turma e hoje", () => {
    const horarios = [{ diaSemana: 2, inicio: 420, fim: 480 }];
    expect(validarDataDePresenca("2026-10-06", horarios, "2026-09-01", "2026-10-06")).toBeNull();
    expect(validarDataDePresenca("2026-10-13", horarios, "2026-09-01", "2026-10-06")).toBe(
      "FUTURA",
    );
    expect(validarDataDePresenca("2026-08-25", horarios, "2026-09-01", "2026-10-06")).toBe(
      "ANTES_DA_TURMA",
    );
    expect(validarDataDePresenca("2026-10-05", horarios, "2026-09-01", "2026-10-06")).toBe(
      "SEM_AULA",
    );
    expect(validarDataDePresenca("2026-02-30", horarios, "2026-01-01", "2026-10-06")).toBe(
      "DATA_INVALIDA",
    );
  });

  it("AULAS-CA-17: matrícula vale do início até o dia anterior ao fim", () => {
    const m = { inicio: "2026-09-01", fim: "2026-10-01" };
    expect(matriculaValeEm(m, "2026-08-31")).toBe(false);
    expect(matriculaValeEm(m, "2026-09-01")).toBe(true);
    expect(matriculaValeEm(m, "2026-09-30")).toBe(true);
    expect(matriculaValeEm(m, "2026-10-01")).toBe(false);
    expect(matriculaValeEm({ inicio: "2026-09-01", fim: null }, "2030-01-01")).toBe(true);
  });

  it("AULAS-CA-08: anonimização apaga todos os dados pessoais", () => {
    const dados = dadosAnonimizados();
    expect(dados.nome).toBe("Aluno anonimizado");
    expect(dados.ativo).toBe(false);
    for (const campo of ["telefone", "nomeBusca"] as const) expect(dados[campo]).toBe("");
    for (const campo of [
      "nascimento",
      "email",
      "observacoes",
      "emergenciaNome",
      "emergenciaTelefone",
      "responsavelNome",
      "responsavelTelefone",
    ] as const) {
      expect(dados[campo]).toBeNull();
    }
  });
});
