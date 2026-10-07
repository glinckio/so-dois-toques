/** Carregando a grade: a faixa de dias, o resumo e as colunas das quadras, com brilho. */
export default function CarregandoGrade() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando">
      <div className="flex flex-col gap-3">
        <span className="esqueleto h-3 w-28" />
        <span className="esqueleto h-9 w-72 max-w-full" />
        <span className="esqueleto h-4 w-48 max-w-full" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="superficie flex flex-col gap-3 rounded-[1.75rem] p-3 sm:p-4">
          <span className="esqueleto h-5 w-32" />
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {Array.from({ length: 7 }, (_, i) => (
              <span key={i} className="esqueleto h-[4.5rem] rounded-2xl" />
            ))}
          </div>
        </div>
        <div className="superficie flex items-center gap-4 rounded-[1.75rem] p-5 sm:p-6">
          <span className="esqueleto size-[5.75rem] shrink-0 rounded-full" />
          <span className="flex flex-1 flex-col gap-2">
            <span className="esqueleto h-3 w-24" />
            <span className="esqueleto h-7 w-40 max-w-full" />
            <span className="esqueleto h-3 w-48 max-w-full" />
          </span>
        </div>
      </div>
      <div className="superficie flex flex-col gap-3 rounded-[1.75rem] p-3 sm:p-5">
        <div className="grid grid-cols-[3rem_repeat(2,minmax(0,1fr))] gap-2">
          <span />
          <span className="esqueleto h-12 rounded-2xl" />
          <span className="esqueleto h-12 rounded-2xl" />
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className="contents">
              <span className="esqueleto h-3 w-9 justify-self-end" />
              <span className={`esqueleto rounded-2xl ${i % 3 === 1 ? "h-28" : "h-12"}`} />
              <span className={`esqueleto rounded-2xl ${i % 2 === 0 ? "h-12" : "h-20"}`} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
