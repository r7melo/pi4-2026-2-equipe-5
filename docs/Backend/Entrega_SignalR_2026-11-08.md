# Entrega de Backend 1: SignalR — comparação e validação

Data: 08/11/2026. Branch: `feat/backend-signalr-entrega`.

O backend passa a oferecer o hub autenticado `/hubs/obras`, aceita a negociação com credenciais a partir das origens autorizadas e publica os cinco eventos que o frontend existente já escuta. As gravações continuam nas rotas REST e as notificações não transportam dados ou IDs.

## 1. Escopo e referência da comparação

Esta entrega atende ao pedido de concluir o SignalR e corrigir o erro de CORS apresentado pelo frontend. A padronização de `EngenhariaObras` para `Engenharia` já estava entregue pelo [PR #99](https://github.com/r7melo/pi4-2026-2-equipe-5/pull/99), assim como os itens originais de Backend 1 da Sprint 4. Esses itens foram preservados e submetidos à regressão.

A Sprint 3 foi considerada encerrada, conforme orientação do responsável. Não houve reabertura nem implementação de atividades adicionais dessa sprint. Sua suíte existente foi executada para verificar regressões.

| Referência | Commit | Significado |
| --- | --- | --- |
| Cópia local antes do pull solicitado | `ccab5ff` | Versão que estava na máquina |
| Base atualizada do GitHub | `2fc855f026ed26a89c7bd8db12fad6a2df740594` | Referência para todas as alterações desta entrega |
| Etapa 1 | `40fc7ffeeb2f90d7bc4e715011a2a24f152f42a2` | Hub, CORS, autenticação e testes da conexão |
| Etapa 2 | `aa2afdc2b481d3d21c48c10d559cf8c74cf22f98` | Publicação após persistência e testes da integração |

O `git pull --ff-only origin main` importou cinco commits e 32 arquivos que a equipe já havia publicado. As mudanças de frontend, requisitos e banco trazidas por esse pull pertencem à base recebida, não a esta implementação. A lista está no apêndice. Não houve merge ou cherry-pick da branch antiga `esqueleto-docker`; ela foi consultada como referência para evitar incorporar suas alterações financeiras junto do SignalR.

## 2. Antes e depois

| Aspecto | Antes, na base `2fc855f` | Depois |
| --- | --- | --- |
| Hub | Não registrado nem mapeado; WebSocket retornava 404 | Hub disponível em `/hubs/obras` |
| CORS | `AllowAnyOrigin()`, incompatível com o cliente que usa credenciais | Lista explícita de origens e `AllowCredentials()` |
| JWT no WebSocket | Não havia extração da query usada pelo navegador | `access_token` aceito somente no segmento do hub |
| JWT nas rotas REST | Bearer e validação existente | Mantidos; query não substitui Bearer nas rotas REST |
| Perfis | Perfis e compatibilidade de Engenharia já implementados | Hub usa os quatro perfis canônicos; compatibilidade legada preservada |
| Expiração | Nenhum canal SignalR funcionando | Conexão encerrada quando o JWT expira |
| Origem do WebSocket | Sem hub funcional | Upgrade valida a mesma lista de origens do CORS |
| Atualização em outras sessões | Nenhum evento publicado pelos controllers | Cinco tópicos publicados nas operações existentes |
| Conteúdo das notificações | Não aplicável | Zero argumentos: sem IDs, nomes, comentários, tokens ou valores |
| Falha de envio após salvar | Não aplicável | Falha registrada; resposta REST de sucesso preservada |
| Regras, contratos e persistência | Implementação anterior | Mantidos, com chamadas de notificação após o retorno da DAL |

## 3. Tudo que foi modificado e por quê

São **11 arquivos de código/testes** no comparativo com a base, além deste relatório e de sua transcrição de evidências.

| Arquivo | Alteração e justificativa |
| --- | --- |
| `backend/Backend.Api/Program.cs` | Registra SignalR e o notificador, configura origens com credenciais, valida Origin no WebSocket e mapeia o hub com encerramento por expiração. Resolve a ausência do endpoint e a configuração incompatível com o cliente. |
| `backend/Backend.Api/Autenticacao.cs` | Acrescenta `OnMessageReceived` restrito ao caminho do hub. Permite o transporte de JWT usado por WebSocket/SSE do navegador, sem ampliar a autenticação por query para as rotas REST. A validação e a normalização legada permanecem. |
| `backend/Backend.Api/ObrasHub.cs` — novo | Define o canal autenticado para os quatro perfis autorizados. Não expõe métodos de escrita; as operações continuam nos controllers. |
| `backend/Backend.Api/ObrasNotificador.cs` — novo | Centraliza os cinco sinais sem argumentos e trata exceções de envio. Evita conteúdo sensível no broadcast e evita devolver erro por uma gravação que já terminou. |
| `backend/Backend.Api/Controllers/ObrasController.cs` | Injeta o notificador e aguarda o envio depois de criar, editar, mover status ou registrar material. Métodos passam a ser assíncronos para aguardar a operação de envio; validações, dados retornados e códigos HTTP foram preservados. |
| `backend/Backend.Api/Controllers/ProgramacoesController.cs` | Notifica criação e reordenação após retorno bem-sucedido da DAL. A propagação da agenda permanece na implementação anterior; nenhuma regra de agendamento foi reescrita. |
| `backend/Backend.Api/Controllers/ComentariosController.cs` | Notifica somente a criação, usando o tópico já consumido pelo frontend. Edição e exclusão permanecem como estavam. |
| `tests/executar-signalr.ps1` — novo | Executa build e testes em PostgreSQL/SDK exclusivos. Usa nomes aleatórios, repositório somente leitura e cópia dos fontes dentro do SDK. Remove somente seus recursos. |
| `tests/signalr/Backend.SignalR.Tests.csproj` — novo | Define o executável de testes .NET 8 e o cliente SignalR 8.0.11, usado apenas nos testes. Não foi acrescentado pacote ao projeto da API. |
| `tests/signalr/Program.cs` — novo | Exercita API em processo real, negociações, autenticação, transportes, duas sessões, eventos, persistência, negativas e falhas. Reúne 12 grupos automatizados. |
| `tests/usuarios/Program.cs` | Ajusta apenas o setup de DI e a instanciação de `ProgramacoesController` para fornecer o novo notificador. As assertions e a regra testada foram mantidas. |
| `docs/Backend/Entrega_SignalR_2026-11-08.md` — novo | Registra comparação, justificativas, aprovações, limites e análise geral solicitados. |
| `docs/Backend/evidencias/signalr-2026-11-08.txt` — novo | Preserva transcrição filtrada dos resultados efetivamente executados, sem depender dos arquivos temporários da máquina. |

O SignalR do servidor já faz parte do framework ASP.NET Core utilizado. A única nova dependência NuGet explícita está no projeto de testes.

## 4. Contrato dos eventos

Todos os eventos são sinais sem argumentos. O frontend existente invalida o cache correspondente e volta a consultar as rotas REST, que continuam aplicando suas permissões.

| Operação existente | Evento após persistir | Consumidor existente |
| --- | --- | --- |
| `POST /api/obras` | `ObraAtualizada` | Cache de obras/detalhes |
| `PUT /api/obras/{id}` | `ObraAtualizada` | Cache de obras/detalhes |
| `PATCH /api/obras/{id}/status` | `ObraAtualizada` | Cache de obras/detalhes |
| `POST /api/obras/{id}/materiais` | `MaterialAtualizado` | Cache de materiais |
| `POST /api/obras/{id}/comentarios` | `ComentarioCriado` | Cache de comentários |
| `POST /api/programacoes` | `ProgramacaoCriada` | Cache de programações, equipes e obras |
| `PUT /api/programacoes/{id}/reordenar` | `ProgramacaoAtualizada` | Cache de programações, equipes e obras |

O broadcast pode chegar a um instalador de outra equipe, mas contém somente o nome do evento. Não concede acesso aos dados da operação. O teste com instalador da equipe 7 confirmou 403 para a obra de outra equipe e filtragem da própria agenda.

Não foram acrescentados eventos de edição/exclusão de comentários, pois não há handlers correspondentes no frontend atual. `ComentarioCriado` não foi reutilizado com outro significado. `ProgramacaoExcluida` não é emitido: a rota de exclusão não existe no backend atual e acrescentá-la não fazia parte desta entrega.

## 5. Execução por etapas e aprovações

O agente dev implementou cada etapa e parou. O agente QA revisou o diff e executou os testes independentemente. O coordenador avaliou o parecer e o código antes de liberar a etapa seguinte.

| Etapa | Verificações | Resultado e aprovação |
| --- | --- | --- |
| Base original | Build, 35 grupos de Backend 1 e 44 verificações de integridade em cópia imutável da base | Aprovados; referência anterior preservada |
| Controle negativo | Os 8 grupos novos de infraestrutura executados contra o backend original | 7 falhas e 1 aprovação; saída 1 **esperada**, detectando CORS com `*`, hub ausente e WebSocket 404 |
| 1 — Conexão | Dev e QA executaram separadamente 8 grupos; QA verificou adicionalmente os prefixos da query | Aprovada pelo QA e pelo coordenador antes de iniciar a etapa 2 |
| 2 — Eventos | Dev e QA executaram separadamente 12 grupos SignalR, 35 grupos existentes e 44 verificações de integridade | Aprovada pelo QA e pelo coordenador antes da análise geral |
| 3 — Análise geral | Terceiro agente revisou o diff completo, contrato do frontend e logs finais do QA, sem repetir testes já aprovados | Pacote aprovado na revisão geral; nenhum bloqueio P1/P2 introduzido identificado |

As execuções finais aprovadas tiveram build com **0 avisos e 0 erros** e código de saída 0. O total final é **47 grupos automatizados** (35 existentes + 12 SignalR), além de **44 verificações de integridade**. Grupos agregam cenários; esses números não devem ser apresentados como contagem de testes unitários individuais.

O controle negativo é um experimento contra a versão anterior, não uma falha pendente da versão entregue. Seu único grupo aprovado isoladamente não comprova o funcionamento do hub; os sete grupos positivos que falharam evidenciam a ausência da funcionalidade original.

### Cobertura dos 12 grupos SignalR

1. Preflight com origens explícitas e credenciais, recusando origem externa.
2. Negociação com perfis autorizados e compatibilidade de Engenharia; 401 para token ausente, expirado ou adulterado; 403 para o perfil Leitor sem permissão.
3. JWT pela query no hub e manutenção da exigência de Bearer nas rotas REST.
4. WebSocket real com JWT na query e ausência de método de escrita no hub.
5. Rejeição de Origin externo no upgrade WebSocket.
6. Conexão pelo transporte alternativo long polling.
7. Encerramento da conexão por expiração do JWT.
8. Origem adicional configurada, substituindo a lista padrão no CORS e no WebSocket.
9. Nove mutações HTTP e cinco tópicos recebidos por duas conexões reais, com login real de Engenharia e instalador. Cada recebimento consulta outra conexão PostgreSQL para conferir o commit; inclui reordenação com programação seguinte propagada.
10. Negativas 400, 403, 404 e 409 sem eventos nem alterações nos registros de negócio.
11. Falha PostgreSQL real injetada por trigger no banco descartável, com rollback da criação composta e ausência de evento.
12. Falha de envio simulada por proxy que lança exceção, com persistência PostgreSQL real e manutenção da resposta 201. Não é um teste de interrupção física da rede.

No controle adicional do QA, a query foi aceita em `/hubs/obras` e `/hubs/obras/negotiate`, mas ignorada em `/hubs/obras-malicioso`, `/hubs/obrasmalicioso/negotiate` e `/api/auth/me`.

## 6. Preservação dos arquivos e dos dados da equipe

Comparado à base atualizada, o diff é vazio para frontend, database, DAL, compose, arquivos de ambiente, Dockerfile e projeto da API. Não houve alteração de schema, seed, migration, volume da equipe ou regras de persistência. O vídeo no Drive não foi acessado ou alterado nesta execução.

As árvores Git confirmam igualdade de conteúdo dos diretórios protegidos:

| Diretório | Árvore na base e no commit de código final |
| --- | --- |
| `frontend/` | `56ec7dabf2c143064ae0e8250cd7b5cd69a3c86b` |
| `database/` | `3e0d2fb3705bebf9b35fd1d0d6b0b2b7267084dd` |

Todos os testes usaram containers e bancos novos, com nomes aleatórios. Não foi usado `docker compose up/down`, não foi feito reset e nenhum comando SQL ou requisição de teste foi dirigido aos bancos/aplicações existentes da equipe. O Docker Desktop foi iniciado para viabilizar os testes; os três containers preexistentes que estavam ativos após a inicialização mantiveram os mesmos IDs. O inventário final de volumes foi comparado ao inicial e permaneceu igual.

As rotinas descartáveis foram removidas pelos runners. A igualdade do inventário de volumes é uma verificação de recursos, não uma comparação do conteúdo interno dos bancos; a preservação dos dados existentes também se baseia no isolamento das conexões e na ausência de comandos dirigidos a esses serviços.

## 7. Como repetir a validação

Na raiz do repositório, com Docker Desktop em modo Linux:

```powershell
powershell -NoProfile -File tests/executar-signalr.ps1
powershell -NoProfile -File tests/executar-backend1.ps1
```

Resultado esperado: 12 grupos SignalR, 35 grupos de Backend 1 e 44 verificações de integridade aprovados, builds sem erros e limpeza dos recursos de cada execução. Os runners fornecem o SDK .NET dentro do container; não exigem instalar o SDK no Windows. A primeira execução pode baixar imagens e pacotes.

Não se deve substituir a conexão de testes por banco de desenvolvimento ou compartilhado. O runner específico é o caminho reproduzível para manter o isolamento utilizado nesta entrega.

## 8. Configuração e limites operacionais

- Origens padrão: `http://localhost:3000` e `http://127.0.0.1:3000`.
- Origens adicionais são configuradas em `Cors:AllowedOrigins`, por exemplo por variáveis `Cors__AllowedOrigins__0`, `Cors__AllowedOrigins__1` etc. Informar origem completa, com protocolo e porta, sem caminho ou barra final. A lista configurada substitui a padrão; incluir todas as origens necessárias. Não usar `*` com credenciais.
- A restrição vale para o CORS da API e para o Origin do WebSocket. HTTPS, domínio publicado ou acesso direto pela rede precisam estar na lista adequada ao ambiente.
- O compose existente não foi modificado para repassar essas novas chaves. A configuração de uma origem adicional no container precisa ser fornecida pelo responsável pelo ambiente; ela não passa automaticamente só por existir no `.env` do host.
- Notificações têm entrega em melhor esforço, sem fila durável ou garantia de recebimento quando o cliente está desconectado. A falha de envio é registrada. Não foi acrescentada infraestrutura de mensageria ou backplane.
- A sincronização foi validada no protocolo SignalR e nas rotas REST com clientes reais .NET. Não houve teste visual de React, navegador, nginx, celular ou dispositivo em outra máquina. Compatibilidade dos nomes e invalidações de cache foi verificada pela leitura do frontend, sem editá-lo.
- Edição/exclusão de comentários e exclusão de programação têm os limites de contrato descritos na seção 4. Não houve criação de handlers ou endpoints adicionais.

## 9. Análise geral do repositório e da entrega

### O que está concluído neste recorte

O pedido adicional de SignalR/CORS passa a ter implementação e evidências automatizadas. A troca para Engenharia já estava concluída e continua coberta. O pacote mantém a separação existente: SignalR avisa sobre mudança; a API REST decide o que cada usuário pode ler e escrever.

A parte original de Backend 1 da Sprint 4 permanece no PR #99 e nas issues #94–98: migração de usuários/perfis, hash bcrypt, seed de demonstração e camada de dados. Os testes existentes foram preservados, com ajuste de DI em um setup. O professor exigiu explicitamente testes automatizados para cada regra implementada; por isso os testes fazem parte da entrega e permanecem versionados. Não foi implantado framework novo ou pipeline CI adicional.

### Dependências externas que não foram assumidas

| Área | Situação observada | Consequência para o projeto completo |
| --- | --- | --- |
| Backend 2 | A DAL dispõe de funcionalidades ainda sem endpoints correspondentes, incluindo cadastro de usuário e rotas dedicadas de clientes. Swagger e novas rotas pertencem ao escopo dessa função. | Uma camada de dados pronta não conclui os fluxos HTTP e as telas que dependem dessas rotas. |
| Backend 3 | Autorização das rotas existentes foi preservada. Backup/restauração documentados e testados não foram implementados ou homologados neste pacote. | A aprovação deste SignalR não certifica a entrega dessas atividades. |
| Frontend | Os listeners dos cinco tópicos estão presentes. As telas e os novos fluxos do projeto não foram modificados ou homologados visualmente. | A validação de interface permanece com os responsáveis, incluindo os limites de comentários e rotas inexistentes. |
| Requisitos após 07/11 | A documentação passou a pedir equipes temporais por programação, catálogo de produtos, `EmSolicitacao`, CRUD completo de clientes e isolamento financeiro mais amplo. | O modelo e a API atuais não implementam toda essa revisão. Trata-se de escopo posterior ao recorte solicitado, não de tarefa incluída silenciosamente nesta entrega. |

Parecer do coordenador e do revisor geral independente: o pacote atende ao recorte autorizado de backend, com testes aprovados e sem alterações nos diretórios protegidos. Nenhum bloqueio P1/P2 introduzido foi identificado. Isso não equivale a declarar o sistema completo, todas as telas ou todos os requisitos da equipe concluídos.

O terceiro revisor confirmou a ausência de Swagger no código atual e não encontrou rotina executável/testada de backup e restauração. Também confirmou os pontos pendentes Q9–Q14 na revisão dos requisitos. São observações da análise geral, sem alterações nos arquivos ou responsabilidades dos demais integrantes.

## 10. Referências

- [Entrega anterior de Backend 1 — PR #99](https://github.com/r7melo/pi4-2026-2-equipe-5/pull/99).
- [Contrato e listeners existentes](../../frontend/src/shared/contexts/SignalRContext.tsx).
- [Revisão atual do modelo de dados](../Requisitos/06-modelo-dados.md).
- [Evidências desta execução](evidencias/signalr-2026-11-08.txt).
- [Microsoft: autenticação e autorização no SignalR, ASP.NET Core 8](https://learn.microsoft.com/en-us/aspnet/core/signalr/authn-and-authz?view=aspnetcore-8.0).
- [Microsoft: CORS, ASP.NET Core 8](https://learn.microsoft.com/en-us/aspnet/core/security/cors?view=aspnetcore-8.0).

## Apêndice — arquivos recebidos da equipe no pull

Lista da atualização `ccab5ff..2fc855f`. Estes 32 arquivos foram importados da main e não representam edições feitas pelo pacote SignalR:

```text
README.md
database/03_seed_default.sql
docker-compose.yml
docs/Requisitos/01-visao-negocio.md
docs/Requisitos/02-requisitos.md
docs/Requisitos/03-casos-de-uso.md
docs/Requisitos/04-regras-negocio.md
docs/Requisitos/05-arquitetura.md
docs/Requisitos/06-modelo-dados.md
docs/Requisitos/07-api.md
docs/Requisitos/08-fluxos.md
docs/Requisitos/09-decisoes-arquiteturais.md
docs/Requisitos/10-testes.md
docs/Requisitos/11-rastreabilidade.md
docs/Requisitos/12-riscos.md
docs/Requisitos/13-status.md
docs/Requisitos/diagrams/casos-de-uso.png
docs/Requisitos/diagrams/casos-de-uso.puml
frontend/src/features/kanban/components/AbaMateriais.tsx
frontend/src/features/kanban/components/KanbanBoard.tsx
frontend/src/features/kanban/components/KanbanCard.tsx
frontend/src/features/kanban/components/KanbanCardVisual.tsx
frontend/src/features/kanban/components/KanbanTaskDrawer.tsx
frontend/src/features/kanban/hooks/useKanbanMateriais.ts
frontend/src/features/kanban/hooks/useMateriaisKanbanObras.ts
frontend/src/features/kanban/services/kanbanMateriais.ts
frontend/src/features/kanban/types/gestaoMateriais.ts
frontend/src/features/materiais/types/materiais.ts
frontend/src/shared/api/mock/dados/materiais.ts
frontend/src/shared/api/mock/handlers/materiais.ts
frontend/src/shared/types/materiais.ts
frontend/src/types/index.ts
```
