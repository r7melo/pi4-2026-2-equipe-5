# Riscos

| ID | Risco | Categoria | Probabilidade | Impacto | Mitigação |
| :---- | :---- | :---- | :---- | :---- | :---- |
| RSK-01 | Login aceita senha inválida por tratamento de erro no cliente | Segurança | Alta | Alta | Erro 401 mostra mensagem de credencial inválida. Mock só com `VITE_USE_MOCK=true` |
| RSK-02 | Rotas sem validação de token e perfil no servidor | Segurança | Alta | Alta | Middleware de autorização em todas as rotas; testes de API por perfil |
| RSK-03 | Dados de obra acessíveis por link ou por ID de outra equipe | Segurança | Média | Alta | Login obrigatório para instalador; filtro por equipe no servidor |
| RSK-04 | Credenciais de teste no código da interface | Segurança | Alta | Média | Campos vazios no login; credenciais só no guia de desenvolvimento |
| RSK-05 | Dados pessoais de clientes e instaladores sem avaliação de impacto (LGPD) | Compliance | Média | Alta | Elaborar RIPD antes do desenvolvimento de produção |
| RSK-06 | Regra de duração divergente entre tela, backend e testes | Negócio | Alta | Média | Resolver questão Q1 e atualizar dados de teste |
| RSK-07 | Feriados fora do cálculo de dias úteis | Negócio | Alta | Média | Resolver questão Q2; tabela de feriados no banco |
| RSK-08 | Conflito de agenda não bloqueado no servidor | Técnico | Alta | Alta | Validação no `GanttService` com `409 SCHEDULE_CONFLICT` |
| RSK-09 | Menu com itens que levam a telas inexistentes | Entrega | Alta | Alta | Criar as telas ou ocultar itens; rota coringa de "não encontrado" |
| RSK-10 | Fluxo de status da API diferente do fluxo de negócio (sem pagamento e programação) | Técnico | Alta | Alta | Definir colunas oficiais; alinhar regras, API e Kanban |
| RSK-11 | Cadastro de obra com cliente inexistente | Técnico | Alta | Alta | Exigir cliente existente ou criar cliente explicitamente no cadastro |
| RSK-12 | Sincronização em tempo real não automática | Técnico | Média | Média | Handler dedicado com invalidação do cache; teste de CT-10 |
| RSK-13 | Histórico de dados de teste incompleto | Técnico | Alta | Média | Carga de teste com registro de criação e transições completas |
| RSK-14 | Custo de obra não concluída sem regra clara | Negócio | Alta | Média | Erro descritivo para obra não concluída (questão Q5) |
| RSK-15 | Dados de custo insuficientes para o balanço de materiais e DRE | Técnico | Alta | Média | Colunas de quantidade utilizada e custo unitário no `material` |
| RSK-16 | Perfil de leitura genérico sem definição | Escopo | Alta | Média | Resolver questão Q4 |
| RSK-17 | Rotas de homologação previstas apesar de estarem fora do escopo | Escopo | Média | Média | Não implementar; remover da documentação de API |
| RSK-18 | Usabilidade abaixo da meta antes da entrega | Entrega | Alta | Alta | Corrigir problemas de severidade alta e rodar sessões com quatro usuários |
| RSK-19 | Licença do DHTMLX Gantt incompatível com o uso | Dependência | Média | Média | Verificar licença antes da produção |
| RSK-20 | Sem provedor, RTO ou RPO definidos | Operação | Alta | Alta | Decisão no HLD com o solicitante (questão Q6) |
| RSK-21 | Sem pipeline de build, testes e análise de segurança | Operação | Alta | Média | Pipeline mínimo com build, testes, secrets scan, SAST e SCA |
| RSK-22 | Exportação de 1.000 registros não medida | Desempenho | Média | Média | Teste de carga antes da entrega |
| RSK-23 | Cronograma compartilhado sem geração de token nem expiração | Segurança | Média | Média | Rota de geração; expiração e revogação |
| RSK-24 | Nome do perfil de Engenharia inconsistente entre documentos e API | Documentação | Alta | Baixa | Padronizar `Engenharia` como valor único |
| RSK-25 | Diagrama de entidades em imagem desatualizado | Documentação | Alta | Baixa | Substituir por diagrama gerado a partir deste documento |
| RSK-26 | Perfis que podem comentar divergem entre documentos | Escopo | Média | Baixa | Seguir a matriz de permissões em [regras de negócio](04-regras-negocio.md) |
