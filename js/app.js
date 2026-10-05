const moeda = centavos => (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const porId = id => document.getElementById(id);
const carrinho = new Carrinho();
let armazenamento;
try { armazenamento = window.localStorage; } catch { armazenamento = null; }
const repositorio = new Repositorio(armazenamento);
let indiceSlide = 0;
let acaoConfirmada = null;
let temporizadorMensagem;

function elemento(tag, classe = '', texto = '') {
  const no = document.createElement(tag);
  no.className = classe;
  no.textContent = texto;
  return no;
}

function informar(texto, erro = false) {
  clearTimeout(temporizadorMensagem);
  const mensagem = porId('mensagem');
  mensagem.textContent = texto;
  mensagem.classList.toggle('erro', erro);
  mensagem.hidden = false;
  temporizadorMensagem = setTimeout(() => { mensagem.hidden = true; }, erro ? 10000 : 5500);
}

function executar(acao) {
  try { acao(); } catch (erro) { informar(erro.message, true); }
}

function botao(texto, classe, acao, rotulo) {
  const no = elemento('button', classe, texto);
  no.type = 'button';
  if (rotulo) no.setAttribute('aria-label', rotulo);
  no.addEventListener('click', () => executar(acao));
  return no;
}

function imagemProduto(produto, classe = '') {
  const imagem = elemento('img', classe);
  imagem.src = produto.imagem;
  imagem.alt = produto.nome;
  imagem.loading = classe === 'imagem-destaque' ? 'eager' : 'lazy';
  imagem.addEventListener('error', () => { imagem.src = IMAGENS_CATEGORIA[produto.categoria]; }, { once: true });
  return imagem;
}

function confirmar(texto, acao) {
  acaoConfirmada = acao;
  porId('texto-confirmar').textContent = texto;
  porId('dialog-confirmar').showModal();
}

function mudarPagina(pagina) {
  for (const nome of ['cardapio', 'gerenciar']) porId(`pagina-${nome}`).hidden = nome !== pagina;
  document.querySelectorAll('[data-pagina]').forEach(botao => {
    const ativo = botao.dataset.pagina === pagina;
    botao.classList.toggle('ativo', ativo);
    if (ativo) botao.setAttribute('aria-current', 'page');
    else botao.removeAttribute('aria-current');
  });
  if (pagina === 'gerenciar') renderizarGerenciamento();
}

function adicionarProduto(produto) {
  carrinho.adicionar(produto);
  renderizarCarrinho();
  informar(`${produto.nome} adicionado ao carrinho.`);
}

function renderizarSlide() {
  const produtos = repositorio.listarProdutos().filter(produto => ['Marmita', 'Prato'].includes(produto.categoria));
  const container = porId('slide');
  container.replaceChildren();
  porId('slide-anterior').disabled = produtos.length < 2;
  porId('slide-proximo').disabled = produtos.length < 2;
  if (!produtos.length) {
    const texto = elemento('div', 'texto-destaque');
    texto.append(elemento('p', 'sobretitulo', 'TEMPERO DA CASA'), elemento('h2', '', 'O seu próximo pedido está aqui.'), elemento('p', '', 'Confira os produtos disponíveis no cardápio abaixo.'));
    container.append(texto);
    porId('contador-slide').textContent = 'Sem pratos em destaque';
    return;
  }
  indiceSlide = (indiceSlide + produtos.length) % produtos.length;
  const produto = produtos[indiceSlide];
  const texto = elemento('div', 'texto-destaque');
  const rodape = elemento('div', 'acoes-destaque');
  rodape.append(elemento('strong', 'preco-destaque', moeda(produto.precoCentavos)), botao('Adicionar ao pedido +', 'botao claro', () => adicionarProduto(produto), `Adicionar ${produto.nome} ao pedido`));
  texto.append(elemento('p', 'sobretitulo', 'FEITO AQUI, PARA VOCÊ'), elemento('h2', '', produto.nome), elemento('p', 'descricao-destaque', produto.descricao), rodape);
  container.append(texto, imagemProduto(produto, 'imagem-destaque'));
  porId('contador-slide').textContent = `${indiceSlide + 1} de ${produtos.length}`;
}

function renderizarCardapio() {
  const produtos = repositorio.listarProdutos();
  porId('contagem-produtos').textContent = `${produtos.length} ${produtos.length === 1 ? 'opção' : 'opções'}`;
  const lista = porId('lista-produtos');
  lista.replaceChildren();
  if (!produtos.length) lista.append(elemento('p', 'vazio', 'Nenhum produto cadastrado no cardápio.'));
  for (const produto of produtos) {
    const card = elemento('article', 'card-produto');
    const conteudo = elemento('div', 'conteudo-produto');
    const rodape = elemento('div', 'rodape-produto');
    rodape.append(elemento('strong', 'preco', moeda(produto.precoCentavos)), botao('+ Adicionar', 'botao principal pequeno', () => adicionarProduto(produto), `Adicionar ${produto.nome} ao carrinho`));
    conteudo.append(elemento('span', 'categoria', produto.categoria), elemento('h2', '', produto.nome), elemento('p', 'texto-suave', produto.descricao), rodape);
    card.append(imagemProduto(produto), conteudo);
    lista.append(card);
  }
}

function renderizarCarrinho() {
  const lista = porId('itens-carrinho');
  lista.replaceChildren();
  if (!carrinho.quantidade) {
    const vazio = elemento('div', 'carrinho-vazio');
    vazio.append(elemento('span', 'ilustracao-vazio', '+'), elemento('strong', '', 'Seu carrinho está vazio'), elemento('p', 'ajuda', 'Escolha algo gostoso no cardápio para começar.'));
    lista.append(vazio);
  }
  for (const item of carrinho.itens) {
    const linha = elemento('div', 'item-carrinho');
    const dados = elemento('div', 'dados-item');
    dados.append(elemento('strong', '', item.produto.nome), elemento('span', 'texto-suave', `${moeda(item.produto.precoCentavos)} por unidade`));
    const controles = elemento('div', 'controles-item');
    const quantidade = elemento('div', 'controle-quantidade');
    for (const [simbolo, delta, rotulo] of [['−', -1, 'Diminuir'], ['+', 1, 'Aumentar']]) {
      const controle = botao(simbolo, 'quantidade-botao', () => {
        carrinho.alterarQuantidade(item.produto.id, item.quantidade + delta);
        renderizarCarrinho();
        const novo = Array.from(porId('itens-carrinho').querySelectorAll('button[data-produto]')).find(botao => botao.dataset.produto === item.produto.id && botao.dataset.delta === String(delta));
        if (novo && !novo.disabled) novo.focus();
        else Array.from(porId('itens-carrinho').querySelectorAll('button[data-produto]')).find(botao => botao.dataset.produto === item.produto.id && !botao.disabled)?.focus();
        informar(`Quantidade de ${item.produto.nome}: ${item.quantidade}.`);
      }, `${rotulo} quantidade de ${item.produto.nome}`);
      controle.dataset.produto = item.produto.id;
      controle.dataset.delta = delta;
      controle.disabled = delta < 0 ? item.quantidade === 1 : item.quantidade === 99;
      if (delta < 0) quantidade.append(controle, elemento('span', '', String(item.quantidade)));
      else quantidade.append(controle);
    }
    controles.append(quantidade, elemento('strong', '', moeda(item.subtotalCentavos)), botao('Remover', 'botao-texto', () => confirmar(`Remover ${item.produto.nome} do carrinho?`, () => {
      carrinho.remover(item.produto.id);
      renderizarCarrinho();
      porId('titulo-carrinho').setAttribute('tabindex', '-1');
      porId('titulo-carrinho').focus();
      informar('Item removido do carrinho.');
    }), `Remover ${item.produto.nome} do carrinho`));
    linha.append(dados, controles);
    lista.append(linha);
  }
  porId('quantidade-carrinho').textContent = `${carrinho.quantidade} ${carrinho.quantidade === 1 ? 'item' : 'itens'}`;
  porId('subtotal').textContent = moeda(carrinho.subtotalCentavos);
  porId('taxa').textContent = moeda(carrinho.taxaCentavos);
  porId('total').textContent = moeda(carrinho.totalCentavos);
  porId('limpar-carrinho').disabled = !carrinho.quantidade;
  porId('finalizar-pedido').disabled = !carrinho.quantidade;
  const delivery = carrinho.tipoEntrega === 'delivery';
  porId('campo-endereco').hidden = !delivery;
  porId('cliente-endereco').required = delivery;
  porId('aviso-taxa').textContent = delivery
    ? (carrinho.taxaCentavos ? 'Taxa de R$ 2,50 por entrega de marmitas, independentemente da quantidade.' : 'No delivery, a taxa de R$ 2,50 se aplica quando o pedido contém marmita.')
    : 'Retirada e consumo no local não têm taxa.';
}

function abrirFormulario(produto) {
  porId('form-produto').reset();
  porId('produto-id').value = produto?.id || '';
  porId('titulo-produto').textContent = produto ? 'Editar produto' : 'Novo produto';
  if (produto) {
    for (const campo of ['nome', 'descricao', 'preco', 'categoria', 'imagem']) porId(`produto-${campo}`).value = produto[campo];
  }
  porId('dialog-produto').showModal();
  porId('produto-nome').focus();
}

function renderizarGerenciamento() {
  const lista = porId('produtos-gerenciar');
  lista.replaceChildren();
  const produtos = repositorio.listarProdutos();
  if (!produtos.length) lista.append(elemento('p', 'vazio', 'O cardápio está vazio. Cadastre o primeiro produto.'));
  for (const produto of produtos) {
    const linha = elemento('article', 'produto-gerenciar');
    const dados = elemento('div', 'dados-gerenciar');
    dados.append(elemento('span', 'categoria', produto.categoria), elemento('h2', '', produto.nome), elemento('p', 'texto-suave', produto.descricao), elemento('strong', 'preco', moeda(produto.precoCentavos)));
    const acoes = elemento('div', 'acoes-gerenciar');
    acoes.append(botao('Editar', 'botao secundario pequeno', () => abrirFormulario(produto), `Editar ${produto.nome}`), botao('Excluir', 'botao-texto excluir', () => confirmar(`Excluir ${produto.nome} do cardápio? Ele também será removido do carrinho.`, () => {
      repositorio.excluirProduto(produto.id);
      carrinho.remover(produto.id);
      atualizarTelas();
      porId('novo-produto').focus();
      informar('Produto excluído.');
    }), `Excluir ${produto.nome}`));
    linha.append(imagemProduto(produto), dados, acoes);
    lista.append(linha);
  }
}

function atualizarTelas() {
  renderizarSlide();
  renderizarCardapio();
  renderizarCarrinho();
  renderizarGerenciamento();
}

document.querySelectorAll('[data-pagina]').forEach(botao => botao.addEventListener('click', () => mudarPagina(botao.dataset.pagina)));
document.querySelectorAll('[data-fechar]').forEach(botao => botao.addEventListener('click', () => porId(botao.dataset.fechar).close()));
porId('cancelar-acao').addEventListener('click', () => porId('dialog-confirmar').close());
porId('confirmar-acao').addEventListener('click', () => {
  const acao = acaoConfirmada;
  porId('dialog-confirmar').close();
  if (acao) executar(acao);
});
porId('dialog-confirmar').addEventListener('close', () => { acaoConfirmada = null; });
porId('slide-anterior').addEventListener('click', () => { indiceSlide--; renderizarSlide(); });
porId('slide-proximo').addEventListener('click', () => { indiceSlide++; renderizarSlide(); });
porId('novo-produto').addEventListener('click', () => abrirFormulario());
porId('tipo-entrega').addEventListener('change', () => executar(() => { carrinho.definirEntrega(porId('tipo-entrega').value); renderizarCarrinho(); }));
porId('limpar-carrinho').addEventListener('click', () => confirmar('Limpar o carrinho e remover todos os itens?', () => {
  carrinho.limpar(); renderizarCarrinho(); informar('Carrinho limpo.');
}));

porId('form-produto').addEventListener('submit', evento => {
  evento.preventDefault();
  executar(() => {
    const id = porId('produto-id').value;
    const dados = { nome: porId('produto-nome').value, descricao: porId('produto-descricao').value, preco: porId('produto-preco').value, categoria: porId('produto-categoria').value, imagem: porId('produto-imagem').value };
    if (id) repositorio.atualizarProduto(id, dados);
    else repositorio.criarProduto(dados);
    porId('dialog-produto').close();
    atualizarTelas();
    porId('novo-produto').focus();
    informar(id ? 'Produto atualizado. Os valores do carrinho foram recalculados.' : 'Produto cadastrado no cardápio.');
  });
});

porId('form-pedido').addEventListener('submit', evento => {
  evento.preventDefault();
  executar(() => {
    const pedido = Pedido.finalizar({ nome: porId('cliente-nome').value, telefone: porId('cliente-telefone').value, endereco: porId('cliente-endereco').value }, carrinho);
    repositorio.criarPedido(pedido);
    carrinho.limpar();
    carrinho.definirEntrega('retirada');
    porId('form-pedido').reset();
    renderizarCarrinho();
    porId('conteudo').focus();
    informar(`Pedido finalizado! Total: ${moeda(pedido.toJSON().totalCentavos)}.`);
  });
});

if (repositorio.aviso) {
  const aviso = elemento('p', 'aviso-armazenamento', repositorio.aviso);
  aviso.setAttribute('role', 'alert');
  porId('conteudo').prepend(aviso);
}
atualizarTelas();
