import { describe, expect, it } from "vitest";
import { centavosDe } from "@/lib/mensalidades/formatacao";
import { CORES_DE_AVATAR, corDoAvatar, iniciais } from "./avatar";
import { filtrarBusca, itensDaBusca, normalizar } from "./busca";
import { mascararReais, mascararTelefone, posicaoDoCursor } from "./mascaras";
import { leituraDoMes, type DadosDaLeitura } from "./leitura";
import { fatiasDaRosca } from "./rosca";
import { semanaDe } from "./semana";
import { forcaDaSenha } from "./senha";
import { tempoDecorrido } from "./tempo";

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

describe("VIVO-CA-08: tempo do caixa aberto", () => {
  const agora = new Date("2026-10-07T15:00:00Z");
  it("escreve minutos, horas e dias", () => {
    expect(tempoDecorrido("2026-10-07T14:59:40Z", agora)).toBe("menos de 1 min");
    expect(tempoDecorrido("2026-10-07T14:25:00Z", agora)).toBe("35 min");
    expect(tempoDecorrido("2026-10-07T12:46:00Z", agora)).toBe("2 h 14 min");
    expect(tempoDecorrido("2026-10-07T12:00:00Z", agora)).toBe("3 h");
    expect(tempoDecorrido("2026-10-06T12:00:00Z", agora)).toBe("1 dia e 3 h");
    expect(tempoDecorrido("2026-10-05T15:00:00Z", agora)).toBe("2 dias");
  });

  it("não fica negativo se o relógio do aparelho estiver atrasado", () => {
    expect(tempoDecorrido("2026-10-07T16:00:00Z", agora)).toBe("menos de 1 min");
  });
});

describe("VIVO-CA-03: busca rápida", () => {
  it("lista só as áreas e ações do perfil, com as ações primeiro", () => {
    const professor = itensDaBusca(["inicio", "aulas"], false);
    expect(professor.map((i) => i.rotulo)).toEqual(["Início", "Aulas", "Alunos"]);

    const atendente = itensDaBusca(["inicio", "horarios", "estoque", "caixa"], false);
    expect(atendente.filter((i) => i.grupo === "Ações rápidas").map((i) => i.rotulo)).toEqual([
      "Nova reserva",
      "Registrar venda",
      "Registrar compra",
      "Lançar no caixa",
    ]);
    expect(atendente.some((i) => i.area === "contabil")).toBe(false);

    const admin = itensDaBusca(
      ["inicio", "aulas", "horarios", "estoque", "caixa", "contabil", "usuarios", "auditoria"],
      true,
    );
    expect(admin[0]!.rotulo).toBe("Novo aluno");
    expect(admin.filter((i) => i.grupo === "Áreas")).toHaveLength(8);
  });

  it("filtra sem ligar para acento, maiúscula ou ordem das palavras", () => {
    const itens = itensDaBusca(["inicio", "horarios", "estoque", "caixa"], false);
    expect(normalizar("  Horários ")).toBe("horarios");
    expect(filtrarBusca(itens, "horarios").map((i) => i.rotulo)).toContain("Horários");
    expect(filtrarBusca(itens, "venda").map((i) => i.rotulo)).toEqual([
      "Registrar venda",
      "Vendas do dia",
    ]);
    expect(filtrarBusca(itens, "sangria").map((i) => i.rotulo)).toEqual(["Lançar no caixa"]);
    expect(filtrarBusca(itens, "quadra alugar").map((i) => i.rotulo)).toEqual(["Nova reserva"]);
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
      { competencia: "2026-09", receitas: 100_00, despesas: 50_00, resultado: 50_00 },
      { competencia: "2026-10", receitas: 160_00, despesas: 104_00, resultado: 56_00 },
    ],
    receitas: { AULAS: 120_00, LOCACAO: 40_00 },
    nomesDasOrigens: { AULAS: "Aulas (mensalidades)", LOCACAO: "Locação de quadras" },
    totalReceitas: 160_00,
    totalDespesas: 104_00,
    resultado: 56_00,
    aReceberCentavos: 0,
    mensalidadesVencidas: 0,
  };

  it("compara com o mês anterior e aponta a maior receita", () => {
    expect(leituraDoMes(base)).toEqual([
      "O resultado subiu 12% em relação a setembro.",
      "Aulas (mensalidades) responde por 75% da receita.",
    ]);
  });

  it("avisa quando o mês está no vermelho e quando há valores a receber", () => {
    const frases = leituraDoMes({
      ...base,
      resultado: -30_00,
      aReceberCentavos: 250_00,
      mensalidadesVencidas: 2,
    });
    expect(frases[0]).toBe("As despesas passaram as receitas em R$ 30,00 até agora.");
    expect(frases.at(-1)).toBe("Há R$ 250,00 a receber, com 2 mensalidades vencidas.");
  });

  it("diz quando ainda não há nada no mês", () => {
    expect(
      leituraDoMes({
        ...base,
        receitas: { AULAS: 0, LOCACAO: 0 },
        totalReceitas: 0,
        totalDespesas: 0,
        resultado: 0,
      }),
    ).toEqual(["Ainda não há receitas nem despesas lançadas neste mês."]);
  });

  it("sem base de comparação, mostra o resultado; com uma só origem, toda a receita", () => {
    const frases = leituraDoMes({
      ...base,
      comparativo: [base.comparativo[1]!],
      receitas: { AULAS: 160_00, LOCACAO: 0 },
    });
    expect(frases).toEqual([
      "O resultado do mês está em R$ 56,00.",
      "Aulas (mensalidades) responde por toda receita.",
    ]);
  });
});

describe("AJU-CA-02: máscara de telefone", () => {
  it("monta (DD) 00000-0000 enquanto se digita", () => {
    expect(mascararTelefone("")).toBe("");
    expect(mascararTelefone("2")).toBe("(2");
    expect(mascararTelefone("21")).toBe("(21");
    expect(mascararTelefone("219")).toBe("(21) 9");
    expect(mascararTelefone("219987")).toBe("(21) 9987");
    expect(mascararTelefone("2199876")).toBe("(21) 9987-6");
    expect(mascararTelefone("21998765432")).toBe("(21) 99876-5432");
  });

  it("aceita fixo com 10 dígitos, ignora letras e para no 11º dígito", () => {
    expect(mascararTelefone("2134567890")).toBe("(21) 3456-7890");
    expect(mascararTelefone("(21) 9a9876-5432 999")).toBe("(21) 99876-5432");
    expect(mascararTelefone("+55 21 99876-5432")).toBe("(21) 99876-5432");
    expect(mascararTelefone(mascararTelefone("21998765432"))).toBe("(21) 99876-5432");
  });

  it("mantém o cursor depois do mesmo dígito", () => {
    // Digitou "9" logo depois do DDD em "(21) 8765-4321": o cursor fica depois do 9.
    const antes = "(21) 98765-4321";
    const depois = mascararTelefone(antes);
    expect(posicaoDoCursor(antes, 6, depois)).toBe(6);
    expect(posicaoDoCursor("2", 1, "(2")).toBe(2);
  });
});

describe("AJU-CA-03: valor em reais só com números", () => {
  it("preenche a partir dos centavos", () => {
    expect(mascararReais("")).toBe("");
    expect(mascararReais("1")).toBe("0,01");
    expect(mascararReais("12")).toBe("0,12");
    expect(mascararReais("123")).toBe("1,23");
    expect(mascararReais("1234")).toBe("12,34");
    expect(mascararReais("123456")).toBe("1.234,56");
    expect(mascararReais("12345678")).toBe("123.456,78");
  });

  it("ignora letras e sinais e continua do valor já formatado", () => {
    expect(mascararReais("abc")).toBe("");
    expect(mascararReais("1a2-3,4")).toBe("12,34");
    expect(mascararReais("12,345")).toBe("123,45");
    expect(mascararReais("1,2")).toBe("0,12");
    expect(mascararReais("0,00")).toBe("");
    expect(mascararReais("50,00")).toBe("50,00");
  });

  it("dá um texto que o servidor converte para os mesmos centavos", () => {
    for (const digitos of ["1", "99", "5000", "123456", "99999999999"]) {
      expect(centavosDe(mascararReais(digitos))).toBe(Number(digitos));
    }
    expect(mascararReais("1234567890123")).toBe("123.456.789,01");
  });

  it("mantém o cursor contando os dígitos pela direita", () => {
    expect(posicaoDoCursor("12,345", 6, "123,45", true)).toBe(6);
    // Apagou o "2" de "12,34": o cursor fica logo antes do "3" em "1,34".
    expect(posicaoDoCursor("1,34", 1, "1,34", true)).toBe(2);
  });
});
