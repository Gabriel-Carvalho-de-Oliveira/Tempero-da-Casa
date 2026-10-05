const CATEGORIAS = ['Marmita', 'Prato', 'Bebida', 'Sobremesa'];
const TIPOS_ENTREGA = ['retirada', 'local', 'delivery'];
const STATUS_PEDIDO = ['Recebido', 'Em preparo', 'Pronto', 'Concluído', 'Cancelado'];
const IMAGENS_CATEGORIA = {
  Marmita: 'https://images.pexels.com/photos/36982101/pexels-photo-36982101.jpeg?auto=compress&cs=tinysrgb&w=900',
  Prato: 'https://images.pexels.com/photos/7837671/pexels-photo-7837671.jpeg?auto=compress&cs=tinysrgb&w=900',
  Bebida: 'https://images.pexels.com/photos/6412588/pexels-photo-6412588.jpeg?auto=compress&cs=tinysrgb&w=900',
  Sobremesa: 'https://images.pexels.com/photos/14665242/pexels-photo-14665242.jpeg?auto=compress&cs=tinysrgb&w=900'
};

function gerarId() {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function validarImagem(caminho, categoria) {
  const imagem = String(caminho || '').trim();
  if (!imagem) return IMAGENS_CATEGORIA[categoria];
  if (/^https:\/\//i.test(imagem)) {
    const url = new URL(imagem);
    if (url.username || url.password) throw new Error('Use um link de imagem sem usuário e senha.');
    return url.href;
  }
  if (/^imagens\//i.test(imagem)) return IMAGENS_CATEGORIA[categoria];
  throw new Error('A imagem deve ser um link HTTPS.');
}

class Produto {
  #id;
  #nome;
  #descricao;
  #precoCentavos;
  #categoria;
  #imagem;

  constructor({ id = gerarId(), nome, descricao, preco, categoria, imagem }) {
    if (typeof id !== 'string' || !id) throw new Error('Produto sem identificação.');
    this.#id = id;
    this.atualizar({ nome, descricao, preco, categoria, imagem });
  }

  get id() { return this.#id; }
  get nome() { return this.#nome; }
  get descricao() { return this.#descricao; }
  get preco() { return this.#precoCentavos / 100; }
  get precoCentavos() { return this.#precoCentavos; }
  get categoria() { return this.#categoria; }
  get imagem() { return this.#imagem; }

  atualizar({ nome, descricao, preco, categoria, imagem }) {
    const nomeLimpo = String(nome || '').trim();
    const descricaoLimpa = String(descricao || '').trim();
    const valor = Number(preco);
    if (nomeLimpo.length < 2 || nomeLimpo.length > 80) throw new Error('O nome deve ter entre 2 e 80 caracteres.');
    if (!descricaoLimpa || descricaoLimpa.length > 250) throw new Error('Informe uma descrição com até 250 caracteres.');
    if (!Number.isFinite(valor) || valor < 0.01 || valor > 9999.99) throw new Error('Informe um preço entre R$ 0,01 e R$ 9.999,99.');
    if (Math.abs(valor * 100 - Math.round(valor * 100)) > 0.000001) throw new Error('Use no máximo duas casas decimais no preço.');
    if (!CATEGORIAS.includes(categoria)) throw new Error('Escolha uma categoria válida.');
    const imagemValida = validarImagem(imagem, categoria);
    this.#nome = nomeLimpo;
    this.#descricao = descricaoLimpa;
    this.#precoCentavos = Math.round(valor * 100);
    this.#categoria = categoria;
    this.#imagem = imagemValida;
  }

  toJSON() {
    return { id: this.id, nome: this.nome, descricao: this.descricao, preco: this.preco, categoria: this.categoria, imagem: this.imagem };
  }
}

class ItemCarrinho {
  #produto;
  #quantidade;

  constructor(produto, quantidade = 1) {
    if (!(produto instanceof Produto)) throw new Error('O item precisa de um produto.');
    this.#produto = produto;
    this.alterarQuantidade(quantidade);
  }

  get produto() { return this.#produto; }
  get quantidade() { return this.#quantidade; }
  get subtotalCentavos() { return this.produto.precoCentavos * this.quantidade; }

  alterarQuantidade(quantidade) {
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 99) throw new Error('A quantidade deve ser de 1 a 99.');
    this.#quantidade = quantidade;
  }

  toJSON() {
    return { produto: this.produto.toJSON(), quantidade: this.quantidade };
  }
}

class Carrinho {
  #itens = new Map();
  #tipoEntrega = 'retirada';

  get itens() { return Array.from(this.#itens.values()); }
  get quantidade() { return this.itens.reduce((soma, item) => soma + item.quantidade, 0); }
  get tipoEntrega() { return this.#tipoEntrega; }
  get subtotalCentavos() { return this.itens.reduce((soma, item) => soma + item.subtotalCentavos, 0); }
  get taxaCentavos() {
    return this.tipoEntrega === 'delivery' && this.itens.some(item => item.produto.categoria === 'Marmita') ? 250 : 0;
  }
  get totalCentavos() { return this.subtotalCentavos + this.taxaCentavos; }

  adicionar(produto) {
    const item = this.#itens.get(produto.id);
    if (item) item.alterarQuantidade(item.quantidade + 1);
    else this.#itens.set(produto.id, new ItemCarrinho(produto));
  }

  alterarQuantidade(id, quantidade) {
    const item = this.#itens.get(id);
    if (!item) throw new Error('Item não encontrado no carrinho.');
    item.alterarQuantidade(quantidade);
  }

  remover(id) { this.#itens.delete(id); }
  limpar() { this.#itens.clear(); }

  definirEntrega(tipo) {
    if (!TIPOS_ENTREGA.includes(tipo)) throw new Error('Escolha uma forma de recebimento válida.');
    this.#tipoEntrega = tipo;
  }
}

class Pedido {
  #dados;

  constructor(dados) {
    if (!dados || !dados.id || !STATUS_PEDIDO.includes(dados.status) || !TIPOS_ENTREGA.includes(dados.tipoEntrega)
      || !Array.isArray(dados.itens) || !dados.itens.length || !dados.cliente
      || !Number.isFinite(Date.parse(dados.data))) throw new Error('Os dados do pedido são inválidos.');
    for (const item of dados.itens) new ItemCarrinho(new Produto(item.produto), item.quantidade);
    const subtotal = dados.itens.reduce((soma, item) => soma + Math.round(item.produto.preco * 100) * item.quantidade, 0);
    const taxa = dados.tipoEntrega === 'delivery' && dados.itens.some(item => item.produto.categoria === 'Marmita') ? 250 : 0;
    if (dados.subtotalCentavos !== subtotal || dados.taxaCentavos !== taxa || dados.totalCentavos !== subtotal + taxa) throw new Error('Os valores do pedido são inválidos.');
    this.#dados = JSON.parse(JSON.stringify(dados));
  }

  static finalizar(cliente, carrinho) {
    const nome = String(cliente.nome || '').trim();
    const telefone = String(cliente.telefone || '').trim();
    const endereco = String(cliente.endereco || '').trim();
    if (nome.length < 2 || nome.length > 80) throw new Error('Informe seu nome com pelo menos 2 caracteres.');
    if (!/^\+?[\d\s().-]+$/.test(telefone) || !/^\d{10,13}$/.test(telefone.replace(/\D/g, ''))) throw new Error('Informe um telefone válido com DDD.');
    if (carrinho.tipoEntrega === 'delivery' && (endereco.length < 5 || endereco.length > 200)) throw new Error('Informe o endereço com rua, número e bairro.');
    if (!carrinho.quantidade) throw new Error('Adicione pelo menos um produto ao carrinho.');
    return new Pedido({
      id: gerarId(), cliente: { nome, telefone, endereco: carrinho.tipoEntrega === 'delivery' ? endereco : '' },
      itens: carrinho.itens.map(item => item.toJSON()), tipoEntrega: carrinho.tipoEntrega,
      status: 'Recebido', data: new Date().toISOString(), subtotalCentavos: carrinho.subtotalCentavos,
      taxaCentavos: carrinho.taxaCentavos, totalCentavos: carrinho.totalCentavos
    });
  }

  get id() { return this.#dados.id; }
  get status() { return this.#dados.status; }

  atualizarStatus(status) {
    if (!STATUS_PEDIDO.includes(status)) throw new Error('Escolha um status válido.');
    this.#dados.status = status;
  }

  toJSON() { return JSON.parse(JSON.stringify(this.#dados)); }
}
