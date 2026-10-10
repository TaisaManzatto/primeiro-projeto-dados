/* Dashboard de vendas: leitura, validação, filtros, cálculos e visualizações. */
const estado = {
  todasAsLinhas: [], linhasFiltradas: [],
  ordenacao: { coluna: 'data', direcao: 'desc' },
  graficos: {}, fonte: 'demo', descartados: 0, motivoDescarte: ''
};

const el = id => document.getElementById(id);
const moeda = valor => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
const numero = valor => new Intl.NumberFormat('pt-BR').format(valor || 0);
const dataBR = valor => { const [ano, mes, dia] = valor.split('-'); return `${dia}/${mes}/${ano}`; };
const escapeHtml = valor => String(valor ?? '').replace(/[&<>"']/g, caractere => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[caractere]));

// A amostra incorporada é a mesma lógica usada para gerar public/dados-exemplo.csv.
function criarDadosDemonstracao() {
  const produtos = [
    ['X-Bacon', 'Lanche', 29.90], ['X-Salada', 'Lanche', 27.90], ['X-Frango', 'Lanche', 26.50],
    ['Batata frita', 'Acompanhamento', 14.90], ['Onion rings', 'Acompanhamento', 16.90],
    ['Refrigerante', 'Bebida', 6.90], ['Suco natural', 'Bebida', 9.90], ['Milkshake', 'Sobremesa', 16.90]
  ];
  const linhas = [];
  for (let i = 1; i <= 200; i += 1) {
    const produto = produtos[(i * 5 + 2) % produtos.length];
    const mes = ((i - 1) % 12) + 1;
    const dia = ((i * 7) % 26) + 1;
    const data = `2025-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const quantidade = (i % 4) + 1;
    const preco = produto[2] + ((i % 3) * 0.5);
    linhas.push({ id_venda: String(i), data, produto: produto[0], categoria: produto[1], quantidade, preco_unitario: Number(preco.toFixed(2)) });
  }
  return linhas;
}

function dataValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [ano, mes, dia] = valor.split('-').map(Number);
  const data = new Date(ano, mes - 1, dia);
  return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
}

function normalizarLinhas(registros) {
  const linhas = []; let descartados = 0; const motivos = {};
  registros.forEach((registro) => {
    const data = String(registro.data ?? '').trim();
    const id = String(registro.id_venda ?? '').trim();
    const produto = String(registro.produto ?? '').trim();
    const categoria = String(registro.categoria ?? '').trim();
    const canal = String(registro.canal ?? '').trim() || 'Não informado';
    const esperaTexto = String(registro.tempo_espera_min ?? '').trim();
    const avaliacaoTexto = String(registro.avaliacao ?? '').trim();
    const tempoEspera = esperaTexto === '' ? null : Number(esperaTexto.replace(',', '.'));
    const avaliacao = avaliacaoTexto === '' ? null : Number(avaliacaoTexto.replace(',', '.'));
    const quantidadeTexto = String(registro.quantidade ?? '').trim();
    const precoTexto = String(registro.preco_unitario ?? '').trim();
    const quantidade = quantidadeTexto === '' ? Number.NaN : Number(quantidadeTexto.replace(',', '.'));
    const preco = precoTexto === '' ? Number.NaN : Number(precoTexto.replace(',', '.'));
    let motivo = '';
    if (!id || !dataValida(data)) motivo = 'ID ou data inválida';
    else if (!produto || !categoria) motivo = 'produto ou categoria ausente';
    else if (!Number.isFinite(quantidade) || quantidade < 0) motivo = 'quantidade inválida';
    else if (!Number.isFinite(preco) || preco < 0) motivo = 'preço inválido';
    if (motivo) { descartados += 1; motivos[motivo] = (motivos[motivo] || 0) + 1; return; }
    linhas.push({ id_venda: id, data, produto, categoria, canal, quantidade, preco_unitario: preco, tempo_espera_min: Number.isFinite(tempoEspera) && tempoEspera >= 0 ? tempoEspera : null, avaliacao: Number.isFinite(avaliacao) && avaliacao >= 0 && avaliacao <= 5 ? avaliacao : null, faturamento: quantidade * preco });
  });
  const resumo = Object.entries(motivos).map(([motivo, total]) => `${total} por ${motivo}`).join('; ');
  return { linhas, descartados, motivo: resumo };
}

function formatarOrigem(nome, demonstrativo = false) {
  estado.fonte = demonstrativo ? 'demo' : 'arquivo';
  el('sourceLabel').textContent = demonstrativo ? 'Dados demonstrativos' : nome;
  el('noticeTitle').textContent = demonstrativo ? 'Base fictícia para demonstração' : 'Arquivo carregado localmente';
  el('noticeText').textContent = demonstrativo ? 'Os dados iniciais são demonstrativos e podem ser substituídos por um CSV local.' : 'Os dados foram processados no navegador e não saíram do seu dispositivo.';
  el('footerDataInfo').textContent = demonstrativo ? 'Base demonstrativa incorporada' : `Arquivo: ${nome}`;
}

function atualizarOpcoes() {
  const categorias = [...new Set(estado.todasAsLinhas.map(linha => linha.categoria))].sort((a, b) => a.localeCompare(b));
  el('categoryFilter').innerHTML = '<option value="">Todas as categorias</option>' + categorias.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  const datas = estado.todasAsLinhas.map(linha => linha.data).sort();
  el('startDate').min = datas[0] || ''; el('startDate').max = datas.at(-1) || ''; el('endDate').min = datas[0] || ''; el('endDate').max = datas.at(-1) || '';
  el('startDate').value = datas[0] || ''; el('endDate').value = datas.at(-1) || '';
}

function atualizarAvisoValidacao() {
  const partes = [];
  if (estado.descartados) partes.push(`${estado.descartados} registro(s) descartado(s): ${estado.motivoDescarte}`);
  const avaliacaoAusente = estado.todasAsLinhas.filter(linha => linha.avaliacao === null).length;
  if (avaliacaoAusente) partes.push(`${avaliacaoAusente} avaliação(ões) ausente(s), excluída(s) da média`);
  el('validationSummary').textContent = partes.join(' • ');
}

function aplicarFiltros() {
  const inicio = el('startDate').value, fim = el('endDate').value, categoria = el('categoryFilter').value;
  estado.linhasFiltradas = estado.todasAsLinhas.filter((linha) => (!inicio || linha.data >= inicio) && (!fim || linha.data <= fim) && (!categoria || linha.categoria === categoria));
  renderizar();
}

function calcularIndicadores(linhas) {
  const faturamento = linhas.reduce((soma, linha) => soma + linha.faturamento, 0);
  const vendas = new Set(linhas.map(linha => linha.id_venda)).size;
  const unidades = linhas.reduce((soma, linha) => soma + linha.quantidade, 0);
  return { faturamento, vendas, unidades, ticket: vendas ? faturamento / vendas : 0 };
}

function renderizarIndicadores() {
  const resultado = calcularIndicadores(estado.linhasFiltradas);
  el('totalRevenue').textContent = moeda(resultado.faturamento); el('salesCount').textContent = numero(resultado.vendas); el('unitsSold').textContent = numero(resultado.unidades); el('averageTicket').textContent = moeda(resultado.ticket);
  el('recordCount').textContent = `${numero(estado.linhasFiltradas.length)} registro${estado.linhasFiltradas.length === 1 ? '' : 's'} exibido${estado.linhasFiltradas.length === 1 ? '' : 's'}`;
}

function agrupar(linhas, chave) {
  const mapa = new Map(); linhas.forEach(linha => mapa.set(linha[chave], (mapa.get(linha[chave]) || 0) + linha.faturamento));
  return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
}

function renderizarGraficos() {
  const porData = new Map();
  estado.linhasFiltradas.forEach(linha => porData.set(linha.data, (porData.get(linha.data) || 0) + linha.faturamento));
  const datas = [...porData.keys()].sort();
  const abreviarData = valor => { const [ano, mes, dia] = valor.split('-'); return `${dia}/${mes}/${ano.slice(2)}`; };
  const formatarEixoReais = valor => moeda(valor).replace('R$ ', 'R$ ');
  const destruir = id => { if (estado.graficos[id]) estado.graficos[id].destroy(); };
  const opcoesBase = { responsive:true, maintainAspectRatio:false, scales:{ x:{ grid:{ display:false } }, y:{ beginAtZero:true, grid:{ color:'#ece5d8' } } } };

  destruir('dateRevenueChart');
  estado.graficos.dateRevenueChart = new Chart(el('dateRevenueChart'), {
    type:'line',
    data:{ labels:datas.map(abreviarData), datasets:[{ label:'Faturamento', data:datas.map(data => porData.get(data)), borderColor:'#2b0948', backgroundColor:'rgba(43,9,72,.12)', fill:true, tension:.3, pointRadius:2 }] },
    options:{ ...opcoesBase, plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label: contexto => ` ${moeda(contexto.parsed.y)}` } } }, scales:{ ...opcoesBase.scales, y:{ ...opcoesBase.scales.y, ticks:{ callback:formatarEixoReais } } } }
  });

  const produtos = agrupar(estado.linhasFiltradas, 'produto').sort((a, b) => b[1] - a[1]);
  destruir('productRevenueChart');
  estado.graficos.productRevenueChart = new Chart(el('productRevenueChart'), {
    type:'bar',
    data:{ labels:produtos.map(item => item[0]), datasets:[{ label:'Faturamento', data:produtos.map(item => item[1]), backgroundColor:'#ce653b', borderRadius:5, maxBarThickness:34 }] },
    options:{ ...opcoesBase, plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label: contexto => ` ${moeda(contexto.parsed.y)}` } } }, scales:{ ...opcoesBase.scales, y:{ ...opcoesBase.scales.y, ticks:{ callback:formatarEixoReais } } } }
  });

  const canais = new Map();
  estado.linhasFiltradas.forEach(linha => {
    if (linha.avaliacao === null) return;
    const atual = canais.get(linha.canal) || { soma:0, total:0 };
    atual.soma += linha.avaliacao; atual.total += 1; canais.set(linha.canal, atual);
  });
  const canaisOrdenados = [...canais.entries()].map(([canal, valor]) => [canal, valor.soma / valor.total]).sort((a, b) => b[1] - a[1]);
  destruir('channelRatingChart');
  estado.graficos.channelRatingChart = new Chart(el('channelRatingChart'), {
    type:'bar',
    data:{ labels:canaisOrdenados.map(item => item[0]), datasets:[{ label:'Avaliação média', data:canaisOrdenados.map(item => item[1]), backgroundColor:'#ce653b', borderRadius:5, maxBarThickness:55 }] },
    options:{ ...opcoesBase, plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label: contexto => ` Média: ${contexto.parsed.y.toFixed(2)} / 5` } } }, scales:{ ...opcoesBase.scales, y:{ ...opcoesBase.scales.y, min:0, max:5, ticks:{ stepSize:1 } } } }
  });

  const pontos = estado.linhasFiltradas.filter(linha => linha.avaliacao !== null && linha.tempo_espera_min !== null).map(linha => ({ x:linha.avaliacao, y:linha.tempo_espera_min }));
  destruir('waitRatingChart');
  estado.graficos.waitRatingChart = new Chart(el('waitRatingChart'), {
    type:'scatter',
    data:{ datasets:[{ label:'Vendas', data:pontos, backgroundColor:'#12a673', borderColor:'#2b0948', pointRadius:4, pointHoverRadius:6 }] },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label: contexto => ` Avaliação: ${contexto.parsed.x.toFixed(1)} / 5 • Espera: ${contexto.parsed.y.toFixed(1)} min` } } }, scales:{ x:{ min:0, max:5, title:{ display:true, text:'Avaliação (0 a 5)' }, ticks:{ stepSize:1 }, grid:{ color:'#ece5d8' } }, y:{ beginAtZero:true, title:{ display:true, text:'Tempo de espera (min)' }, grid:{ color:'#ece5d8' } } } }
  });
}

function valorOrdenacao(linha, coluna) { if (coluna === 'faturamento') return linha.faturamento; if (['quantidade', 'preco_unitario'].includes(coluna)) return linha[coluna]; return String(linha[coluna] ?? '').toLocaleLowerCase('pt-BR'); }
function linhasParaTabela() {
  const termo = el('tableSearch').value.trim().toLocaleLowerCase('pt-BR');
  const linhas = estado.linhasFiltradas.filter(linha => !termo || Object.values(linha).some(valor => String(valor).toLocaleLowerCase('pt-BR').includes(termo)));
  const { coluna, direcao } = estado.ordenacao; linhas.sort((a, b) => { const va = valorOrdenacao(a, coluna), vb = valorOrdenacao(b, coluna); return (va > vb ? 1 : va < vb ? -1 : 0) * (direcao === 'asc' ? 1 : -1); });
  el('tableInfo').textContent = `${numero(linhas.length)} de ${numero(estado.linhasFiltradas.length)} linhas`;
  return linhas;
}

function renderizarTabela() {
  const linhas = linhasParaTabela(); el('salesTableBody').innerHTML = linhas.map(linha => `<tr><td>${escapeHtml(linha.id_venda)}</td><td>${dataBR(linha.data)}</td><td>${escapeHtml(linha.produto)}</td><td>${escapeHtml(linha.categoria)}</td><td>${numero(linha.quantidade)}</td><td>${moeda(linha.preco_unitario)}</td><td><strong>${moeda(linha.faturamento)}</strong></td></tr>`).join('');
  el('emptyState').hidden = linhas.length > 0;
}
function renderizar() { renderizarIndicadores(); renderizarGraficos(); renderizarTabela(); }

function carregarRegistros(registros, nome, demonstrativo = false) {
  const resultado = normalizarLinhas(registros); estado.todasAsLinhas = resultado.linhas; estado.descartados = resultado.descartados; estado.motivoDescarte = resultado.motivo; formatarOrigem(nome, demonstrativo); atualizarOpcoes(); atualizarAvisoValidacao(); aplicarFiltros();
}

function exportarCsv() {
  const linhas = estado.linhasFiltradas.map(linha => ({ id_venda:linha.id_venda, data:linha.data, produto:linha.produto, categoria:linha.categoria, canal:linha.canal, quantidade:linha.quantidade, preco_unitario:linha.preco_unitario, tempo_espera_min:linha.tempo_espera_min, avaliacao:linha.avaliacao, faturamento:Number(linha.faturamento.toFixed(2)) }));
  const csv = Papa.unparse(linhas); const blob = new Blob(['\ufeff' + csv], { type:'text/csv;charset=utf-8' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'vendas-filtradas.csv'; link.click(); URL.revokeObjectURL(link.href);
}

function inicializar() {
  carregarRegistros(DADOS_HAMBURGUERIA, 'vendas_hamburgueria.csv', false);
  ['startDate', 'endDate', 'categoryFilter'].forEach(id => el(id).addEventListener('change', aplicarFiltros));
  el('clearFilters').addEventListener('click', () => { atualizarOpcoes(); el('tableSearch').value = ''; aplicarFiltros(); });
  el('tableSearch').addEventListener('input', renderizarTabela); el('exportCsv').addEventListener('click', exportarCsv);
  document.querySelectorAll('.sort-button').forEach(botao => botao.addEventListener('click', () => { const coluna = botao.dataset.sort; estado.ordenacao = { coluna, direcao: estado.ordenacao.coluna === coluna && estado.ordenacao.direcao === 'asc' ? 'desc' : 'asc' }; renderizarTabela(); }));
  el('csvFile').addEventListener('change', evento => { const arquivo = evento.target.files[0]; if (!arquivo) return; Papa.parse(arquivo, { header:true, skipEmptyLines:true, encoding:'UTF-8', complete: resultado => { carregarRegistros(resultado.data, arquivo.name); if (resultado.errors.length) { estado.descartados += resultado.errors.length; atualizarAvisoValidacao(); } }, error: erro => { el('validationSummary').textContent = `Não foi possível ler o arquivo: ${erro.message}`; } }); });
}

document.addEventListener('DOMContentLoaded', inicializar);
