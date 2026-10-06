import Link from "next/link";
import { connection } from "next/server";
import { Aviso } from "@/components/ui";
import { itensDoMenu } from "@/lib/acesso/areas";
import { exigirUsuario } from "@/lib/servidor/sessao";

const descricoes: Record<string, string> = {
  aulas: "Alunos, turmas e mensalidades",
  horarios: "Reservas das quadras de areia",
  estoque: "Produtos da copa",
  caixa: "Entradas e saídas do dia",
  contabil: "Receitas, despesas e resultado",
  usuarios: "Pessoas com acesso ao sistema",
  auditoria: "Histórico de acessos e alterações",
};

export default async function Inicio({ searchParams }: PageProps<"/">) {
  // Renderização por requisição: o nonce da CSP é aplicado a cada acesso.
  await connection();
  const usuario = await exigirUsuario();
  const { senha } = await searchParams;
  const modulos = itensDoMenu(usuario.areas).filter((item) => item.area !== "inicio");

  return (
    <>
      <header>
        <h1 className="text-3xl font-semibold">Só Dois Toques</h1>
        <p className="mt-2 text-base opacity-80">Olá, {usuario.nome}.</p>
      </header>
      {senha === "trocada" && <Aviso tipo="sucesso">Senha alterada com sucesso.</Aviso>}
      <ul className="grid gap-4 sm:grid-cols-2" aria-label="Módulos do sistema">
        {modulos.map((modulo) => (
          <li key={modulo.area}>
            <Link
              href={modulo.href}
              className="block h-full rounded-lg border border-current/15 p-4 hover:bg-current/5"
            >
              <h2 className="text-lg font-medium">{modulo.rotulo}</h2>
              <p className="text-sm opacity-80">{descricoes[modulo.area]}</p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
