import { connection } from "next/server";

const modulos = [
  { nome: "Aulas", descricao: "Alunos, turmas e mensalidades" },
  { nome: "Horários", descricao: "Reservas das quadras de areia" },
  { nome: "Estoque", descricao: "Produtos da copa" },
  { nome: "Contábil", descricao: "Receitas, despesas e resultado" },
];

export default async function Home() {
  // Renderização por requisição: o nonce da CSP é aplicado a cada acesso.
  await connection();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12">
      <header>
        <h1 className="text-3xl font-semibold">Só Dois Toques</h1>
        <p className="mt-2 text-base opacity-80">Sistema de gestão em construção.</p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2" aria-label="Módulos do sistema">
        {modulos.map((modulo) => (
          <li key={modulo.nome} className="rounded-lg border border-current/15 p-4">
            <h2 className="text-lg font-medium">{modulo.nome}</h2>
            <p className="text-sm opacity-80">{modulo.descricao}</p>
            <p className="mt-2 text-xs opacity-60">Em breve</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
