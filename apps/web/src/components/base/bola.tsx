/**
 * A bola de vôlei do logo, em SVG. Gira enquanto algo é enviado, flutua com brilho
 * nos destaques e aparece nas telas vazias. Desenho sem ids nem estilo embutido (CSP).
 */
export function Bola({
  tamanho = 24,
  className = "",
  rotulo,
}: {
  tamanho?: number;
  className?: string;
  /** Sem rótulo, a bola é só decoração e o leitor de tela ignora. */
  rotulo?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={tamanho}
      height={tamanho}
      className={className}
      role={rotulo ? "img" : undefined}
      aria-label={rotulo}
      aria-hidden={rotulo ? undefined : true}
      focusable="false"
    >
      <circle cx="32" cy="32" r="29" fill="#8b5cf6" />
      <circle cx="40" cy="40" r="24" fill="#4c1d95" opacity="0.55" />
      <circle cx="32" cy="32" r="29" fill="none" stroke="#cdb2ff" strokeOpacity="0.5" strokeWidth="1.5" />
      <circle cx="22" cy="19" r="11" fill="#ffffff" opacity="0.16" />
      <g fill="none" stroke="#f4f2ff" strokeWidth="2.4" strokeLinecap="round" strokeOpacity="0.92">
        <path d="M32 3.5C23 13 21.5 25 32 32" />
        <path d="M32 32c9.5 5 20.5 3.5 28-5" />
        <path d="M32 32c-2 10.5-9.5 20-21 22.5" />
        <path d="M44.5 6.5C35 14 31 23 32 32" strokeOpacity="0.55" />
        <path d="M60.5 38C51 41 40 39 32 32" strokeOpacity="0.55" />
        <path d="M6 44c9-1 19.5-5 26-12" strokeOpacity="0.55" />
      </g>
    </svg>
  );
}

/** Bola girando, para botões que estão enviando. */
export function Carregando({ tamanho = 18 }: { tamanho?: number }) {
  return <Bola tamanho={tamanho} className="animate-girar shrink-0" />;
}

/** A bola grande, flutuando sobre um brilho roxo (login, leitura do mês, vazio). */
export function BolaBrilhante({ tamanho = 96, className = "" }: { tamanho?: number; className?: string }) {
  return (
    <span
      className={`inline-grid place-items-center ${/\b(absolute|fixed)\b/.test(className) ? "" : "relative"} ${className}`}
      aria-hidden="true"
    >
      <span className="bg-roxo/40 absolute inset-[-30%] rounded-full blur-2xl" />
      <span className="bg-ouro/20 absolute inset-[10%] translate-x-1/4 translate-y-1/4 rounded-full blur-xl" />
      <Bola tamanho={tamanho} className="animate-flutuar relative drop-shadow-[0_12px_24px_rgb(124_58_237_/_0.6)]" />
    </span>
  );
}
