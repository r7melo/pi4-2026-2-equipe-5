# Visão de Negócio

## Contexto

A ZL Engenharia executa instalações de sistemas de energia solar. Cada obra passa por pagamento confirmado, compra e recebimento de materiais, separação de kit, programação de equipe, instalação e, quando necessário, manutenção pós-instalação. O sistema centraliza essas etapas em uma única base, com controle de acesso por perfil e rastreabilidade de cada alteração.

## Objetivos

| # | Objetivo | Indicador | Meta |
| :---- | :---- | :---- | :---- |
| O1 | Toda obra vinculada a um cliente e com cartão no Kanban | Obras sem cliente ou sem cartão | 0 |
| O2 | Nenhuma equipe alocada em dois locais no mesmo período | Alocações conflitantes gravadas | 0 |
| O3 | Exportação de relatórios rápida | Tempo de geração com 1.000 registros | ≤ 5 s (P95) |
| O4 | Baixo custo de treinamento | Tempo até o primeiro uso concluído | < 2 h |
| O5 | Tarefas principais concluídas pelos usuários | Taxa de sucesso por tarefa | ≥ 80% |
| O6 | Boa usabilidade percebida | Escala SUS | ≥ 68 |
| O7 | Rastreabilidade de alterações críticas | Alterações de status, exclusões e financeiro com log | 100% |

## Escopo

### Incluído

- Autenticação e perfis de acesso com autorização no servidor.
- Cadastro de clientes, obras e usuários; exclusão lógica de obras.
- Funil Kanban de obras com movimentação, edição, comentários e raia de assistência.
- Status de materiais por obra.
- Equipes de campo e alocação no Gantt, com duração estimada, reordenação e propagação de atrasos em dias úteis.
- Linha do tempo por obra, com registros automáticos imutáveis.
- Módulo do instalador (celular): detalhes da instalação, abertura de rota, manutenção e comentários.
- Custos, custo total e DRE da obra; exportação de relatórios em PDF e Excel.
- Cronograma compartilhado em modo somente leitura e modo display para monitores.
- Notificação por e-mail na conclusão da obra.

### Fora do escopo

- Acompanhamento de homologação junto à concessionária.
- Aplicativo nativo para celular.
- Integração com sistemas de compras, ERP ou nota fiscal.

## Perfis de usuário

| Perfil | Valor no sistema | Principais permissões |
| :---- | :---- | :---- |
| Administrador | `Administrador` | Todas as funções, inclusive cadastro de usuários, DRE e edição da timeline |
| Engenharia | `Engenharia` | Obras, Kanban, equipes e Gantt. Sem financeiro nem cadastro de usuários |
| Financeiro | `Financeiro` | Custos, DRE e exportações. Leitura de obras, Kanban, Gantt e timeline |
| Instalador de Campo | `InstaladorCampo` | Instalações da própria equipe, rota, manutenção e comentários |

## Premissas

- Interface e documentação em português do Brasil.
- Instaladores têm conta com login próprio.
- Produtividade padrão de 9 painéis por dia, ajustável por obra.
- Dias não úteis: sábados e domingos (feriados ver questões em aberto).
- Dados de carga inicial são de teste, não dados reais.

## Restrições

- Sistema web em nuvem com HTTPS obrigatório e sem VPN.
- Frontend em React e backend em C# (ASP.NET Core).
- Banco relacional PostgreSQL.
- Dados pessoais de clientes e instaladores tratados conforme a LGPD.
- Propagação de atrasos desenvolvida pela equipe, pois o auto-scheduling da biblioteca de Gantt é recurso pago.

## Questões em aberto

Estas decisões precisam ser tomadas com o solicitante antes de fechar a implementação.

| # | Questão | Opções | Impacto |
| :---- | :---- | :---- | :---- |
| Q1 | Regra de arredondamento da duração | Dias inteiros ou múltiplos de 0,5 dia | Duração em alocações, RF-08 e casos de teste |
| Q2 | Feriados no cálculo de dias úteis | Excluir feriados nacionais (lista cadastrada) ou só fins de semana | Propagação no Gantt e datas de término |
| Q3 | Acesso do instalador | Login com JWT (adotado) ou link público por token | Rota do instalador e exposição de dados |
| Q4 | Perfil de leitura genérico | Reabrir o perfil ou manter só os quatro perfis atuais | Cadastro de usuários e matriz de permissões |
| Q5 | Custo de obra não concluída | Erro descritivo (adotado) ou custo parcial | Endpoint de custo e DRE |
| Q6 | Provedor de nuvem, RTO e RPO | A definir | Infraestrutura, backup e operação |
| Q7 | Criticidade do sistema | A definir (proposta: média) | Nível de testes, monitoramento e SLA |
| Q8 | Estimativa de custo e prazo | A definir | Planejamento |

## Glossário

| Termo | Definição |
| :---- | :---- |
| Obra | Instalação de sistema solar para um cliente, com um cartão no Kanban |
| Cartão | Representação visual da obra no Kanban |
| Programação | Alocação de uma equipe a uma obra em um período no Gantt |
| Assistência | Raia de manutenção pós-instalação |
| Dia útil | Dia que não é sábado, domingo nem feriado (conforme Q2) |
| Timeline | Registro cronológico de ações de uma obra |
| DRE | Resultado da obra: valor da obra menos custo total |
| Kit | Conjunto de materiais de uma instalação (painéis, inversores, cabos, disjuntores) |
