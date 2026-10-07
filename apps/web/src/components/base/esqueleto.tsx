/** Esqueleto com brilho, no formato de uma tela (cabeçalho, números e lista). */
export function EsqueletoTela({ cartoes = 3, linhas = 5 }: { cartoes?: number; linhas?: number }) {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando">
      <div className="flex flex-col gap-3">
        <span className="esqueleto h-3 w-28" />
        <span className="esqueleto h-9 w-72 max-w-full" />
        <span className="esqueleto h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cartoes }, (_, i) => (
          <span key={i} className="esqueleto h-32 rounded-[1.75rem]" />
        ))}
      </div>
      <div className="superficie flex flex-col gap-3 rounded-[1.75rem] p-5">
        {Array.from({ length: linhas }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="esqueleto size-10 shrink-0 rounded-2xl" />
            <span className="flex flex-1 flex-col gap-2">
              <span className="esqueleto h-3.5 w-2/5" />
              <span className="esqueleto h-3 w-1/4" />
            </span>
            <span className="esqueleto h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
