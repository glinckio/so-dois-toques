/** Cada tela entra em cascata, um bloco depois do outro (some com "reduzir movimento"). */
export default function TemplateSistema({ children }: { children: React.ReactNode }) {
  return <div className="cascata flex min-h-0 min-w-0 flex-1 flex-col gap-6">{children}</div>;
}
