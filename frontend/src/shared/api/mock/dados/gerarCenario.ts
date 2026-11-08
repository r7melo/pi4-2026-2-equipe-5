import type { ObraCard, ObraDetalhe, Programacao, Equipe, Material, HistoricoObra, ComentarioObra, RelatorioCusto, DadosHomologacao } from "@/types";
import type { StatusObra } from "@/shared/constants/kanbanStatus";
import { dataCivilValida, diaUtilCivil, somarDiasCivisUTC, diasUteisCivis } from "@/shared/lib/datasCivis";

/** Gerador puro: datas de negocio dependem apenas da ancora; segredos ficam fora. */
export function gerarDadosCenario(base: string): Record<string, string> {
  if (!dataCivilValida(base)) throw new Error("Data inicial inválida.");
  const dia = (delta: number) => somarDiasCivisUTC(base, delta);
  function util(valor: string, direcao = 1): string {
    while (!diaUtilCivil(valor)) valor = somarDiasCivisUTC(valor, direcao);
    return valor;
  }
  function deslocarUteis(valor: string, quantidade: number): string {
    const passo = quantidade < 0 ? -1 : 1;
    for (let n = 0; n < Math.abs(quantidade); n++) valor = util(somarDiasCivisUTC(valor, passo), passo);
    return valor;
  }
  const clientes = ["Mercado Horizonte", "Residencial Ipês", "Centro Educacional Aurora", "Clínica Bem Viver", "Padaria Boa Massa", "Condomínio Jardim Solar", "Oficina Ponte Nova", "Família Oliveira", "Escritório Alameda", "Loja Casa Clara", "Residencial Serra Azul", "Cooperativa Novo Dia"].map((nome, i) => ({
    id: i + 1, nome, cidade: ["Campinas", "Sorocaba", "Itu", "Jundiaí"][i % 4], endereco: `Rua do Cenário ${i + 1}, ${100 + i * 11}`,
  }));
  const pessoas = [
    { id: 5, nome: "Diego Nascimento", email: "diego.campo@zl.com.br", equipeId: 1 },
    { id: 6, nome: "Beatriz Lima", email: "beatriz.campo@zl.com.br", equipeId: 1 },
    { id: 7, nome: "João Ribeiro", email: "joao.campo@zl.com.br", equipeId: 2 },
    { id: 8, nome: "Camila Alves", email: "camila.campo@zl.com.br", equipeId: 2 },
    { id: 4, nome: "Marcos Instalador", email: "instalador@zl.com.br", equipeId: 3 },
    { id: 9, nome: "Renata Costa", email: "renata.campo@zl.com.br", equipeId: 3 },
    { id: 10, nome: "Pedro Martins", email: "pedro.campo@zl.com.br", equipeId: 4 },
    { id: 11, nome: "Luiza Fernandes", email: "luiza.campo@zl.com.br", equipeId: 4 },
    { id: 12, nome: "Rafael Santos", email: "rafael.campo@zl.com.br", equipeId: 5 },
    { id: 13, nome: "Helena Dias", email: "helena.campo@zl.com.br", equipeId: 5 },
    { id: 14, nome: "Bruno Melo", email: "bruno.campo@zl.com.br", equipeId: 6 },
    { id: 15, nome: "Sofia Rocha", email: "sofia.campo@zl.com.br", equipeId: 6 },
  ];
  const equipes: Equipe[] = Array.from({ length: 6 }, (_, i) => {
    const membros = pessoas.filter(p => p.equipeId === i + 1);
    return { id: i + 1, nome: ["Equipe Horizonte", "Equipe Aurora", "Equipe Ipês", "Equipe Alameda", "Equipe Serra", "Equipe Jardim"][i], especialidade: i % 2 ? "Instalação comercial" : "Instalação residencial", responsavelId: membros[0].id, responsavelNome: membros[0].nome, membros: membros.map(({ id, nome, email }) => ({ id, nome, email })) };
  });
  const senhaHash = "e8d3af75ae4bc94a8632b75fa79d56e600e9efce2b4f1dcdecd4713d29400a47";
  const novos = pessoas.filter(p => p.id !== 4).map(p => Object.assign({}, p, { perfil: "InstaladorCampo", ativo: true, senhaHash }));
  const inativa = { id: 16, nome: "Paula Arquivo", email: "paula.arquivo@zl.com.br", equipeId: null, perfil: "Financeiro", ativo: true, senhaHash };
  const contas = Object.fromEntries([...pessoas.map(p => Object.assign({}, p, { perfil: "InstaladorCampo", ativo: true })), { ...inativa, ativo: false }].map(p => [p.id, p]));
  const gestao = { versao: 1, novos: [...novos, inativa], contas, revisoes: {}, acessos: {}, equipes, equipesRevisao: "0" };
  const estados: StatusObra[] = ["MaterialComprado", "MaterialComprado", "NoDeposito", "Separado", "EmAndamento", "EmAndamento", "Concluido", "Assistencia", "NoDeposito", "MaterialComprado", "Separado", "Concluido", "Concluido", "MaterialComprado", "NoDeposito", "Separado", "EmAndamento", "Concluido", "Assistencia", "MaterialComprado", "NoDeposito", "Separado", "EmAndamento", "Concluido"];
  const valores = [26000, 42000, 31500, 28000, 72000, 38000, 25000, 29500, 46000, 58000, 37000, 18000, 20000, 67000, 32000, 49000, 54000, 22000, 36000, 51000, 27500, 44000, 63000];
  const obras: ObraCard[] = [];
  const detalhes: Record<number, ObraDetalhe> = {};
  const programacoes: Programacao[] = [];
  const materiais: Material[] = [];
  const historico: HistoricoObra[] = [];
  const comentarios: ComentarioObra[] = [];
  const homologacoes: Record<number, DadosHomologacao> = {};
  const relatorios: Record<number, RelatorioCusto> = {};
  const finsConcluidos: Record<number, number> = { 307: 3, 312: 7, 313: 65, 318: 90, 324: 1, 308: 30, 319: 40 };
  const andando: Record<number, number> = { 305: 1, 306: 2, 317: 3, 323: 4 };
  const futuros = new Map<number, string>();
  function alocar(obraId: number, equipeId: number, inicio: string, duracao: number): Programacao {
    const dataInicio = util(inicio);
    const dataFim = deslocarUteis(dataInicio, duracao - 1);
    const item = { id: 601 + programacoes.length, obraId, equipeId, dataInicio, dataFim, prioridade: programacoes.filter(p => p.equipeId === equipeId).length + 1, duracaoEstimadaDias: diasUteisCivis(dataInicio, dataFim) };
    programacoes.push(item); return item;
  }
  for (let i = 0; i < 24; i++) {
    const id = 301 + i, status = estados[i], cliente = clientes[i % clientes.length];
    const quantidadePaineis = 9 * (2 + i % 7), duracao = quantidadePaineis / 9;
    let inicioReal: string | null = null, fimReal: string | null = null;
    let primeira: Programacao | undefined;
    if (finsConcluidos[id]) {
      fimReal = util(dia(-finsConcluidos[id]), -1);
      inicioReal = deslocarUteis(fimReal, -(duracao - 1));
      const equipesUsadas = id === 307 ? [i % 6 + 1, 6] : [i % 6 + 1];
      let conflito = programacoes.find(p => equipesUsadas.includes(p.equipeId) && p.dataInicio <= fimReal! && p.dataFim >= inicioReal!);
      while (conflito) {
        fimReal = deslocarUteis(conflito.dataInicio, -2);
        inicioReal = deslocarUteis(fimReal, -(duracao - 1));
        conflito = programacoes.find(p => equipesUsadas.includes(p.equipeId) && p.dataInicio <= fimReal! && p.dataFim >= inicioReal!);
      }
      primeira = alocar(id, i % 6 + 1, inicioReal, duracao);
      if (id === 307) alocar(id, 6, inicioReal, duracao);
    } else if (andando[id]) {
      inicioReal = deslocarUteis(util(base, -1), -2);
      primeira = alocar(id, andando[id], inicioReal, duracao);
    } else if (status !== "MaterialComprado" || id === 302 || id === 310) {
      const equipeId = i % 6 + 1;
      const inicio = futuros.get(equipeId) ?? util(dia(14));
      primeira = alocar(id, equipeId, inicio, duracao);
      futuros.set(equipeId, deslocarUteis(primeira.dataFim, 3));
    }
    const estimadoInicio = id === 301 ? util(dia(-40)) : inicioReal ? somarDiasCivisUTC(inicioReal, -10) : primeira?.dataInicio ?? util(dia(21 + i));
    const estimadoFim = [305, 306, 317, 323, 301].includes(id) ? dia(-2 - i % 3) : primeira?.dataFim ?? dia(40 + i);
    const valorTotal = valores[i];
    const parcial = id === 301;
    const observacoes = parcial ? undefined : `Acesso combinado com ${cliente.nome}. Instalar proteção antes do comissionamento.`;
    const pagamentoEm = somarDiasCivisUTC(inicioReal ?? (estimadoInicio < base ? estimadoInicio : util(dia(-12))), -20);
    const prazoContratualDias = Math.max(1, Math.round((Date.parse(estimadoFim) - Date.parse(pagamentoEm)) / 86400000));
    const obra: ObraCard = { id, clienteNome: cliente.nome, nome: `Instalação ${cliente.nome} ${i < 12 ? "Cobertura" : "Ampliação"}`, status, categoria: i % 2 ? "Comercial" : "Residencial", cidade: cliente.cidade, uf: "SP", quantidadePaineis, dataFimEstimada: estimadoFim, ...(fimReal ? { dataFimReal: fimReal } : {}), ...(valorTotal !== undefined ? { valorTotal } : {}), atualizadoPor: "Ana Souza", prazoContratualDias, ...(parcial ? {} : { endereco: cliente.endereco, observacoes }) };
    obras.push(obra);
    detalhes[id] = { id, status, cliente: { id: cliente.id, nome: cliente.nome, cidade: cliente.cidade }, pagamento: { id: 1000 + id, prazoContratualDias, dataConfirmacao: pagamentoEm }, dataInicioEstimada: estimadoInicio, dataFimEstimada: estimadoFim, dataInicioReal: inicioReal, dataFimReal: fimReal, categoria: obra.categoria, quantidadePaineis, quantidadeInversores: 1 + i % 3, ...(parcial ? {} : { endereco: cliente.endereco, descricao: observacoes }), ...(valorTotal !== undefined ? { valorTotal } : {}) };
    if (!parcial) {
      const statusLogistico = ["EmAndamento", "Concluido", "Assistencia"].includes(status) ? "Utilizado" : status === "MaterialComprado" ? (i % 3 ? "EmTransito" : "Comprado") : "Disponivel";
      const itens = [{ descricao: "Módulo fotovoltaico 550 W", quantidade: quantidadePaineis, unidade: "un" }, { descricao: "Inversor fotovoltaico", quantidade: 1 + i % 3, unidade: "un" }, { descricao: "Cabo solar 6 mm", quantidade: 40 + i * 10, unidade: "m" }];
      itens.forEach(item => materiais.push({ id: 501 + materiais.length, obraId: id, ...item, statusLogistico }));
    }
    const caminho: StatusObra[] = ["MaterialComprado", "NoDeposito", "Separado", "EmAndamento", "Concluido", "Assistencia"];
    const ultima = caminho.indexOf(status);
    const ultimoDia = status === "Assistencia" ? dia(-2) : fimReal ?? inicioReal ?? dia(-1);
    for (let etapa = 0; etapa <= ultima; etapa++) {
      const dataAlteracao = etapa === 3 && inicioReal ? inicioReal : etapa === 4 && fimReal ? fimReal : etapa === ultima ? ultimoDia : somarDiasCivisUTC(pagamentoEm, etapa + 1);
      historico.push({ id: 9001 + historico.length, obraId: id, statusAnterior: etapa === 0 ? "Criado" : caminho[etapa - 1], statusNovo: caminho[etapa], dataAlteracao: dataAlteracao + "T09:00:00Z", usuario: { id: 2, nome: "Ana Souza" }, observacao: etapa === ultima ? "Etapa registrada no cenário de demonstração." : "Avanço da instalação." });
    }
    if (i % 4 !== 0) comentarios.push({ id: 701 + comentarios.length, obraId: id, descricao: i % 2 ? "Acesso e local de descarga confirmados com o cliente." : "Conferir fixação e proteção durante a visita técnica.", dataRegistro: somarDiasCivisUTC(ultimoDia, -1) + "T14:00:00Z", usuario: { id: 2, nome: "Ana Souza" } });
    homologacoes[id] = { obraId: id, parecerAcesso: ["Concluido", "Assistencia", "EmAndamento"].includes(status) ? "Aprovado" : i % 2 ? "Pendente" : "EmAnalise", artTrt: parcial ? undefined : `ART-DEMO-${id}` };
    if (status === "Concluido" && valorTotal !== undefined) {
      const itens = [{ descricao: "Equipamentos e instalação", valor: 17000 }, { descricao: "Projeto e comissionamento", valor: 3000 }];
      relatorios[id] = { obraId: id, receita: valorTotal, custoTotal: 20000, lucro: valorTotal - 20000, itens };
    }
  }
  // Programacoes historicas e futuras recebem prioridades cronologicas por equipe.
  equipes.forEach(e => programacoes.filter(p => p.equipeId === e.id).sort((a, b) => a.dataInicio.localeCompare(b.dataInicio)).forEach((p, i) => { p.prioridade = i + 1; }));
  const dados: Record<string, unknown> = {
    mock_obras_v3: obras, mock_detalhes_v1: detalhes, mock_clientes_v1: clientes,
    mock_programacoes_v4: programacoes, mock_materiais: materiais, mock_historico: historico,
    mock_comentarios: comentarios, mock_homologacoes_v1: homologacoes, mock_relatorios_v1: relatorios,
    mock_gestao_usuarios_v1: gestao,
    mock_links_cronograma_v1: [], mock_seguranca_senhas_v1: { versao: 1, contas: {}, links: {} },
    mock_links_relatorios_v1: {}, mock_tentativas_v1: {}, mock_excluidas_v1: {},
  };
  return Object.fromEntries(Object.entries(dados).map(([chave, valor]) => [chave, JSON.stringify(valor)]));
}
