const PRODUTOS_INICIAIS = [
  { id: 'marmita-frango', nome: 'Marmita de frango', descricao: 'Frango grelhado, arroz, feijão e salada fresquinha.', preco: 22, categoria: 'Marmita', imagem: 'https://images.pexels.com/photos/36982101/pexels-photo-36982101.jpeg?auto=compress&cs=tinysrgb&w=900' },
  { id: 'macarrao', nome: 'Macarrão da casa', descricao: 'Massa ao molho de tomate com queijo e manjericão.', preco: 26.90, categoria: 'Prato', imagem: 'https://images.pexels.com/photos/7837671/pexels-photo-7837671.jpeg?auto=compress&cs=tinysrgb&w=900' },
  { id: 'marmita-legumes', nome: 'Marmita de legumes', descricao: 'Arroz, feijão, legumes refogados e salada.', preco: 20, categoria: 'Marmita', imagem: 'https://images.pexels.com/photos/16872037/pexels-photo-16872037.jpeg?auto=compress&cs=tinysrgb&w=900' },
  { id: 'suco', nome: 'Suco de laranja', descricao: 'Suco natural de laranja, servido no copo de 300 ml.', preco: 7.50, categoria: 'Bebida', imagem: 'https://images.pexels.com/photos/6412588/pexels-photo-6412588.jpeg?auto=compress&cs=tinysrgb&w=900' },
  { id: 'pudim', nome: 'Pudim de leite', descricao: 'Uma fatia de pudim de leite com calda de caramelo.', preco: 8, categoria: 'Sobremesa', imagem: 'https://images.pexels.com/photos/14665242/pexels-photo-14665242.jpeg?auto=compress&cs=tinysrgb&w=900' }
];

class Repositorio {
  #produtos = [];
  #pedidos = [];
  #armazenamento;
  #chave = 'tempero-da-casa-v1';
  #aviso = '';
  #bloqueado = false;

  constructor(armazenamento) {
    this.#armazenamento = armazenamento;
    let salvo;
    try { salvo = armazenamento.getItem(this.#chave); }
    catch {
      this.#armazenamento = null;
      this.#aviso = 'O navegador bloqueou o armazenamento. Os dados desta sessão não serão salvos ao fechar a página.';
    }
    if (salvo) {
      try {
        const dados = JSON.parse(salvo);
        if (!Array.isArray(dados.produtos) || !Array.isArray(dados.pedidos)) throw new Error();
        this.#produtos = dados.produtos.map(produto => new Produto(produto));
        this.#pedidos = dados.pedidos.map(pedido => new Pedido(pedido));
        if (new Set(this.#produtos.map(p => p.id)).size !== this.#produtos.length
          || new Set(this.#pedidos.map(p => p.id)).size !== this.#pedidos.length) throw new Error();
      } catch {
        this.#produtos = [];
        this.#pedidos = [];
        this.#bloqueado = true;
        this.#aviso = 'Não foi possível ler os dados salvos. Eles foram preservados. Confira o armazenamento do navegador antes de continuar.';
      }
    } else this.#produtos = PRODUTOS_INICIAIS.map(produto => new Produto(produto));
  }

  get aviso() { return this.#aviso; }
  listarProdutos() { return [...this.#produtos]; }
  listarPedidos() { return [...this.#pedidos].reverse(); }

  buscarProduto(id) {
    const produto = this.#produtos.find(produto => produto.id === id);
    if (!produto) throw new Error('Produto não encontrado.');
    return produto;
  }

  #salvar(produtos, pedidos) {
    if (this.#bloqueado) throw new Error(this.#aviso);
    if (!this.#armazenamento) return;
    try {
      this.#armazenamento.setItem(this.#chave, JSON.stringify({ produtos, pedidos }));
    } catch { throw new Error('Não foi possível salvar. Confira o espaço e a permissão de armazenamento do navegador.'); }
  }

  criarProduto(dados) {
    const produto = new Produto(dados);
    if (this.#produtos.some(p => p.id === produto.id)) throw new Error('Já existe um produto com esse identificador.');
    const produtos = [...this.#produtos, produto];
    this.#salvar(produtos, this.#pedidos);
    this.#produtos = produtos;
    return produto;
  }

  atualizarProduto(id, dados) {
    const produto = this.buscarProduto(id);
    const atualizado = new Produto({ ...dados, id });
    this.#salvar(this.#produtos.map(p => p.id === id ? atualizado : p), this.#pedidos);
    produto.atualizar(atualizado.toJSON());
  }

  excluirProduto(id) {
    this.buscarProduto(id);
    const produtos = this.#produtos.filter(produto => produto.id !== id);
    this.#salvar(produtos, this.#pedidos);
    this.#produtos = produtos;
  }

  criarPedido(pedido) {
    if (!(pedido instanceof Pedido)) throw new Error('Pedido inválido.');
    if (this.#pedidos.some(p => p.id === pedido.id)) throw new Error('Esse pedido já foi registrado.');
    const pedidos = [...this.#pedidos, pedido];
    this.#salvar(this.#produtos, pedidos);
    this.#pedidos = pedidos;
  }

  atualizarPedido(id, status) {
    const pedido = this.#pedidos.find(p => p.id === id);
    if (!pedido) throw new Error('Pedido não encontrado.');
    const atualizado = new Pedido(pedido.toJSON());
    atualizado.atualizarStatus(status);
    this.#salvar(this.#produtos, this.#pedidos.map(p => p.id === id ? atualizado : p));
    pedido.atualizarStatus(status);
  }

  excluirPedido(id) {
    if (!this.#pedidos.some(p => p.id === id)) throw new Error('Pedido não encontrado.');
    const pedidos = this.#pedidos.filter(p => p.id !== id);
    this.#salvar(this.#produtos, pedidos);
    this.#pedidos = pedidos;
  }

}
