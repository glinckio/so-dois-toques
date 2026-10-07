export function SenhaTemporaria({ senha, email }: { senha: string; email?: string }) {
  return (
    <div
      role="status"
      className="border-ouro/40 bg-ouro/10 flex flex-col gap-1 rounded-md border p-3 text-sm"
    >
      <p>
        Senha temporária{email ? ` de ${email}` : ""}. Ela aparece só agora; repasse com cuidado. No
        primeiro acesso a pessoa vai definir uma senha nova.
      </p>
      <code
        data-testid="senha-temporaria"
        className="text-lg font-semibold tracking-wider select-all"
      >
        {senha}
      </code>
    </div>
  );
}
