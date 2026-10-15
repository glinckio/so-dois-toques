import { describe, expect, it } from "vitest";
import { CORES_DE_AVATAR, corDoAvatar, iniciais } from "./avatar";
import { filtrarBusca, itensDaBusca, normalizar } from "./busca";
import { leituraDoMes, type DadosDaLeitura } from "./leitura";
import { fatiasDaRosca } from "./rosca";
import { semanaDe } from "./semana";
import { forcaDaSenha } from "./senha";

describe("avatar", () => {
  it("usa a primeira letra do primeiro e do último nome", () => {
    expect(iniciais("Gabriel")).toBe("G");
    expect(iniciais("  ana   maria de souza ")).toBe("AS");
    expect(iniciais("Élcio Íris")).toBe("ÉÍ");
    expect(iniciais("")).toBe("?");
  });

  it("dá sempre a mesma cor para o mesmo nome, dentro da paleta", () => {
    for (const nome of ["Gabriel", "Ana Souza", "Paulo", "Iara Inicio", "Z"]) {
      const cor = corDoAvatar(nome);
      expect(cor).toBeGreaterThanOrEqual(0);
      expect(cor).toBeLessThan(CORES_DE_AVATAR);
      expect(corDoAvatar(` ${nome.toUpperCase()} `)).toBe(cor);
    }
    const cores = new Set(
      ["Ana", "Bruno", "Carla", "Davi", "Eva", "Fábio", "Gil"].map(corDoAvatar),
    );
    expect(cores.size).toBeGreaterThan(2);
  });
});

describe("VIVO-CA-06: faixa de dias", () => {
  it("devolve domingo a sábado da semana que contém a data", () => {
    const semana = semanaDe("2026-10-07");
    expect(semana.map((d) => d.data)).toEqual([
      "2026-10-04",
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
    ]);
    expect(semana.map((d) => d.diaSemana)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(semana[3]).toEqual({ data: "2026-10-07", diaSemana: 3, dia: 7 });
  });

  it("atravessa o mês e o ano", () => {
    expect(semanaDe("2026-12-31").map((d) => d.dia)).toEqual([27, 28, 29, 30, 31, 1, 2]);
    expect(semanaDe("2026-10-04")[0]!.data).toBe("2026-10-04");
  });
});

describe("VIVO-CA-10: força da senha", () => {
  it("chama de curta a senha com menos de 10 caracteres e de longa a que passa de 128", () => {
    expect(forcaDaSenha("")).toEqual({ nivel: 0, rotulo: "Curta demais" });
    expect(forcaDaSenha("Ab1!xyz")).toEqual({ nivel: 0, rotulo: "Curta demais" });
    expect(forcaDaSenha("Ab1!".repeat(33))).toEqual({ nivel: 0, rotulo: "Longa demais" });
  });

  it("chama de fraca a senha repetida", () => {
    expect(forcaDaSenha("aaaaaaaaaaaa").nivel).toBe(0);
    expect(forcaDaSenha("abababababab").rotulo).toBe("Fraca");
  });

  it("sobe com o tamanho e a variedade", () => {
    expect(forcaDaSenha("bolanarede").rotulo).toBe("Razoável");
    expect(forcaDaSenha("bolanarede2026").rotulo).toBe("Boa");
    expect(forcaDaSenha("bola-na-rede-2026").rotulo).toBe("Forte");
  });
});

describe("VIVO-CA-03: busca rápida", () => {
  it("VIVO-CA-03 e FOCO-CA-02: lista só as áreas e ações do perfil, com as ações primeiro", () => {
    const professor = itensDaBusca(["inicio", "aulas", "horarios"], false);
    expect(professor.map((i) => i.rotulo)).toEqual([
      "Início",
      "Aulas",
      "Horários",
      "Alunos",
      "Bloqueios semanais",
    ]);

    const atendente = itensDaBusca(["inicio", "mensalidades", "horarios"], false);
    expect(atendente.filter((i) => i.grupo === "Ações rápidas")).toEqual([]);
    expect(atendente.some((i) => i.area === "contabil")).toBe(false);
    const rotulos = atendente.map((i) => i.rotulo).join(" ");
    for (const fora of ["Estoque", "Caixa", "venda", "reserva", "Lançar"]) {
      expect(rotulos).not.toContain(fora);
    }

    const admin = itensDaBusca(
      ["inicio", "aulas", "mensalidades", "horarios", "contabil", "usuarios", "auditoria"],
      true,
    );
    expect(admin.filter((i) => i.grupo === "Ações rápidas").map((i) => i.rotulo)).toEqual([
      "Novo aluno",
      "Nova turma",
      "Bloquear horário",
    ]);
    expect(admin.filter((i) => i.grupo === "Áreas")).toHaveLength(7);
  });

  it("filtra sem ligar para acento, maiúscula ou ordem das palavras", () => {
    const itens = itensDaBusca(["inicio", "mensalidades", "horarios"], true);
    expect(normalizar("  Horários ")).toBe("horarios");
    expect(filtrarBusca(itens, "horarios").map((i) => i.rotulo)).toContain("Horários");
    expect(filtrarBusca(itens, "atraso").map((i) => i.rotulo)).toEqual(["Inadimplentes"]);
    expect(filtrarBusca(itens, "quadra manutenção").map((i) => i.rotulo)).toEqual([
      "Bloquear horário",
    ]);
    expect(filtrarBusca(itens, "   ")).toHaveLength(itens.length);
    expect(filtrarBusca(itens, "contábil")).toEqual([]);
  });
});

describe("rosca", () => {
  it("divide 100 entre os valores, com folga entre as fatias", () => {
    const fatias = fatiasDaRosca([60, 30, 10, 0], 2);
    expect(fatias.map((f) => f.percentual)).toEqual([60, 30, 10, 0]);
    expect(fatias.map((f) => f.inicio)).toEqual([0, 60, 90, 100]);
    expect(fatias.map((f) => f.tamanho)).toEqual([58, 28, 8, 0]);
  });

  it("sem folga quando só um valor tem dinheiro, e vazia sem total", () => {
    expect(fatiasDaRosca([0, 500, 0])[1]).toEqual({ inicio: 0, tamanho: 100, percentual: 100 });
    expect(fatiasDaRosca([0, 0])).toEqual([]);
    expect(fatiasDaRosca([])).toEqual([]);
  });
});

describe("leitura do mês", () => {
  const base: DadosDaLeitura = {
    comparativo: [
      { competencia: "2026-09", recebido: 100_00, estornos: 50_00, resultado: 50_00 },
      { competencia: "2026-10", recebido: 160_00, estornos: 104_00, resultado: 56_00 },
    ],
    recebido: 160_00,
    estornos: 104_00,
    resultado: 56_00,
    aReceberCentavos: 0,
    mensalidadesVencidas: 0,
  };

  it("FOCO-CA-10: compara com o mês anterior e aponta os estornos", () => {
    expect(leituraDoMes(base)).toEqual([
      "O resultado subiu 12% em relação a setembro.",
      "Houve R$ 104,00 em estornos.",
    ]);
  });

  it("FOCO-CA-10: avisa quando há mensalidades a receber", () => {
    const frases = leituraDoMes({ ...base, aReceberCentavos: 250_00, mensalidadesVencidas: 2 });
    expect(frases.at(-1)).toBe("Há R$ 250,00 a receber, com 2 mensalidades vencidas.");
  });

  it("FOCO-CA-10: diz quando ainda não há nada no mês", () => {
    expect(leituraDoMes({ ...base, recebido: 0, estornos: 0, resultado: 0 })).toEqual([
      "Ainda não entrou nenhuma mensalidade neste mês.",
    ]);
  });

  it("FOCO-CA-10: sem base de comparação, mostra o recebido", () => {
    const frases = leituraDoMes({
      ...base,
      comparativo: [base.comparativo[1]!],
      estornos: 0,
    });
    expect(frases).toEqual(["Já entraram R$ 56,00 de mensalidades neste mês."]);
  });
});
