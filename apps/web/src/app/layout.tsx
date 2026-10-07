import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Baixada no build e servida pelo próprio site: o navegador não chama o Google.
const fonte = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--fonte-marca",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Só Dois Toques",
  description: "Gestão de aulas, quadras, estoque e caixa do Só Dois Toques",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#07041a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`h-full antialiased ${fonte.variable}`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
