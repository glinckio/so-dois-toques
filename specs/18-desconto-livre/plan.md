# Etapa 18: Plano técnico

- API: `valorDaMensalidade` aceita desconto igual ao plano (devolve 0); a mensagem de recusa muda. A geração já ignora mensalidade de valor 0.
- Web: a ficha do aluno mostra "Isento de mensalidade" quando o valor do plano com desconto é 0.
- Testes: unidade da regra; integração do plano com desconto inteiro e da geração sem mensalidade para o isento.
