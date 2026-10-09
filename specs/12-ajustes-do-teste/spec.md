# Etapa 12: Ajustes do primeiro teste

**Status:** implementada

## Objetivo

Corrigir os quatro pontos que o dono encontrou ao testar o sistema inteiro (2026-10-09). São ajustes de tela: nenhuma regra da API muda.

## Por quê

No teste, o dono achou o sistema pronto, com quatro detalhes a acertar:

1. Em `/aulas/locais`, o cartão "Cadastrar local" é estreito e corta o texto dos blocos de tipo.
2. Em `/aulas/alunos/novo`, os telefones não têm máscara.
3. Em `/caixa`, o campo de valor aceita qualquer texto; deve ser em reais e só aceitar números.
4. No fechamento do caixa, dinheiro a mais aparece em vermelho, como se fosse problema. Sobrar é bom sinal e deve ficar verde.

## Decisões

- **Telefone:** máscara brasileira `(00) 00000-0000`, que também aceita fixo com 10 dígitos `(00) 0000-0000`. Vale para todos os campos de telefone com a mesma função: aluno, contato de emergência, responsável e cliente da reserva de quadra. Número colado com `+55` perde o código do país.
- **Valor em reais:** só dígitos, preenchido a partir dos centavos, como numa maquininha (digitar 1, 2, 3, 4 mostra `12,34`). Vale para os três valores da tela do Caixa: troco da abertura, lançamento avulso e dinheiro contado no fechamento. O texto enviado continua no formato que o servidor já valida (`1.234,56`).
- **Fechamento:** sobra fica verde, como "bateu"; só a falta fica vermelha. Qualquer diferença continua exigindo observação (regra da etapa 5). O relatório e a lista de turnos seguem a mesma cor.

## Critérios de aceite

- AJU-CA-01: no cadastro de local, os blocos "Quadra parceira" e "Quadra própria" ficam um embaixo do outro quando o cartão é estreito, e cada texto cabe numa linha.
- AJU-CA-02: os campos de telefone formatam o número enquanto se digita, ignoram letras e param no 11º dígito.
- AJU-CA-03: os campos de valor do Caixa só aceitam números, preenchem a partir dos centavos e enviam um valor que o servidor converte nos mesmos centavos.
- AJU-CA-04: no fechamento, contado maior que o esperado aparece em verde; menor, em vermelho.
