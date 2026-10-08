import logo from "../../../public/marca/logo-96.png";

/** VIS-CA-03: logo do Só Dois Toques com o nome ao lado. */
export function Marca({ comNome = true }: { comNome?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <span className="relative shrink-0">
        <span className="bg-roxo/40 absolute inset-0 rounded-full blur-md" aria-hidden="true" />
        {/* next/image põe estilo embutido (color: transparent), barrado pela CSP. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo.src}
          alt="Só Dois Toques"
          width={44}
          height={44}
          className="ring-roxo/50 relative size-11 rounded-full ring-1"
        />
      </span>
      {comNome && (
        <span className="flex flex-col leading-tight" aria-hidden="true">
          <span className="text-[1.05rem] font-extrabold tracking-tight">Só Dois Toques</span>
          <span className="text-apagado text-[0.7rem] font-semibold tracking-[0.14em] uppercase">
            São Leopoldo
          </span>
        </span>
      )}
    </span>
  );
}
