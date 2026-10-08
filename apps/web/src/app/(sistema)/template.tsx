/** Cada tela entra em cascata, um bloco depois do outro (some com "reduzir movimento"). */
export default function TemplateSistema({ children }: { children: React.ReactNode }) {
  return <div className="cascata flex min-w-0 flex-col gap-6">{children}</div>;
}
