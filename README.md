# Dashboard de análise de vendas

Dashboard interativo desenvolvido para a atividade de Fundamentos de IA e Análise de Dados. A interface apresenta quatro gráficos: faturamento por data, faturamento por produto, canal por avaliação e tempo de espera por avaliação. Todos são recalculados conforme os filtros.

## Como executar

1. Abra o arquivo `public/index.html` no navegador.
2. Para usar outra base, clique em **Importar CSV** e selecione o arquivo no computador.
3. Use os filtros, a pesquisa e os botões de ordenação da tabela.
4. Clique em **Exportar CSV** para salvar as linhas que estão filtradas.

Os dados exibidos na abertura são a base original `vendas_hamburgueria.csv`, com 1.367 registros. As colunas usadas na análise estão incorporadas nos arquivos `public/hamburgueria-dados*.js`, permitindo abrir o HTML diretamente sem depender de `fetch`. O arquivo `public/dados-exemplo.csv` permanece disponível como alternativa didática.

Os títulos e números de maior destaque estão configurados para usar `Last Dream.ttf`, enquanto os textos auxiliares mantêm `DM Sans`. O arquivo da fonte deve ficar em `public/Last Dream.ttf`; ele não foi encontrado nesta cópia do projeto, então o navegador usa a fonte de fallback até que o arquivo seja adicionado.

O dashboard usa Chart.js 4.4.4 e Papa Parse 5.4.3 por CDN. Portanto, é necessário ter acesso à internet para carregar os gráficos e a leitura de CSV. Depois que as bibliotecas carregarem, a leitura do arquivo selecionado ocorre localmente no navegador.

## Colunas esperadas

| Coluna | Descrição |
| --- | --- |
| `id_venda` | Identificador da venda; a contagem de vendas usa IDs únicos. |
| `data` | Data no formato `AAAA-MM-DD`. |
| `produto` | Nome do produto. |
| `categoria` | Grupo do produto. |
| `canal` | Canal da venda, como Delivery ou Balcão. |
| `quantidade` | Número de unidades vendidas. |
| `preco_unitario` | Preço de uma unidade, sem símbolo de moeda. |
| `tempo_espera_min` | Tempo de espera da venda, em minutos. |
| `avaliacao` | Avaliação do cliente, de 0 a 5; valores ausentes ficam fora da média. |

As linhas com ID ou data inválida, produto ou categoria ausente, quantidade inválida ou preço inválido são descartadas. O painel informa a quantidade e o motivo. Valores zero são aceitos e permanecem diferentes de valores ausentes. Linhas duplicadas não são removidas automaticamente, pois cada linha pode representar uma venda distinta; somente a métrica “quantidade de vendas” conta IDs únicos.

O arquivo original `vendas_hamburgueria.csv` foi preservado na raiz. Ele possui 1.367 linhas e colunas adicionais (`dia_semana`, `periodo`, `forma_pagamento`, `canal`, `tempo_espera_min` e `avaliacao`). Como não há lançamento de região, esse campo foi retirado da interface e não é usado nos cálculos. Avaliações ausentes são mantidas como ausentes e não entram na média.

## Fórmulas

- Faturamento da linha = `quantidade × preco_unitario`.
- Faturamento total = soma do faturamento das linhas após os filtros.
- Quantidade de vendas = quantidade de `id_venda` únicos após os filtros.
- Unidades vendidas = soma de `quantidade` após os filtros.
- Ticket médio = faturamento total ÷ quantidade de vendas. Quando não há vendas, o resultado é `R$ 0,00`.

## Publicar no Render como Static Site

1. Envie o projeto para um repositório no GitHub, mantendo `public/` na raiz do repositório.
2. No Render, crie um novo serviço **Static Site** e conecte o repositório.
3. Configure a branch como a branch que contém o projeto.
4. Deixe **Root Directory** vazio.
5. Use `echo "Site pronto"` em **Build Command**.
6. Use `public` em **Publish Directory**.
7. Faça o deploy. O Render publicará o `public/index.html` como página inicial.

## Verificação realizada

A base original foi conferida com 1.367 linhas e a incorporação contém as colunas usadas pelo dashboard, incluindo `canal`, `tempo_espera_min` e `avaliacao`. O cálculo de cada linha, os indicadores, filtros combinados, limpeza dos filtros, pesquisa, ordenação, exportação e estado sem resultados foram implementados no código. A validação visual em navegador real depende da disponibilidade de um navegador nesta execução; recomenda-se abrir o HTML no Chrome ou Firefox e testar as larguras de desktop e celular.
