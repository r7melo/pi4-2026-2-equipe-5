// Entrada dos repositorios do cenario; regras e estado residem nos modulos de dados.
export { MOCK_USUARIOS, obterUsuariosCriados, salvarUsuariosCriados, gerarHashSenhaMock, validarCadastroUsuarioMock, usuarioPersistidoParaMock, buscarUsuarioPorEmailMock, equipeExisteParaUsuarioMock } from "./dados/usuarios";
export type { MockUsuario, UsuarioPersistidoMock } from "./dados/usuarios";
export { obterObrasArmazenadas, salvarObrasArmazenadas, atualizarStatusObraArmazenada } from "./dados/obras";
export { excluirObraArmazenada } from "./dados/operacoesObras";
export { obterEquipesArmazenadas, salvarEquipesArmazenadas, adicionarEquipeArmazenada } from "./dados/equipes";
export type { MockInstalador } from "./dados/equipes";
export { obterProgramacoesArmazenadas, atualizarProgramacaoDataArmazenada, criarProgramacaoArmazenada, deletarProgramacaoArmazenada } from "./dados/programacoes";
export type { ResultadoReordenacaoMock } from "./dados/programacoes";
export { obterMateriaisArmazenados, adicionarMaterialArmazenado } from "./dados/materiais";
export { obterRelatorioArmazenado } from "./dados/relatorios";
export { obterHistoricoArmazenado, adicionarHistoricoArmazenado, obterComentariosArmazenados, adicionarComentarioArmazenado } from "./dados/registros";
export type { HistoricoObra, ComentarioObra } from "./dados/registros";
export { obterHomologacaoObraArmazenada } from "./dados/homologacao";
