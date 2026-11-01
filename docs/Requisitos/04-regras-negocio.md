# Regras de Negócio

## 1. Catálogo

| ID | Tipo | Regra | Requisitos | Casos de uso |
| :---- | :---- | :---- | :---- | :---- |
| RN-01 | Derivação | Duração estimada = quantidade de painéis ÷ produtividade (padrão 9 por dia), arredondada conforme a regra vigente (questão Q1) | RF-08 | UC-22 |
| RN-02 | Restrição | Uma equipe não pode ter duas obras no mesmo período. Sábados e domingos não contam como dias úteis. Feriados conforme Q2 | RF-07, RF-09 | UC-13, UC-21, UC-22 |
| RN-03 | Restrição | Toda obra tem cliente. Custo total e DRE só são apurados para obras concluídas com precificação completa | RF-03, RF-14, RF-20 | UC-08, UC-10, UC-32, UC-33 |
| RN-04 | Restrição | Instalador é usuário com login. Acesso restrito às próprias instalações, rota, manutenção e comentários. Sem acesso a dados financeiros, DRE ou gestão do Kanban | RF-01, RF-02, RF-19 | UC-01, UC-03, UC-14, UC-24, UC-25, UC-26 |
| RN-05 | Restrição | Registros da timeline e logs de auditoria são imutáveis. Edição e exclusão de comentários gerais da timeline são restritas ao Administrador | RF-11, RF-12 | UC-20, UC-29, UC-30 |
| RN-06 | Restrição | Autenticação JWT: 5 falhas consecutivas bloqueiam a conta por 15 minutos. Token válido por 480 minutos (configurável por JWT_EXPIRES_MINUTES). Conta inativa retorna credenciais inválidas sem incrementar tentativas. Toda negação (401/403) grava em audit_log. Política de senha, redefinição por link e invalidação de tokens em RN-06.14 a RN-06.18 | RF-01, RF-02, RF-21, RF-22 | UC-01, UC-02, UC-03, UC-04, UC-35, UC-36, UC-37, UC-38 |

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
| Status inexistente | `400 INVALID_STATUS`; a mensagem lista os valores aceitos |
| `statusNovo` ausente | `400 MISSING_STATUS` |
| Status igual ao atual | Recusado |
| Mudança para `Concluido` | Gera evento de conclusão (e-mail, RF-13) |
| Toda mudança | Grava `historico_obra` e `audit_log` na mesma transação |

## 3. Regras de cálculo do Gantt

| Cálculo | Regra |
| :---- | :---- |
| Duração em dias | `painéis ÷ produtividade`, arredondado para cima (regra de arredondamento em Q1) |
| Data de término | Início + duração em dias úteis. Início conta como primeiro dia |
| Propagação | Ao deslocar uma alocação, as seguintes da mesma equipe são deslocadas em dias úteis, na ordem de prioridade |
| Hora | O horário de cada tarefa é armazenado e preservado. Só edição manual altera |
| Conflito | Sobreposição de período para a mesma equipe é recusada com `409 SCHEDULE_CONFLICT` |

## 4. Matriz de permissões

| Funcionalidade | Administrador | Engenharia | Financeiro | Instalador |
| :---- | :---: | :---: | :---: | :---: |
| Login e acesso ao sistema | ✔ | ✔ | ✔ | ✔ |
| Cadastrar Administrador, Engenharia, Financeiro ou Instalador | ✔ | | | |
| Listar, editar, desativar e reativar usuários | ✔ | | | |
| Consultar e cadastrar clientes (tela dedicada) | ✔ | ✔ | | |
| Redefinir ou alterar a própria senha | ✔ | ✔ | ✔ | ✔ |
| Cadastrar cliente e obra | ✔ | ✔ | | |
| Apagar obra | ✔ | ✔ | | |
| Mover e editar cartões no Kanban | ✔ | ✔ | | |
| Criar equipe e alocar no Gantt | ✔ | ✔ | | |
| Exportar detalhes de instalação | ✔ | | | |
| Ver detalhes da instalação, kit e rota da própria equipe | ✔ | ✔ | | ✔ |
| Concluir manutenção e comentar manutenção | | | | ✔ |
| Registrar custos | | | ✔ | |
| Consultar custo total e DRE | ✔ | | ✔ | |
| Exportar relatório financeiro | ✔ | | ✔ | |
| Editar ou excluir comentário geral da timeline | ✔ | | | |
| Ver obras, Kanban, Gantt e timeline (leitura) | ✔ | ✔ | ✔ | Somente instalações da própria equipe |

Tentativa de ação fora da permissão retorna `403` e gera registro em log de segurança.

## 5. Comentários

| Local | Quem cria | Quem edita ou exclui |
| :---- | :---- | :---- |
| Cartão no Kanban | Administrador, Engenharia | Administrador |
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
| RN-06.12 | Filtro de equipe (Instalador) | Instalador só acessa obras programadas para a própria equipe. Acesso negado a registro de outra equipe: HTTP 403 com motivo `ObraDeOutraEquipe` |
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

Legenda: **✔** acesso total · **E** apenas registros da própria equipe (filtro no servidor; registro de outra equipe retorna `403`) · **—** acesso negado (`403`). A numeração é a mesma de [API](07-api.md).

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
| 11 | `POST /api/clientes` | ✔ | ✔ | — | — |
| 12 | `GET /api/obras` | ✔ | ✔ | ✔ | — |
| 13 | `POST /api/obras` | ✔ | ✔ | — | — |
| 14 | `GET /api/obras/{id}` | ✔ | ✔ | ✔ | **E** |
| 15 | `PUT /api/obras/{id}` | ✔ | ✔ | — | — |
| 16 | `DELETE /api/obras/{id}` | ✔ | ✔ | — | — |
| 17 | `PATCH /api/obras/{id}/status` | ✔ | ✔ | — | — |
| 18 | `GET /api/obras/{id}/materiais` | ✔ | ✔ | ✔ | **E** |
| 19 | `POST /api/obras/{id}/materiais` | ✔ | ✔ | — | — |
| 20 | `PATCH /api/materiais/{id}` | ✔ | ✔ | — | — |
| 21 | `GET /api/obras/{id}/historico` | ✔ | ✔ | ✔ | — |
| 22 | `GET /api/obras/{id}/comentarios` | ✔ | ✔ | ✔ | ✔ |
| 23 | `POST /api/obras/{id}/comentarios` | ✔ | ✔ | ✔ ¹ | — |
| 24 | `PUT /api/comentarios/{id}` | ✔ | — | — | — |
| 25 | `DELETE /api/comentarios/{id}` | ✔ | — | — | — |
| 26 | `GET /api/equipes` | ✔ | ✔ | ✔ | ✔ |
| 27 | `POST /api/equipes` | ✔ | ✔ | — | — |
| 28 | `GET /api/programacoes` | ✔ | ✔ | ✔ | ✔ |
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

¹ Financeiro cria comentários somente na timeline da obra (tipo `Timeline`), nunca no cartão do Kanban (tipo `Cartao`).

## 9. Matriz de autorização das telas

> **Nota:** Baseada em `App.tsx` e `ProtectedRoute.tsx`. O frontend aplica proteção por `ProtectedRoute`; o backend é a linha de defesa definitiva (defense in depth). Perfis ausentes na coluna de uma tela recebem a página "403 - Acesso Negado" ao tentar acessá-la pela URL direta.

| Rota frontend | Tela | Admin | Engenharia | Financeiro | Instalador | Público |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `/` ou `/login` | Login | ✔ | ✔ | ✔ | ✔ | ✔ |
| `/kanban` | Funil Kanban | ✔ (edição) | ✔ (edição) | ✔ (leitura) | — | — |
| `/equipes` | Cronograma / Gantt + Equipes | ✔ (edição) | ✔ (edição) | ✔ (leitura) | — | — |
| `/cadastrarobra` | Formulário Nova Obra | ✔ | ✔ | — | — | — |
| `/obras/:id` | Detalhe da Obra | ✔ | ✔ | ✔ (leitura) | — | — |
| `/obras/:id/materiais` | Materiais da Obra | ✔ | ✔ | — | — | — |
| `/relatorios` | Relatórios / Exportação | ✔ | — | ✔ | — | — |
| `/financeiro` | Custos e DRE | ✔ | — | ✔ | — | — |
| `/usuarios` *(RF-22, Sprint 4)* | Gestão de Usuários | ✔ | — | — | — | — |
| `/clientes` *(RF-23, Sprint 4)* | Gestão de Clientes | ✔ | ✔ | — | — | — |
| `/linkparainstaladores` | Módulo do Instalador (mobile) | — | — | — | ✔ | — |
| `/acompanharhomologacao` | Homologação (fora do escopo) | ✔ | ✔ | — | — | — |
| `/cronograma/compartilhado/:token` | Gantt somente leitura | — | — | — | — | ✔ |
| `/relatorio-publico/:token` | Relatório público | — | — | — | — | ✔ |
| `*` (qualquer outra) | Página não encontrada (RF-24) | ✔ | ✔ | ✔ | ✔ | — |

> Administrador e Engenharia consultam a instalação em `/obras/:id`. As rotas `/api/instalador/*` são exclusivas do Instalador de Campo.

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
| Cronograma / Gantt | ✔ | ✔ | ✔ | — |
| Nova Obra | ✔ | ✔ | — | — |
| Clientes | ✔ | ✔ | — | — |
| Relatórios | ✔ | — | ✔ | — |
| Financeiro | ✔ | — | ✔ | — |
| Usuários | ✔ | — | — | — |

> **Atenção:** Itens de menu não devem aparecer para perfis sem permissão. Conforme o achado UX-15 (severidade 4), itens sem tela implementada foram fonte de confusão na avaliação heurística. Todo item do menu deve ter a rota correspondente implementada antes de ser exibido.

---
