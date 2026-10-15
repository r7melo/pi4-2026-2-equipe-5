# Requisitos

Prioridades seguem MoSCoW (Must, Should, Could, Won't). A coluna **Situação** indica o estado de implementação na data de atualização deste documento. Os valores são: Concluído, Em andamento, Pendente e Fora do escopo.

## Requisitos funcionais

| ID | Requisito | Prioridade | Situação |
| :---- | :---- | :---- | :---- |
| RF-01 | Autenticação e gestão de perfis | Must | Em andamento |
| RF-02 | Autorização por perfil (RBAC) | Must | Pendente |
| RF-03 | Cadastro de clientes e gestão de obras | Must | Em andamento |
| RF-04 | Funil Kanban | Must | Em andamento |
| RF-05 | Raia de assistência e manutenção | Should | Pendente |
| RF-06 | Status de material | Should | Em andamento |
| RF-07 | Equipes e alocação no Gantt | Must | Em andamento |
| RF-08 | Estimativa de duração | Should | Em andamento |
| RF-09 | Reordenação e propagação de atrasos | Must | Em andamento |
| RF-10 | Sincronização Gantt e Kanban | Should | Pendente |
| RF-11 | Histórico e linha do tempo | Should | Em andamento |
| RF-12 | Imutabilidade da timeline | Should | Em andamento |
| RF-13 | Notificação por e-mail | Could | Pendente |
| RF-14 | Custo total da obra | Must | Em andamento |
| RF-15 | Exportação de relatórios e detalhes | Must | Pendente |
| RF-16 | Cronograma compartilhado (somente leitura) | Should | Pendente |
| RF-17 | Acompanhamento de homologação | Won't | Fora do escopo |
| RF-18 | Modo display | Could | Pendente |
| RF-19 | Módulo do instalador de campo | Must | Em andamento |
| RF-20 | DRE da obra | Must | Pendente |

### RF-01: Autenticação e gestão de perfis

O sistema autentica por e-mail e senha e emite um token de acesso (JWT) com o perfil do usuário. Somente o Administrador cadastra usuários de qualquer perfil.

- Login válido redireciona para a tela do perfil. Instalador vai para a lista de instalações.
- Erro de credencial mostra "E-mail ou senha incorretos", sem indicar qual campo está errado.
- Cinco falhas consecutivas bloqueiam novas tentativas por tempo determinado.
- E-mail deve ser único.
- Senhas são armazenadas somente como hash.

### RF-02: Autorização por perfil (RBAC)

Toda rota protegida valida token e perfil no servidor. Sem token: `401`. Perfil sem permissão: `403`. Ambos geram registro em log de segurança.

Matriz completa na seção 4 de [Regras de negócio](04-regras-negocio.md).

### RF-03: Cadastro de clientes e gestão de obras

- Cliente tem nome e CPF/CNPJ obrigatórios. CPF/CNPJ é único.
- Obra exige cliente vinculado.
- Ao cadastrar uma obra, o sistema cria o cartão no Kanban na primeira coluna e registra a ação na timeline.
- Exclusão de obra é lógica: a obra some das listagens, o cartão é removido e o log registra usuário e data.
- Obra em execução não pode ser excluída.

### RF-04: Funil Kanban

- O quadro tem as colunas: Material Comprado, No Depósito, Separado, Em Andamento e Concluído, mais a raia de Assistência.
- Mover um cartão altera o status da obra, grava a ação na timeline e grava log.
- Transições fora do fluxo são recusadas, e o cartão volta para a coluna de origem com o motivo.
- Edição do cartão e comentários: somente Administrador e Engenharia.
- Financeiro e Instalador têm o quadro em modo leitura.

### RF-05: Raia de assistência e manutenção

- Obras pós-instalação aparecem na raia de Assistência.
- O instalador vê somente as manutenções da própria equipe.
- Concluir a manutenção registra o serviço executado, altera o status e grava na timeline.
- Comentário de manutenção é opcional, mas quando enviado não pode ser vazio. Guarda autor, data e hora.
- Outros perfis não concluem manutenção.

### RF-06: Status de material

- Cada material tem um status logístico: `Comprado`, `EmTransito` ou `Disponivel`.
- O status aparece com rótulo e cor no cartão do Kanban e na barra do Gantt, nos dois lugares ao mesmo tempo.

### RF-07: Equipes e alocação no Gantt

- Equipe tem nome, ao menos um instalador e um responsável (que deve estar entre os instaladores).
- Um instalador não pode estar em duas equipes no mesmo período.
- Alocar equipe a uma obra define o período da instalação no Gantt.
- Conflito de agenda da equipe é bloqueado, com mensagem informando o período ocupado.
- Obra só pode ser alocada se estiver apta (materiais separados).
- Perfis Financeiro e Instalador não alocam equipes.

### RF-08: Estimativa de duração

- Duração = quantidade de painéis ÷ produtividade (padrão 9 painéis por dia).
- Arredondamento e regra final: ver questão Q1 em [Visão de negócio](01-visao-negocio.md#questões-em-aberto).
- Obra sem quantidade de painéis não recebe estimativa; o sistema solicita o preenchimento.

### RF-09: Reordenação e propagação de atrasos

- Reordenar uma alocação recalcula as datas das alocações seguintes da mesma equipe.
- O cálculo de término usa somente dias úteis.
- Reagendamento que sobrepõe outra alocação da mesma equipe é bloqueado.

### RF-10: Sincronização Gantt e Kanban

- Alocar uma obra no Gantt atualiza o status da obra e o cartão no Kanban.
- Mover o cartão atualiza a barra da obra no Gantt.
- As duas visões exibem o mesmo status para a mesma obra.
- Atualização entre as visões acontece por evento em tempo real (SignalR), sem recarregar a página.

### RF-11: Histórico e linha do tempo

- Toda ação relevante gera um registro com descrição, usuário, data e hora.
- Ações registradas: cadastro de obra, mudança de status, comentário, manutenção concluída, alteração financeira.
- A timeline é exibida em ordem cronológica.
- Financeiro pode incluir comentário geral na timeline.

### RF-12: Imutabilidade da timeline

- Registros automáticos não podem ser editados nem removidos, por nenhum perfil.
- Comentários gerais da timeline: somente o Administrador edita ou exclui, e a edição gera log.
- Logs de auditoria são append-only.

### RF-13: Notificação por e-mail

- Ao mudar o status para `Concluido`, o sistema envia e-mail de conclusão.
- Falha no envio não reverte a mudança de status e é registrada em log.

### RF-14: Custo total da obra

- O custo total é a soma dos itens de custo registrados na obra.
- Só é apurado para obras concluídas com precificação completa. Caso contrário, retorna erro descritivo.
- Acesso: Administrador e Financeiro.
- Toda criação ou alteração de custo grava log com usuário e timestamp.

### RF-15: Exportação de relatórios e detalhes

- Relatórios financeiros e cronograma exportam em PDF ou Excel.
- Detalhes da instalação (kit, endereço, equipe, período e instruções) exportam somente para o Administrador.
- Geração de até 1.000 registros em no máximo 5 segundos (RNF-05).
- Perfis sem permissão recebem `403`.

### RF-16: Cronograma compartilhado

- Um usuário autenticado gera um link único do cronograma.
- O link abre o Gantt em modo somente leitura, sem login.
- O link não expõe custos, DRE nem dados de usuários.
- Link inválido exibe mensagem de link inválido.

### RF-17: Acompanhamento de homologação

Fora do escopo desta fase. Não há rotas, tela ou entidade de homologação no sistema.

### RF-18: Modo display

- Ativa tela cheia com o Gantt ou o Kanban, ocultando menus e controles de edição.
- Em modo display nenhuma obra pode ser movida ou editada.
- Sair restaura a visualização normal.

### RF-19: Módulo do instalador de campo

- O instalador faz login e acessa a lista de instalações da sua equipe.
- Cada instalação mostra kit de materiais, endereço, projeto e instruções.
- Botão "Abrir rota" envia o endereço ao aplicativo de mapas do dispositivo.
- Instalador registra e conclui manutenções e comenta sobre elas.
- Instalador não vê instalações de outras equipes e não acessa telas administrativas ou financeiras.

### RF-20: DRE da obra

- DRE mostra custo total, valor da obra e resultado (valor da obra menos custo total).
- Só para obras concluídas com precificação completa.
- Acesso: Administrador e Financeiro. Exportável em PDF e Excel.

## Requisitos não funcionais

| ID | Característica (ISO/IEC 25010) | Requisito | Medida | Situação |
| :---- | :---- | :---- | :---- | :---- |
| RNF-01 | Portabilidade e usabilidade | Layout funcional de 360 px a 1920 px. Instalador com interface mobile-first | Teste de renderização em 360, 768, 1280 e 1920 px nos navegadores Chrome, Firefox e Safari | Em andamento |
| RNF-02 | Segurança (confidencialidade) | 100% do tráfego em HTTPS (TLS 1.2+), sem VPN | Nenhuma rota HTTP acessível em produção | Pendente |
| RNF-03 | Segurança (controle de acesso) | 100% das rotas protegidas validam token e perfil no servidor | 401 sem token; 403 com perfil sem permissão; ambos com log | Pendente |
| RNF-04 | Segurança (responsabilização) | Log irremovível para exclusões, mudanças de status e alterações financeiras | Registro com `userId` e `timestamp` após cada operação crítica | Pendente |
| RNF-05 | Eficiência de desempenho | Exportação em até 5 s para 1.000 registros | P95 ≤ 5 s com 1.000 obras no banco | Pendente |

## Interfaces externas

- **Navegador e celular:** interface responsiva. Desktop para Administrador, Engenharia e Financeiro; celular para o instalador.
- **Aplicativo de mapas:** link de navegação gerado a partir do endereço da obra.
- **Serviço de e-mail:** envio de notificação de conclusão.
- **Arquivos:** exportação em PDF e Excel.
