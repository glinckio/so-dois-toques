import type { INestApplication } from "@nestjs/common";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { criarApp } from "./apoio.js";
import { criarAluno, criarLocal, criarTurma, dadosAluno, logado, unico } from "./apoio-aulas.js";

describe("Etapa 2: alunos", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await criarApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it("AULAS-CA-01: administrador cadastra aluno com consentimento registrado", async () => {
    const { api, token, usuario } = await logado(app, "ADMINISTRADOR");
    const dados = dadosAluno({ email: "Aluno@Exemplo.com", observacoes: "Prefere aulas cedo" });
    const criado = await api.post("/alunos", dados, token).expect(201);

    const aluno = await api.get(`/alunos/${criado.body.id}`, token).expect(200);
    expect(aluno.body).toMatchObject({
      nome: dados.nome,
      telefone: "21998765432",
      nascimento: "1990-05-10",
      email: "aluno@exemplo.com",
      emergenciaTelefone: "2134567890",
      consentimentoPor: "ALUNO",
      consentimentoRegistradoPor: usuario.nome,
      ativo: true,
    });
    expect(Date.now() - new Date(aluno.body.consentimentoEm).getTime()).toBeLessThan(60_000);
  });

  it("AULAS-CA-02: sem consentimento o cadastro é recusado", async () => {
    const { api, token } = await logado(app, "ADMINISTRADOR");
    for (const consentimento of [false, undefined]) {
      const resposta = await api.post("/alunos", dadosAluno({ consentimento }), token).expect(400);
      expect(resposta.body.campos).toContainEqual({
        campo: "consentimento",
        mensagem: "Registre o consentimento do aluno (ou do responsável) para salvar o cadastro.",
      });
    }
  });

  it("AULAS-CA-03: menor de 18 anos exige responsável, que dá o consentimento", async () => {
    const { api, token } = await logado(app, "ADMINISTRADOR");
    const nascimento = `${new Date().getFullYear() - 12}-01-15`;
    const semResponsavel = await api.post("/alunos", dadosAluno({ nascimento }), token).expect(400);
    expect(semResponsavel.body.message).toBe(
      "Para menores de 18 anos, informe o nome e o telefone do responsável.",
    );

    const id = await criarAluno(api, token, {
      nascimento,
      responsavelNome: "Pai do Aluno",
      responsavelTelefone: "(11) 91234-5678",
    });
    const aluno = await api.get(`/alunos/${id}`, token).expect(200);
    expect(aluno.body).toMatchObject({
      consentimentoPor: "RESPONSAVEL",
      responsavelTelefone: "11912345678",
    });
  });

  it("AULAS-CA-04: telefone guardado só com dígitos; sem DDD é recusado", async () => {
    const { api, token } = await logado(app, "ADMINISTRADOR");
    const id = await criarAluno(api, token, { telefone: "(21) 99876-5432" });
    const salvo = await prisma.aluno.findUniqueOrThrow({ where: { id } });
    expect(salvo.telefone).toBe("21998765432");

    for (const telefone of ["99876-5432", "123", "(21) 99876-543210"]) {
      const resposta = await api.post("/alunos", dadosAluno({ telefone }), token).expect(400);
      expect(resposta.body.campos[0]).toEqual({
        campo: "telefone",
        mensagem: "Telefone inválido: informe DDD e número.",
      });
    }
  });

  it("AULAS-CA-05: busca por parte do nome sem acento ou por parte do telefone", async () => {
    const { api, token } = await logado(app, "ADMINISTRADOR");
    const marca = unico("Conceição").split(" ")[1]!;
    const id = await criarAluno(api, token, {
      nome: `João Conceição ${marca}`,
      telefone: "(31) 98123-4567",
    });

    const porNome = await api
      .get(`/alunos?busca=${encodeURIComponent(`joao conceicao ${marca}`)}`, token)
      .expect(200);
    expect(porNome.body.itens.map((a: { id: string }) => a.id)).toEqual([id]);

    const porMaiuscula = await api.get(
      `/alunos?busca=${encodeURIComponent(`CONCEIÇÃO ${marca.toUpperCase()}`)}`,
      token,
    );
    expect(porMaiuscula.body.itens.map((a: { id: string }) => a.id)).toEqual([id]);

    const porTelefone = await api
      .get(`/alunos?busca=${encodeURIComponent("98123-4567")}`, token)
      .expect(200);
    expect(porTelefone.body.itens.map((a: { id: string }) => a.id)).toContain(id);
  });

  it("AULAS-CA-06: inativar encerra matrículas e aluno inativo não é matriculado", async () => {
    const { api, token, usuario } = await logado(app, "ADMINISTRADOR");
    const localId = await criarLocal(api, token);
    const turmaId = await criarTurma(api, token, { localId, professorId: usuario.id });
    const alunoId = await criarAluno(api, token);
    await api.post(`/turmas/${turmaId}/matriculas`, { alunoId }, token).expect(201);

    await api.post(`/alunos/${alunoId}/inativar`, {}, token).expect(200);
    expect(await prisma.matricula.count({ where: { alunoId, fim: null } })).toBe(0);
    const recusa = await api.post(`/turmas/${turmaId}/matriculas`, { alunoId }, token).expect(409);
    expect(recusa.body.message).toBe("Aluno inativo não pode ser matriculado.");

    const inativos = await api.get("/alunos?situacao=inativos", token).expect(200);
    expect(inativos.body.itens.map((a: { id: string }) => a.id)).toContain(alunoId);
    await api.post(`/alunos/${alunoId}/reativar`, {}, token).expect(200);
    await api.post(`/turmas/${turmaId}/matriculas`, { alunoId }, token).expect(201);
  });

  it("AULAS-CA-07: exportação em JSON com cadastro, consentimento, matrículas e presenças, auditada", async () => {
    const { api, token, usuario } = await logado(app, "ADMINISTRADOR");
    const localId = await criarLocal(api, token);
    const turmaId = await criarTurma(api, token, { localId, professorId: usuario.id });
    const alunoId = await criarAluno(api, token, { nome: "Exportado da Silva" });
    await api.post(`/turmas/${turmaId}/matriculas`, { alunoId }, token).expect(201);
    const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
      new Date(),
    );
    await api
      .put(
        `/turmas/${turmaId}/presencas/${hoje}`,
        { registros: [{ alunoId, presente: true }] },
        token,
      )
      .expect(200);

    const exportacao = await api.get(`/alunos/${alunoId}/exportacao`, token).expect(200);
    expect(exportacao.body).toMatchObject({
      aluno: { nome: "Exportado da Silva", telefone: "21998765432", situacao: "ativo" },
      consentimento: { dadoPor: "aluno", finalidade: "Organização das aulas" },
      matriculas: [{ inicio: hoje, fim: null }],
      presencas: [{ data: hoje, presente: true }],
    });
    expect(
      await prisma.auditoria.count({ where: { acao: "ALUNO_EXPORTADO", alvoId: alunoId } }),
    ).toBe(1);
  });

  it("AULAS-CA-08: anonimização apaga dados pessoais, encerra matrículas e mantém presenças", async () => {
    const { api, token, usuario } = await logado(app, "ADMINISTRADOR");
    const localId = await criarLocal(api, token);
    const turmaId = await criarTurma(api, token, { localId, professorId: usuario.id });
    const nome = unico("Anônimo Futuro");
    const alunoId = await criarAluno(api, token, { nome, email: "privado@exemplo.com" });
    await api.post(`/turmas/${turmaId}/matriculas`, { alunoId }, token).expect(201);
    const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
      new Date(),
    );
    await api
      .put(
        `/turmas/${turmaId}/presencas/${hoje}`,
        { registros: [{ alunoId, presente: true }] },
        token,
      )
      .expect(200);

    await api.post(`/alunos/${alunoId}/anonimizar`, {}, token).expect(200);
    const aluno = await api.get(`/alunos/${alunoId}`, token).expect(200);
    expect(aluno.body).toMatchObject({
      nome: "Aluno anonimizado",
      telefone: "",
      email: null,
      nascimento: null,
      emergenciaNome: null,
      anonimizado: true,
      ativo: false,
    });
    expect(await prisma.matricula.count({ where: { alunoId, fim: null } })).toBe(0);
    expect(await prisma.presenca.count({ where: { alunoId } })).toBe(1);

    const busca = await api
      .get(`/alunos?busca=${encodeURIComponent(nome)}&situacao=todos`, token)
      .expect(200);
    expect(busca.body.total).toBe(0);
    const auditoria = JSON.stringify(
      (await prisma.auditoria.findMany({ where: { alvoId: alunoId } })).map((r) => ({
        ...r,
        id: String(r.id),
      })),
    );
    expect(auditoria).not.toContain(nome);
    expect(auditoria).not.toContain("privado@exemplo.com");
    expect(auditoria).toContain("ALUNO_ANONIMIZADO");

    // Irreversível: não dá para editar, reativar nem anonimizar de novo.
    await api.patch(`/alunos/${alunoId}`, dadosAluno(), token).expect(409);
    await api.post(`/alunos/${alunoId}/reativar`, {}, token).expect(409);
    await api.post(`/alunos/${alunoId}/anonimizar`, {}, token).expect(409);
  });

  it("AULAS-CA-22: alterar aluno registra só os nomes dos campos na auditoria", async () => {
    const { api, token } = await logado(app, "ADMINISTRADOR");
    const alunoId = await criarAluno(api, token);
    const { consentimento: _, ...dados } = dadosAluno({
      telefone: "(21) 98888-7777",
      nome: "Nome Novo",
    });
    await api.patch(`/alunos/${alunoId}`, dados, token).expect(200);
    const registro = await prisma.auditoria.findFirstOrThrow({
      where: { acao: "ALUNO_ALTERADO", alvoId: alunoId },
    });
    expect(registro.detalhes).toEqual({ campos: ["nome", "telefone"] });
    expect(JSON.stringify(registro.detalhes)).not.toContain("98888");
    expect(await prisma.auditoria.count({ where: { acao: "ALUNO_CRIADO", alvoId: alunoId } })).toBe(
      1,
    );
  });
});
