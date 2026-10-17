import { Cartao, CabecalhoCartao, LinkDoCartao } from "@/components/base/cartao";
import { quantasRespostas } from "@/lib/feedback/painel";

/** FEED-CA-06: no Início do administrador, quantas respostas de feedback ainda não foram lidas. */
export function FeedbackNovo({ naoLidas }: { naoLidas: number }) {
  if (naoLidas === 0) return null;
  return (
    <Cartao aria-labelledby="titulo-feedback-novo" data-testid="feedback-nao-lido">
      <CabecalhoCartao
        id="titulo-feedback-novo"
        icone="feedback"
        tom="ouro"
        titulo={`${quantasRespostas(naoLidas)} de feedback ${naoLidas === 1 ? "não lida" : "não lidas"}`}
        descricao="O que os alunos estão achando das aulas"
        acao={<LinkDoCartao href="/feedback">Ler</LinkDoCartao>}
      />
    </Cartao>
  );
}
