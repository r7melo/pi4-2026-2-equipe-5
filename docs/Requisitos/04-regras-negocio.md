# Regras de Negócio

## 1. Catálogo

| ID | Tipo | Regra | Requisitos | Casos de uso |
| :---- | :---- | :---- | :---- | :---- |
| RN-01 | Derivação | Duração estimada = quantidade de painéis ÷ produtividade (padrão 9 por dia), arredondada conforme a regra vigente (questão Q1) | RF-08 | UC-22 |
| RN-02 | Restrição | Um instalador não pode estar em duas equipes no mesmo período (considerando as datas de entrada e saída de cada integrante). Sábados e domingos não contam como dias úteis. Feriados conforme Q2 | RF-07, RF-09 | UC-13, UC-21, UC-22 |
| RN-03 | Restrição | Toda obra tem cliente. Custo total e DRE só são apurados para obras concluídas com precificação completa | RF-03, RF-14, RF-20 | UC-08, UC-10, UC-32, UC-33 |
| RN-04 | Restrição | Instalador é usuário com login. Acesso restrito às obras cujas equipes integra ou integrou: instalação, rota, manutenção e comentários. Sem acesso a valores, DRE ou gestão do Kanban | RF-01, RF-02, RF-19 | UC-01, UC-03, UC-14, UC-24, UC-25, UC-26 |
| RN-05 | Restrição | Registros da timeline e logs de auditoria são imutáveis. Edição e exclusão de comentários gerais da timeline são restritas ao Administrador | RF-11, RF-12 | UC-20, UC-29, UC-30 |
| RN-06 | Restrição | Autenticação JWT: 5 falhas consecutivas bloqueiam a conta por 15 minutos. Token válido por 480 minutos (configurável por JWT_EXPIRES_MINUTES). Conta inativa retorna credenciais inválidas sem incrementar tentativas. Toda negação (401/403) grava em audit_log. Política de senha, redefinição por link e invalidação de tokens em RN-06.14 a RN-06.18 | RF-01, RF-02, RF-21, RF-22 | UC-01, UC-02, UC-03, UC-04, UC-35, UC-36, UC-37, UC-38 |
| RN-07 | Restrição | Valores (preços de produtos, custos, valor da obra, custo total e DRE) são visíveis só a Administrador e Financeiro, somente no módulo financeiro. Respostas de API para Engenharia e Instalador não contêm campos de valor | RF-02, RF-14, RF-25, RF-26 | UC-10, UC-31, UC-32, UC-33, UC-39, UC-40 |
| RN-08 | Restrição | Material só pode ser incluído a partir de produto cadastrado e ativo. Nasce em `EmSolicitacao`. O status avança na ordem da seção 2.1, e só Administrador e Financeiro o alteram | RF-06, RF-25 | UC-40, UC-41 |
| RN-09 | Restrição | Equipe é temporal e pertence a uma programação do Gantt (1:1); não há cadastro fixo de equipes. Integrantes são instaladores de campo ativos, com data de entrada e saída dentro do período da programação. A programação exige pessoas previstas maior que zero; integrantes podem ser incluídos depois, e equipe incompleta é destacada | RF-07 | UC-21, UC-22 |
| RN-10 | Derivação | Esforço da equipe (pessoa-dia) = soma, por integrante, dos dias úteis entre entrada e saída. Pessoas faltantes = pessoas previstas − integrantes ativos no dia. Ocupação do instalador = dias úteis em equipes ÷ dias úteis do período consultado | RF-07 | UC-21, UC-22, UC-28 |

## 2. Transições de status da obra

Fluxo do funil:

```
MaterialComprado → NoDeposito → Separado → EmAndamento → Concluido
EmAndamento → Assistencia
Concluido → Assistencia
Assistencia → EmAndamento
```

| Regra | Comportamento |
| :---- | :---- |
| Transição fora da lista | Recusada com `400 INVALID_STATUS_TRANSITION`; a mensagem lista os próximos status permitidos |
| Arraste livre (Kanban) | O cartão pode ser solto em qualquer coluna. A validação ocorre ao soltar, e o movimento inválido devolve o cartão à origem com o motivo (Q11) |
| Status inexistente | `400 INVALID_STATUS`; a mensagem lista os valores aceitos |
| `statusNovo` ausente | `400 MISSING_STATUS` |
| Status igual ao atual | Recusado |
| Mudança para `Concluido` | Gera evento de conclusão (e-mail, RF-13) |
| Toda mudança | Grava `historico_obra` e `audit_log` na mesma transação |

### 2.1 Status do material

```
EmSolicitacao → Comprado → EmTransito → Disponivel → Utilizado
```

| Regra | Comportamento |
| :---- | :---- |
| Inclusão na obra | O material nasce em `EmSolicitacao` |
| Quem altera | Administrador e Financeiro. A Engenharia não altera (`403 ACCESS_DENIED`) |
| Pulo ou retorno de status | Não previsto na revisão de 07/11/2026; a definir (Q12) |
| Toda mudança | Grava `audit_log` com usuário, data e hora |

## 3. Regras de cálculo do Gantt

| Cálculo | Regra |
| :---- | :---- |
| Duração em dias | `painéis ÷ produtividade`, arredondado para cima (regra de arredondamento em Q1) |
| Data de término | Início + duração em dias úteis. Início conta como primeiro dia |
| Propagação | Ao deslocar uma programação, as seguintes que têm integrantes em comum são deslocadas em dias úteis, em cadeia, na ordem de prioridade (proposta; Q10). As datas dos integrantes que cobriam o período inteiro acompanham o deslocamento |
| Hora | O horário de cada tarefa é armazenado e preservado. Só edição manual altera |
| Conflito | Sobreposição de período para o mesmo instalador em duas equipes é recusada com `409 SCHEDULE_CONFLICT` |
| Pessoa-dia | Cada integrante conta os dias úteis entre sua entrada e sua saída. Remoção durante a execução preserva os dias já trabalhados |

## 4. Matriz de permissões

| Funcionalidade | Administrador | Engenharia | Financeiro | Instalador |
| :---- | :---: | :---: | :---: | :---: |
| Login e acesso ao sistema | ✔ | ✔ | ✔ | ✔ |
| Cadastrar Administrador, Engenharia, Financeiro ou Instalador | ✔ | | | |
| Listar, editar, desativar e reativar usuários | ✔ | | | |
| Gerenciar clientes (cadastrar, listar, editar e excluir sem obras) | ✔ | ✔ | | |
| Redefinir ou alterar a própria senha | ✔ | ✔ | ✔ | ✔ |
| Cadastrar obra (cliente existente) e editar obra | ✔ | ✔ | | |
| Apagar obra | ✔ | ✔ | | |
| Mover cartões no Kanban | ✔ | ✔ | | |
| Comentar obra (página Obras) | ✔ | ✔ | | |
| Programar obra no Gantt e gerenciar equipes (incluir e remover integrantes) | ✔ | ✔ | | |
| Consultar ocupação dos instaladores no Gantt | ✔ | ✔ | ✔ | |
| Gerenciar catálogo de produtos e preços | ✔ | | ✔ | |
| Ver lista de produtos (sem preço) | ✔ | ✔ | ✔ | |
| Adicionar material à obra (somente produto cadastrado) | ✔ | ✔ | | |
| Alterar status do material | ✔ | | ✔ | |
| Ver valores (preços, custos, valor da obra) | ✔ | | ✔ | |
| Registrar custos e valor da obra | | | ✔ | |
| Consultar custo total e DRE | ✔ | | ✔ | |
| Exportar relatório financeiro | ✔ | | ✔ | |
| Exportar detalhes de instalação | ✔ | | | |
| Ver detalhes da instalação, kit e rota (Instalador: só das obras cujas equipes integra) | ✔ | ✔ | | ✔ |
| Concluir manutenção e comentar manutenção | | | | ✔ |
| Editar ou excluir comentário geral da timeline | ✔ | | | |
| Ver obras, Kanban, Gantt e timeline (leitura) | ✔ | ✔ | ✔ | Somente obras cujas equipes integra ou integrou |

Tentativa de ação fora da permissão retorna `403` e gera registro em log de segurança.

## 5. Comentários

| Local | Quem cria | Quem edita ou exclui |
| :---- | :---- | :---- |
| Obra (página Obras; tipo `Cartao`) | Administrador, Engenharia | Administrador |
| Manutenção | Instalador | Administrador |
| Timeline da obra | Financeiro (e também Administrador e Engenharia pelo cartão) | Administrador |

Todo comentário guarda autor, data e hora. Comentário vazio é recusado.

## 6. Exclusão e auditoria

- Exclusão de obra é lógica: recebe a data de exclusão, sai das listagens e preserva o histórico.
- Obra em execução não pode ser excluída.
- Alterações de status, exclusões e alterações financeiras geram registro em `audit_log`, que não aceita UPDATE nem DELETE.
- Retenção de dados de clientes de obras excluídas segue a política de LGPD (ver [riscos](12-riscos.md)).

## 7. Regras de autenticação e sessão

Detalhamento da RN-06 (extraído de `Autenticacao.cs` e `BancoDados.Login.cs`).

| ID | Subregra | Detalhe |
| :---- | :---- | :---- |
| RN-06.1 | Limite de tentativas | Cinco falhas consecutivas de senha bloqueiam a conta (`ACCOUNT_LOCKED`, HTTP 423). A contagem é por usuário, não por IP |
| RN-06.2 | Duração do bloqueio | 15 minutos a partir da quinta falha. A resposta 423 informa quantos minutos restam |
| RN-06.3 | Reset da contagem | Login bem-sucedido zera a contagem de falhas e o `bloqueado_ate`. O bloqueio também expira sozinho após 15 min |
| RN-06.4 | Conta inativa | Retorna a mesma mensagem genérica "E-mail ou senha incorretos" (código `INVALID_CREDENTIALS`). Não incrementa tentativas |
| RN-06.5 | Validade do token | 480 minutos (8 horas) por padrão. Configurável pela variável de ambiente `JWT_EXPIRES_MINUTES`. Valor mínimo aceito: 1. Sem renovação automática: após expirar, o usuário faz login novamente |
| RN-06.6 | Token expirado | HTTP 401 `UNAUTHORIZED`, mensagem "Token expirado. Faça login novamente." Registrado no audit_log com motivo `TokenExpirado` |
| RN-06.7 | Token ausente ou inválido | HTTP 401 `UNAUTHORIZED`, mensagem "Token ausente ou inválido." Registrado com motivo `SemToken` ou `TokenInvalido` |
| RN-06.8 | Perfil sem permissão | HTTP 403 `ACCESS_DENIED`. Registrado com motivo `PerfilSemPermissao` |
| RN-06.9 | Log de acesso negado | Toda negação (401/403) grava em `audit_log` com: `id_usuario`, `status`, `metodo`, `rota`, `motivo`, `perfil` |
| RN-06.10 | Chave JWT | `JWT_SECRET` deve ter no mínimo 32 bytes. Ausência em produção impede a inicialização do servidor |
| RN-06.11 | Campos sensíveis | A senha nunca é retornada em respostas da API. Armazenada apenas como hash BCrypt |
| RN-06.12 | Filtro de equipe (Instalador) | Instalador só acessa obras cujas equipes integra ou integrou. Acesso negado a obra sem esse vínculo: HTTP 403 com motivo `ObraSemVinculoEquipe` |
| RN-06.13 | Financeiro fora da timeline | Financeiro só cria comentário do tipo `Timeline`. Tentativa de tipo `Cartao` retorna 403 com motivo `FinanceiroForaDaTimeline` |
| RN-06.14 | Método de autenticação | Exclusivamente e-mail e senha. Sem redes sociais, SSO ou magic link |
| RN-06.15 | Política de senha | Mínimo de 8 caracteres, ao menos uma letra maiúscula, uma minúscula e um número (RF-21) |
| RN-06.16 | Link de redefinição | Uso único, validade de 1 hora. Link expirado ou já utilizado retorna "Link inválido ou expirado". A resposta à solicitação é sempre idêntica, exista o e-mail ou não (anti-enumeração) |
| RN-06.17 | Invalidação de tokens | Todos os tokens ativos do usuário são invalidados após redefinição ou alteração de senha, desativação da conta e edição do perfil (RF-21, RF-22) |
| RN-06.18 | Conta desativada | Não faz login e não recebe novo token. Reativação restaura o acesso com nova senha enviada por e-mail (RF-22) |

### Fluxo simplificado de autenticação

```
[Usuário] POST /api/auth/login { email, senha }
    │
    ├─ Email não encontrado → 401 INVALID_CREDENTIALS
    ├─ Conta bloqueada (bloqueado_ate > agora) → 423 ACCOUNT_LOCKED + minutos restantes
    ├─ Conta inativa → 401 INVALID_CREDENTIALS (não incrementa tentativas)
    ├─ Senha errada → incrementa tentativas; se >= 5: seta bloqueado_ate = agora+15min → 401 INVALID_CREDENTIALS
    └─ Senha correta → zera tentativas → emite JWT → 200 { token, expiresAt, usuario }
```

### Fluxo de autorização em rotas protegidas

```
Requisição com Authorization: Bearer <token>
    │
    ├─ Sem token → 401 UNAUTHORIZED (motivo: SemToken)
    ├─ Token com assinatura inválida → 401 UNAUTHORIZED (motivo: TokenInvalido)
    ├─ Token expirado → 401 UNAUTHORIZED (motivo: TokenExpirado)
    ├─ Perfil não autorizado para a rota → 403 ACCESS_DENIED (motivo: PerfilSemPermissao)
    └─ Autorizado → controller processa a requisição
```

## 8. Matriz de autorização das rotas da API

Legenda: **✔** acesso total · **E** apenas obras cujas equipes o usuário integra ou integrou (filtro no servidor; obra sem esse vínculo retorna `403`) · **—** acesso negado (`403`). A numeração é a mesma de [API](07-api.md). Itens com sufixo (ex.: `10a`) foram incluídos na revisão de 07/11/2026, sem renumerar os anteriores.

| # | Método + Rota | Admin | Engenharia | Financeiro | Instalador |
| :--- | :--- | :---: | :---: | :---: | :---: |
| 1 | `POST /api/auth/login` | Público | Público | Público | Público |
| 2 | `GET /api/auth/me` | ✔ | ✔ | ✔ | ✔ |
| 3 | `POST /api/auth/esqueci-senha` | Público | Público | Público | Público |
| 4 | `POST /api/auth/redefinir-senha` | Público (token) | Público (token) | Público (token) | Público (token) |
| 5 | `PUT /api/auth/alterar-senha` | ✔ | ✔ | ✔ | ✔ |
| 6 | `GET /api/usuarios` | ✔ | — | — | — |
| 7 | `POST /api/usuarios` | ✔ | — | — | — |
| 8 | `PUT /api/usuarios/{id}` | ✔ | — | — | — |
| 9 | `PATCH /api/usuarios/{id}/ativo` | ✔ | — | — | — |
| 10 | `GET /api/clientes` | ✔ | ✔ | — | — |
| 10a | `PUT /api/clientes/{id}` | ✔ | ✔ | — | — |
| 10b | `DELETE /api/clientes/{id}` ² | ✔ | ✔ | — | — |
| 11 | `POST /api/clientes` | ✔ | ✔ | — | — |
| 12 | `GET /api/obras` | ✔ | ✔ | ✔ | — |
| 13 | `POST /api/obras` | ✔ | ✔ | — | — |
| 13a | ~~`PUT /api/obras/{id}/responsaveis`~~ | Removida na revisão de 07/11/2026 (equipes ficam na programação, ver 27 a 27c) | | | |
| 14 | `GET /api/obras/{id}` | ✔ | ✔ | ✔ | **E** |
| 15 | `PUT /api/obras/{id}` | ✔ | ✔ | — | — |
| 16 | `DELETE /api/obras/{id}` | ✔ | ✔ | — | — |
| 17 | `PATCH /api/obras/{id}/status` | ✔ | ✔ | — | — |
| 18 | `GET /api/obras/{id}/materiais` | ✔ | ✔ | ✔ | **E** |
| 19 | `POST /api/obras/{id}/materiais` ³ | ✔ | ✔ | — | — |
| 20 | `PATCH /api/materiais/{id}` | ✔ | — | ✔ | — |
| 20a | `GET /api/produtos` ⁴ | ✔ | ✔ | ✔ | — |
| 20b | `POST /api/produtos` | ✔ | — | ✔ | — |
| 20c | `PUT /api/produtos/{id}` | ✔ | — | ✔ | — |
| 21 | `GET /api/obras/{id}/historico` | ✔ | ✔ | ✔ | — |
| 22 | `GET /api/obras/{id}/comentarios` | ✔ | ✔ | ✔ | ✔ |
| 23 | `POST /api/obras/{id}/comentarios` | ✔ | ✔ | ✔ ¹ | — |
| 24 | `PUT /api/comentarios/{id}` | ✔ | — | — | — |
| 25 | `DELETE /api/comentarios/{id}` | ✔ | — | — | — |
| 26 | `GET /api/instaladores/disponibilidade` ⁵ | ✔ | ✔ | — | — |
| 27 | `POST /api/programacoes/{id}/integrantes` | ✔ | ✔ | — | — |
| 27a | `PATCH /api/programacoes/{id}/integrantes/{usuarioId}` | ✔ | ✔ | — | — |
| 27b | `DELETE /api/programacoes/{id}/integrantes/{usuarioId}` ⁶ | ✔ | ✔ | — | — |
| 27c | `PATCH /api/programacoes/{id}/equipe` | ✔ | ✔ | — | — |
| 28 | `GET /api/programacoes` | ✔ | ✔ | ✔ | **E** |
| 28a | `GET /api/gantt/ocupacao` | ✔ | ✔ | ✔ | — |
| 29 | `POST /api/programacoes` | ✔ | ✔ | — | — |
| 30 | `PUT /api/programacoes/{id}/reordenar` | ✔ | ✔ | — | — |
| 31 | `GET /api/obras/{id}/custos` | ✔ | — | ✔ | — |
| 32 | `POST /api/obras/{id}/custos` | — | — | ✔ | — |
| 33 | `GET /api/obras/{id}/relatorio-custo` | ✔ | — | ✔ | — |
| 34 | `GET /api/obras/{id}/dre` | ✔ | — | ✔ | — |
| 35 | `GET /api/relatorios/export` | ✔ | — | ✔ | — |
| 36 | `GET /api/obras/{id}/instalacao/export` | ✔ | — | — | — |
| 37 | `GET /api/instalador/instalacoes` | — | — | — | ✔ |
| 38 | `GET /api/instalador/instalacoes/{obraId}` | — | — | — | ✔ **E** |
| 39 | `GET /api/instalador/manutencoes` | — | — | — | ✔ **E** |
| 40 | `PATCH /api/manutencoes/{id}/concluir` | — | — | — | ✔ **E** |
| 41 | `POST /api/manutencoes/{id}/comentarios` | — | — | — | ✔ **E** |
| 42 | `POST /api/cronograma/compartilhado` | ✔ | ✔ | — | — |
| 43 | `GET /api/cronograma/compartilhado/{token}` | Público (token) | Público (token) | Público (token) | Público (token) |

¹ Financeiro cria comentários somente na timeline da obra (tipo `Timeline`), nunca no comentário de gestão da obra (tipo `Cartao`).
² Cliente com obras vinculadas, inclusive excluídas logicamente, não pode ser excluído (`409 CLIENTE_COM_OBRAS`).
³ Somente produto cadastrado e ativo (`400 PRODUTO_INATIVO` caso contrário). Status inicial `EmSolicitacao`.
⁴ Engenharia recebe nome, tipo e unidade, sem preço (RN-07).
⁵ Lista instaladores de campo ativos. Com `dataInicio` e `dataFim`, marca quem está ocupado no período e em qual obra.
⁶ Antes da data de entrada, remove o integrante. Depois do início, exige `dataSaida` e encerra o vínculo nessa data, preservando os dias trabalhados.

## 9. Matriz de autorização das telas

> **Nota:** Baseada em `App.tsx` e `ProtectedRoute.tsx`. O frontend aplica proteção por `ProtectedRoute`; o backend é a linha de defesa definitiva (defense in depth). Perfis ausentes na coluna de uma tela recebem a página "403 - Acesso Negado" ao tentar acessá-la pela URL direta.

| Rota frontend | Tela | Admin | Engenharia | Financeiro | Instalador | Público |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `/` ou `/login` | Login | ✔ | ✔ | ✔ | ✔ | ✔ |
| `/kanban` | Funil Kanban (visualização e movimentação) | ✔ (movimenta) | ✔ (movimenta) | ✔ (leitura) | — | — |
| `/obras` | Página Obras (gestão oficial) | ✔ (edição) | ✔ (edição) | ✔ (leitura, sem valores) | — | — |
| `/obras/:id` | Detalhe da obra (dentro de Obras) | ✔ (edição) | ✔ (edição) | ✔ (leitura) | — | — |
| `/cronograma` | Cronograma / Gantt, equipes das programações e ocupação dos instaladores | ✔ (edição) | ✔ (edição) | ✔ (leitura) | — | — |
| `/cadastrarobra` | Formulário Nova Obra | ✔ | ✔ | — | — | — |
| `/obras/:id/materiais` | Materiais da obra | ✔ | ✔ (sem alterar status) | ✔ (altera status) | — | — |
| `/produtos` | Catálogo de produtos e preços | ✔ | — | ✔ | — | — |
| `/relatorios` | Relatórios / Exportação | ✔ | — | ✔ | — | — |
| `/financeiro` | Financeiro: valores, custos e DRE | ✔ | — | ✔ | — | — |
| `/usuarios` *(RF-22, Sprint 4)* | Gestão de Usuários | ✔ | — | — | — | — |
| `/clientes` *(RF-23, Sprint 4)* | Gestão de Clientes (CRUD) | ✔ | ✔ | — | — | — |
| `/linkparainstaladores` | Módulo do Instalador (mobile) | — | — | — | ✔ | — |
| `/acompanharhomologacao` | Homologação (fora do escopo) | ✔ | ✔ | — | — | — |
| `/cronograma/compartilhado/:token` | Gantt somente leitura | — | — | — | — | ✔ |
| `/relatorio-publico/:token` | Relatório público | — | — | — | — | ✔ |
| `*` (qualquer outra) | Página não encontrada (RF-24) | ✔ | ✔ | ✔ | ✔ | — |

> Administrador e Engenharia consultam a instalação em `/obras/:id`. As rotas `/api/instalador/*` são exclusivas do Instalador de Campo. A rota `/equipes` foi substituída por `/cronograma` na revisão de 07/11/2026: a equipe é montada e ajustada dentro da programação no Gantt, não em cadastro próprio.

### 9.1 Comportamento pós-login por perfil

| Perfil | Redirecionamento após login |
| :--- | :--- |
| Administrador | `/kanban` |
| Engenharia | `/kanban` |
| Financeiro | `/financeiro` |
| InstaladorCampo | `/linkparainstaladores` |

### 9.2 Itens visíveis no menu lateral por perfil

| Item do menu | Admin | Engenharia | Financeiro | Instalador |
| :--- | :---: | :---: | :---: | :---: |
| Kanban | ✔ | ✔ | ✔ | — |
| Obras | ✔ | ✔ | ✔ | — |
| Cronograma / Gantt | ✔ | ✔ | ✔ | — |
| Nova Obra | ✔ | ✔ | — | — |
| Clientes | ✔ | ✔ | — | — |
| Produtos | ✔ | — | ✔ | — |
| Relatórios | ✔ | — | ✔ | — |
| Financeiro | ✔ | — | ✔ | — |
| Usuários | ✔ | — | — | — |

> **Atenção:** Itens de menu não devem aparecer para perfis sem permissão. Conforme o achado UX-15 (severidade 4), itens sem tela implementada foram fonte de confusão na avaliação heurística. Todo item do menu deve ter a rota correspondente implementada antes de ser exibido.
>
> **Revisão de 07/11/2026:** o item "Equipes" sai do menu e dá lugar a "Cronograma", onde as equipes são geridas por programação. O item "Obras" passa a ser obrigatório no menu, porque a navegação até a obra não pode depender só do botão "Página da Obra" do Kanban.

---
