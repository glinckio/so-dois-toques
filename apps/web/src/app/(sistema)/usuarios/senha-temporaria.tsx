export function SenhaTemporaria({ senha, email }: { senha: string; email?: string }) {
  return (
    <div
      role="status"
      className="flex flex-col gap-1 rounded-md border border-amber-600/40 bg-amber-600/10 p-3 text-sm"
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
