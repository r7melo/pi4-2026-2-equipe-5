// Fachada de compatibilidade; regras e estado residem nos modulos de dados.
export { MOCK_USUARIOS, obterUsuariosCriados, salvarUsuariosCriados, gerarHashSenhaMock, validarCadastroUsuarioMock, usuarioPersistidoParaMock, buscarUsuarioPorEmailMock, equipeExisteParaUsuarioMock } from "./dados/usuarios";
export type { MockUsuario, UsuarioPersistidoMock } from "./dados/usuarios";
export { MOCK_OBRAS_FIXTURE, obterObrasArmazenadas, salvarObrasArmazenadas, adicionarObraArmazenada, atualizarStatusObraArmazenada } from "./dados/obras";
export { excluirObraArmazenada } from "./dados/operacoesObras";
export { MOCK_EQUIPES_FIXTURE, MOCK_INSTALADORES_DISPONIVEIS, obterEquipesArmazenadas, salvarEquipesArmazenadas, adicionarEquipeArmazenada } from "./dados/equipes";
export type { MockInstalador } from "./dados/equipes";
export { MOCK_PROGRAMACOES_FIXTURE, obterProgramacoesArmazenadas, atualizarProgramacaoDataArmazenada, criarProgramacaoArmazenada, deletarProgramacaoArmazenada, obterCronogramaCompartilhadoFixture } from "./dados/programacoes";
export type { ResultadoReordenacaoMock } from "./dados/programacoes";
export { MOCK_MATERIAIS_FIXTURE, obterMateriaisArmazenados, adicionarMaterialArmazenado } from "./dados/materiais";
export { MOCK_RELATORIOS_FIXTURE, obterRelatorioArmazenado } from "./dados/relatorios";
export { MOCK_HISTORICO_FIXTURE, MOCK_COMENTARIOS_FIXTURE, obterHistoricoArmazenado, adicionarHistoricoArmazenado, obterComentariosArmazenados, adicionarComentarioArmazenado } from "./dados/registros";
export type { HistoricoObra, ComentarioObra } from "./dados/registros";
export { MOCK_HOMOLOGACOES_FIXTURE, obterHomologacaoObraArmazenada } from "./dados/homologacao";
