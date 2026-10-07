import logo from "../../../public/marca/logo-96.png";

/** VIS-CA-03: logo do Só Dois Toques com o nome ao lado. */
export function Marca({ comNome = true }: { comNome?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      {/* next/image põe estilo embutido (color: transparent), barrado pela CSP. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logo.src}
        alt="Só Dois Toques"
        width={40}
        height={40}
        className="shadow-roxo-forte/40 ring-roxo/40 size-10 rounded-full shadow-lg ring-1"
      />
      {comNome && (
        <span className="text-base leading-tight font-bold tracking-tight" aria-hidden="true">
          Só Dois Toques
        </span>
      )}
    </span>
  );
}
