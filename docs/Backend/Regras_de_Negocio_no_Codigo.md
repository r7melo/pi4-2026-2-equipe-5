# Regras de negócio no código do backend

Este documento liga cada regra de [`docs/Requisitos/04-regras-negocio.md`](../Requisitos/04-regras-negocio.md) ao ponto do backend (`backend/Backend.Api/`) onde ela é aplicada, à rota que a expõe e ao erro devolvido quando a regra é violada. Os códigos de erro seguem a seção 2.1 do [contrato da API](../API/Contrato_API.md).

No código, os comentários citam o identificador da regra (`RN-01`, `RF-07`...) para facilitar a busca: `grep -rn "RN-02" backend/`.

**Situação:** *Implementada* = aplicada e testada contra o banco do seed; *Parcial* = parte da regra depende de rota ou integração ainda não feita; *Pendente* = depende de rota ainda não implementada.

## 1. Catálogo (RN-01 a RN-05)

| Regra | O que o código faz | Onde | Rotas | Erro | Situação |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **RN-01** Duração = painéis ÷ produtividade | Duração em dias = `ceil(quantidade_paineis / 9)`, gravada em `duracao_estimada_dias`. Ex.: 200 painéis = 23 dias (CT-04) | `Gantt.DuracaoEmDias`, `BancoDados.CriarProgramacao` | #23 | — | Implementada (arredondamento para cima até a Q1 ser decidida) |
| **RN-02** Equipe sem duas obras no mesmo período; sábado e domingo não contam | Término calculado em dias úteis, contando o início como primeiro dia; início em fim de semana é recusado; antes de gravar, procura alocação da equipe que cruze o período. O banco também barra pela restrição `ex_programacao_equipe_periodo` | `Gantt.DataFim`, `Gantt.DiaUtil`, `BancoDados.GarantirAgendaLivre` | #20 (`ocupada`), #23, #24 | `409 SCHEDULE_CONFLICT` (mensagem com o período ocupado), `400 VALIDATION_ERROR` | Implementada (feriados fora da conta até a Q2 ser decidida) |
| **RN-03** Toda obra tem cliente | O cadastro exige `clienteId` de cliente existente ou os dados de um cliente novo (nome e CPF/CNPJ válido e único) | `ObrasController.Criar`, `ObrasController.ValidarCliente`, `BancoDados.CriarObra`, `Validacoes.CpfCnpjValido` | #7 | `400 VALIDATION_ERROR`, `404 CLIENTE_NOT_FOUND`, `409 CPF_CNPJ_ALREADY_EXISTS` | Implementada |
| **RN-03** Custo total e DRE só para obra concluída com precificação completa | — | — | #25 a #28 | — | Pendente (rotas financeiras ainda não implementadas) |
| **RN-04** Instalador com login e acesso só às próprias instalações; sem financeiro nem gestão do Kanban | Login com JWT para todos os perfis. O instalador não acessa rotas de gestão, financeiro nem timeline (403 por perfil). Nas rotas de leitura por obra, só vê obras com programação da própria equipe; no cronograma, só a própria equipe | `Perfis`, `Sessao.PodeVerObra`, `BancoDados.ObraProgramadaParaEquipe`, `ProgramacoesController.Listar` | #8, #12, #16, #22 (e o `[Authorize]` de todas as rotas) | `403 ACCESS_DENIED` | Implementada nas rotas existentes; rotas do instalador (#31 a #35) pendentes |
| **RN-05** Timeline e auditoria imutáveis | Nenhuma rota altera ou apaga `historico_obra` ou `audit_log`; o banco recusa UPDATE e DELETE nessas tabelas (trigger `impedir_alteracao_log`) | `database/01_schema.sql`; a API só faz INSERT | #15 | — | Implementada |
| **RN-05** Só o Administrador edita ou exclui comentário geral | `[Authorize(Roles = Administrador)]` nas rotas de edição e exclusão; as duas operações gravam `audit_log` | `ComentariosController.Editar`, `ComentariosController.Excluir`, `BancoDados.EditarComentario`, `BancoDados.ExcluirComentario` | #18, #19 | `403 ACCESS_DENIED`, `404 COMENTARIO_NOT_FOUND` | Implementada |

## 2. Transições de status da obra

| Regra | Onde | Rota | Erro | Situação |
| :---- | :---- | :---- | :---- | :---- |
| Fluxo `MaterialComprado → NoDeposito → Separado → EmAndamento → Concluido`, `EmAndamento/Concluido → Assistencia`, `Assistencia → EmAndamento` | `RegrasBase.Transicoes`, `BancoDados.MoverStatus` | #11 | `400 INVALID_STATUS_TRANSITION` (lista as etapas permitidas) | Implementada |
| Status inexistente | `RegrasBase.StatusObra`, `ObrasController.MoverStatus` | #6, #11 | `400 INVALID_STATUS` (lista os valores aceitos) | Implementada |
| `statusNovo` ausente | `ObrasController.MoverStatus` | #11 | `400 MISSING_STATUS` | Implementada |
| Status igual ao atual é recusado | Nenhum status lista a si mesmo em `RegrasBase.Transicoes` | #11 | `400 INVALID_STATUS_TRANSITION` | Implementada |
| Toda mudança grava `historico_obra` e `audit_log` na mesma transação | `BancoDados.MoverStatus`; a alocação que leva a obra de `Separado` para `EmAndamento` faz o mesmo em `BancoDados.CriarProgramacao` | #11, #23 | — | Implementada |
| Mudança para `Concluido` envia e-mail (RF-13) | `emailNotificacaoEnviado` sempre `false` | #11 | — | Pendente (provedor de e-mail não definido) |
| Duas mudanças simultâneas não avaliam o mesmo status anterior | `SELECT ... FOR UPDATE` em `BancoDados.MoverStatus` e `BancoDados.CriarProgramacao` | #11, #23 | — | Implementada |

## 3. Regras de cálculo do Gantt

| Regra | Onde | Rota | Situação |
| :---- | :---- | :---- | :---- |
| Duração em dias (RN-01) | `Gantt.DuracaoEmDias` | #23 | Implementada |
| Término = início + duração em dias úteis, início conta como primeiro dia | `Gantt.DataFim` | #23, #24 | Implementada |
| Propagação: ao deslocar uma alocação, as seguintes da mesma equipe andam o mesmo número de dias úteis, na ordem de data e prioridade, mantendo os dias úteis que cada uma ocupa | `BancoDados.Reordenar`, `Gantt.DeslocamentoEmDiasUteis`, `Gantt.Deslocar`, `Gantt.DiasUteis` | #24 | Implementada |
| Conflito de período | `BancoDados.GarantirAgendaLivre` (checado para cada alocação deslocada) | #23, #24 | Implementada (`409 SCHEDULE_CONFLICT`) |
| Obra só é alocada se estiver apta (materiais separados) | `BancoDados.StatusAptos` (`Separado`, `EmAndamento`, `Assistencia`) em `CriarProgramacao` | #23 | Implementada (`400 VALIDATION_ERROR` informa o status atual) |
| Alocar atualiza o status e o Kanban (RF-10) | `CriarProgramacao`: obra `Separado` vai para `EmAndamento` | #23 | Parcial (evento em tempo real via SignalR pendente) |
| Horário da tarefa preservado | O modelo de dados guarda só a data (`programacao_obra.data_inicio/data_fim`) | — | Pendente (sem coluna de hora no banco) |

## 4. Matriz de permissões

Toda rota exige token JWT (`app.MapControllers().RequireAuthorization()` em `Program.cs`); só o login tem `[AllowAnonymous]`. O perfil vem do token e é conferido no servidor com `[Authorize(Roles = ...)]`, usando as constantes de `Perfis.cs`. Sem token, com token inválido ou expirado: `401 UNAUTHORIZED`. Perfil sem permissão: `403 ACCESS_DENIED`. As duas negações gravam um registro `AcessoNegado` no `audit_log` com método, rota, perfil e motivo (`Autenticacao.Negar`, `Sessao.AcessoNegado`, `BancoDados.RegistrarAcessoNegado`).

| Rota | Administrador | EngenhariaObras | Financeiro | InstaladorCampo |
| :---- | :---: | :---: | :---: | :---: |
| #2 `GET /auth/me` | ✔ | ✔ | ✔ | ✔ |
| #6 `GET /obras` | ✔ | ✔ | ✔ | |
| #7 `POST /obras` | ✔ | ✔ | | |
| #8 `GET /obras/{id}` | ✔ | ✔ | ✔ | só obra da própria equipe |
| #9 `PUT /obras/{id}` | ✔ | ✔ | | |
| #11 `PATCH /obras/{id}/status` | ✔ | ✔ | | |
| #12 `GET /obras/{id}/materiais` | ✔ | ✔ | ✔ | só obra da própria equipe |
| #13 `POST /obras/{id}/materiais` | ✔ | ✔ | | |
| #15 `GET /obras/{id}/historico` | ✔ | ✔ | ✔ | |
| #16 `GET /obras/{id}/comentarios` | ✔ | ✔ | ✔ | só obra da própria equipe |
| #17 `POST /obras/{id}/comentarios` | ✔ | ✔ | só `Timeline` | |
| #18 / #19 editar e excluir comentário | ✔ | | | |
| #20 `GET /equipes` | ✔ | ✔ | ✔ | ✔ |
| #22 `GET /programacoes` | ✔ | ✔ | ✔ | só a própria equipe |
| #23 / #24 alocar e reordenar | ✔ | ✔ | | |

O perfil `VisualizadorLeitor` existe no banco, mas não tem permissão em nenhuma rota (questão Q4).

## 5. Comentários

| Regra | Onde | Rota | Erro | Situação |
| :---- | :---- | :---- | :---- | :---- |
| Comentário vazio é recusado | `ComentariosController.Criar` e `Editar`; o banco também tem `CHECK (btrim(descricao) <> '')` | #17, #18 | `400 VALIDATION_ERROR` | Implementada |
| Administrador e Engenharia comentam no cartão ou na timeline; Financeiro só na timeline | `ComentariosController.Criar` (sem `tipo`, vale `Cartao`, ou `Timeline` para o Financeiro) | #17 | `403 ACCESS_DENIED` | Implementada |
| Comentário de manutenção é do instalador | `tipo = Manutencao` recusado na rota #17 | #17, #35 | `400 VALIDATION_ERROR` | Implementada na #17; rota #35 pendente |
| Todo comentário guarda autor, data e hora | `BancoDados.CriarComentario` grava `id_usuario` e `data_registro` (UTC) | #16, #17 | — | Implementada |
| Criar comentário registra a ação na timeline | `BancoDados.CriarComentario` insere `historico_obra` com `tipo_acao = Comentario` | #17 | — | Implementada |

## 6. Exclusão, auditoria e login

| Regra | Onde | Rota | Erro | Situação |
| :---- | :---- | :---- | :---- | :---- |
| Obra excluída sai das listagens e consultas | Filtro `excluida_em IS NULL` em `BancoDados.BuscarObra`, `ListarObras` e `ListarProgramacoes` | #6, #8, #22 | `404 OBRA_NOT_FOUND` | Implementada |
| Exclusão lógica; obra em execução não pode ser excluída | — | #10 | — | Pendente (rota #10 não implementada) |
| Mudança de status, exclusão e alteração financeira geram `audit_log` | `BancoDados.Auditar` dentro da transação: mudança de status (#11, #23), edição e exclusão de comentário (#18, #19) | #11, #18, #19, #23 | — | Implementada nas rotas existentes |
| Senha com hash bcrypt; mensagem de login genérica | `AuthController.Login` | #1 | `401 INVALID_CREDENTIALS` | Implementada |
| Cinco falhas consecutivas bloqueiam a conta | `BancoDados.RegistrarFalhaLogin` grava `bloqueado_ate` (15 minutos) e zera a contagem; login válido zera as tentativas (`ZerarTentativasLogin`) | #1 | `423 ACCOUNT_LOCKED` | Implementada |
| Conta inativa não entra | `AuthController.Login` usa a mesma mensagem genérica | #1 | `401 INVALID_CREDENTIALS` | Implementada |
| Token com expiração e perfil | `Autenticacao.GerarToken` (JWT HS256, claims `sub`, `perfil`, `equipeId`; validade em `JWT_EXPIRES_MINUTES`, padrão 480) | #1, todas | `401 UNAUTHORIZED` | Implementada |

## 7. Validações de entrada

Erros de formato chegam antes das regras: corpo ausente ou JSON malformado (`400 INVALID_BODY`), query param inválido (`400 INVALID_PARAMETER`), rota inexistente (`404 ROUTE_NOT_FOUND`), método errado (`405 METHOD_NOT_ALLOWED`) e corpo sem JSON (`415 UNSUPPORTED_MEDIA_TYPE`), tratados em `Program.cs`. As demais validações ficam no início de cada ação do controller e devolvem `400 VALIDATION_ERROR` com a mensagem dizendo o campo e o que corrigir:

| Campo | Regra | Rotas |
| :---- | :---- | :---- |
| `quantidadePaineis` | Obrigatório no cadastro, maior que zero | #7, #9 |
| `quantidadeInversores` | Não negativo | #7, #9 |
| `dataFimEstimada` | Não anterior a `dataInicioEstimada` | #7, #9 |
| `categoria` | `Residencial` ou `Comercial` (modelo de dados) | #7, #9 |
| `endereco` | Obrigatório, até 255 caracteres | #7, #9 |
| `pagamento` | `dataConfirmacao` obrigatória e `prazoContratualDias` maior que zero no cadastro | #7, #9 |
| `cliente.cpfCnpj` | Obrigatório, 11 ou 14 dígitos (aceita máscara) e dígitos verificadores corretos | #7 |
| `cliente.email` | Formato de e-mail, quando informado | #7 |
| `tipo` / `quantidade` / `custoUnitario` de material | Tipo obrigatório; quantidade e custo não negativos; `statusLogistico` da lista (`400 INVALID_STATUS_LOGISTICO`) | #13 |
| `dataInicio` / `novaDataInicio` | Obrigatória e em dia útil | #23, #24 |
| `prioridade` | Maior que zero | #23 |
| `dataInicio` e `dataFim` (filtros) | `dataFim` não anterior a `dataInicio`; na #20, os dois juntos | #20, #22 |

## 8. Questões em aberto que afetam o código

| Questão | Comportamento atual | Onde mudar |
| :---- | :---- | :---- |
| Q1 — arredondamento da duração | Para cima, em dias inteiros (CT-04) | `Gantt.DuracaoEmDias` |
| Q2 — feriados | Só sábado e domingo são descontados | `Gantt.DiaUtil` |
| Q4 — perfil `VisualizadorLeitor` | Sem permissão em nenhuma rota | `Perfis.cs` |
| Tempo de bloqueio do login | 15 minutos (os requisitos não definem) | `BancoDados.TempoDeBloqueio` |
