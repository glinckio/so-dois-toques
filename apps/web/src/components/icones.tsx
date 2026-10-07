import type { ReactNode, SVGProps } from "react";

/** Ícones de traço, 24×24, desenhados para o sistema (sem biblioteca externa). */
const CAMINHOS = {
  inicio: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    </>
  ),
  aulas: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3c2.5 2.5 3.5 5.5 3 9M3.5 9.5c3.5-1 7-.5 10 1.5M5 18c2-3 5.5-5 10.5-5M20.5 14.5c-3 .5-6 2.5-7.5 6" />
    </>
  ),
  horarios: (
    <>
      <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
      <path d="M3 9.5h18M8 3v3M16 3v3M8 14h2M14 14h2M8 17.5h2" />
    </>
  ),
  estoque: (
    <>
      <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" />
      <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" />
    </>
  ),
  caixa: (
    <>
      <rect x="2.5" y="6" width="19" height="13" rx="2.5" />
      <path d="M2.5 10h19" />
      <circle cx="16.5" cy="14.5" r="1.5" />
    </>
  ),
  contabil: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  usuarios: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.5-3.5 3.2-5.5 6.5-5.5s6 2 6.5 5.5" />
      <path d="M16 4.8a3.3 3.3 0 0 1 0 6.4M18.5 14.8c1.7.8 2.8 2.6 3 5.2" />
    </>
  ),
  auditoria: (
    <>
      <path d="M12 3 4.5 6v5.5c0 4.5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-5 7.5-9.5V6z" />
      <path d="m8.8 12 2.2 2.2 4.4-4.4" />
    </>
  ),
  sair: (
    <>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 8 6 12l4 4M6 12h10" />
    </>
  ),
  chave: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 8.5-8.5M16 7l2.5 2.5M18.5 4.5 21 7" />
    </>
  ),
  subir: <path d="M7 17 17 7M9 7h8v8" />,
  descer: <path d="M7 7l10 10M17 9v8H9" />,
  alerta: (
    <>
      <path d="M12 3.5 2.5 20h19z" />
      <path d="M12 10v4.5M12 17.5v.01" />
    </>
  ),
  relogio: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  mais: <path d="M12 5v14M5 12h14" />,
  menos: <path d="M5 12h14" />,
  busca: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  seta: <path d="M5 12h14M13 6l6 6-6 6" />,
  voltar: <path d="M19 12H5M11 6l-6 6 6 6" />,
  "seta-cima-direita": <path d="M7 17 17 7M8 7h9v9" />,
  anterior: <path d="m15 6-6 6 6 6" />,
  proximo: <path d="m9 6 6 6-6 6" />,
  abaixo: <path d="m6 9 6 6 6-6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  fechar: <path d="M6 6l12 12M18 6 6 18" />,
  olho: (
    <>
      <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  "olho-fechado": (
    <>
      <path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-2.6 3.6M6.6 6.6C3.9 8.3 2.5 12 2.5 12S6 19 12 19a9.6 9.6 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  email: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </>
  ),
  cadeado: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2" />
    </>
  ),
  pix: (
    <>
      <path d="m12 2.8 4 4-4 4-4-4z" />
      <path d="m6.8 8 4 4-4 4-4-4zM17.2 8l4 4-4 4-4-4zM12 13.2l4 4-4 4-4-4z" />
    </>
  ),
  dinheiro: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6 9.5v.01M18 14.5v.01" />
    </>
  ),
  cartao: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 9.5h19M6.5 15h4" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M4 20l1.2-3.9A8.5 8.5 0 1 1 8 19z" />
      <path d="M9 9.5c.3 2.6 2.4 4.9 5.3 5.4l.9-1.3-1.7-1-.9.8a4.3 4.3 0 0 1-2-2l.8-.9-.9-1.8z" />
    </>
  ),
  telefone: (
    <path d="M5 3.5h3.5l1.7 4.3-2.3 1.6a11 11 0 0 0 6.7 6.7l1.6-2.3 4.3 1.7V19a2 2 0 0 1-2 2A16.5 16.5 0 0 1 3 5.5a2 2 0 0 1 2-2Z" />
  ),
  local: (
    <>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  pessoa: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c.7-4 3.7-6.5 7.5-6.5s6.8 2.5 7.5 6.5" />
    </>
  ),
  calendario: (
    <>
      <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
      <path d="M3 9.5h18M8 3v3M16 3v3" />
    </>
  ),
  carrinho: (
    <>
      <path d="M3 4h2.2l2.3 11h10.8l2.2-8H6.6" />
      <circle cx="9.5" cy="19.5" r="1.5" />
      <circle cx="17" cy="19.5" r="1.5" />
    </>
  ),
  sacola: (
    <>
      <path d="M5 8h14l-1.2 12.5H6.2z" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </>
  ),
  copiar: (
    <>
      <rect x="8.5" y="8.5" width="12" height="12" rx="2.5" />
      <path d="M15.5 8.5V5.5a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3" />
    </>
  ),
  imprimir: (
    <>
      <path d="M7 9V3.5h10V9M7 17.5H5a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4.5a2 2 0 0 1-2 2h-2" />
      <rect x="7" y="14" width="10" height="7" rx="1" />
    </>
  ),
  estrela: (
    <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" />
  ),
  raio: <path d="M13 2.5 4.5 13.5H12l-1 8 8.5-11H12z" />,
  entrada: (
    <>
      <path d="M12 4v12M7 11l5 5 5-5" />
      <path d="M4 20h16" />
    </>
  ),
  saida: (
    <>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 20h16" />
    </>
  ),
  estorno: (
    <>
      <path d="M4 9h11a5 5 0 0 1 0 10H9" />
      <path d="m8 5-4 4 4 4" />
    </>
  ),
  editar: (
    <>
      <path d="M4 20h4L19.5 8.5a2.8 2.8 0 0 0-4-4L4 16z" />
      <path d="m14 6 4 4" />
    </>
  ),
  lixeira: (
    <>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </>
  ),
  pausa: <path d="M8 5v14M16 5v14" />,
  menu: <path d="M4 7h16M4 12h16M4 17h10" />,
  grade: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </>
  ),
  bloqueio: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m6 6 12 12" />
    </>
  ),
  repetir: (
    <>
      <path d="M4 11V9a4 4 0 0 1 4-4h12M17 2l3 3-3 3" />
      <path d="M20 13v2a4 4 0 0 1-4 4H4M7 22l-3-3 3-3" />
    </>
  ),
  escudo: (
    <path d="M12 3 4.5 6v5.5c0 4.5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-5 7.5-9.5V6z" />
  ),
  lista: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
    </>
  ),
  recibo: (
    <>
      <path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </>
  ),
  porcentagem: (
    <>
      <path d="M19 5 5 19" />
      <circle cx="7" cy="7" r="2.5" />
      <circle cx="17" cy="17" r="2.5" />
    </>
  ),
  areia: (
    <>
      <path d="M3 17c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" />
      <path d="M3 12.5c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" />
      <path d="M12 3v5M9.5 5.5 12 3l2.5 2.5" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type NomeIcone = keyof typeof CAMINHOS;

export function Icone({ nome, ...props }: { nome: NomeIcone } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {CAMINHOS[nome]}
    </svg>
  );
}
