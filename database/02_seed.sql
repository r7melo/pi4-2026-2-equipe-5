--  02_seed.sql
--  ZL Engenharia Solar — dados iniciais para demonstração
--
--  Dados alinhados com os fixtures do frontend (services/mock/fixtures.ts)
--  para garantir consistência entre o mock e o banco real.
--
--  Senhas: todas com hash bcrypt de "Senha123!" (apenas para seed)
--
--  Ordem de inserção respeita FKs:
--    perfil_acesso → equipe → cliente → usuario → obra
--    obra → pagamento, homologacao, material, comentario,
--           historico_obra, programacao_obra, relatorio_custo

SET client_encoding = 'UTF8';


-- ---------------------------------------------------------
-- 1. PERFIL_ACESSO
-- Tabela de domínio fixo — os 5 perfis são definidos pelos requisitos (RF-01, RF-02)
-- e não variam com os dados. 5 registros é o total correto para esta tabela.
-- ---------------------------------------------------------
INSERT INTO perfil_acesso (id, nome_perfil, permissoes) VALUES
(1, 'Administrador',      '*'),
(2, 'EngenhariaObras',    'obras:criar,obras:mover,programacoes:editar'),
(3, 'Financeiro',         'financeiro:visualizar,relatorios:visualizar'),
(4, 'VisualizadorLeitor', 'obras:visualizar'),
(5, 'InstaladorCampo',    'obras:visualizar,materiais:confirmar');

SELECT setval('perfil_acesso_id_seq', (SELECT MAX(id) FROM perfil_acesso));


-- ---------------------------------------------------------
-- 2. EQUIPE (10 equipes)
-- ---------------------------------------------------------
INSERT INTO equipe (id, nome, especialidade) VALUES
(1,  'Equipe 01', 'Instalação Residencial'),
(2,  'Equipe 02', 'Instalação Comercial'),
(3,  'Equipe 03', 'Instalação Industrial'),
(4,  'Equipe 04', 'Instalação Rural'),
(5,  'Equipe 05', 'Instalação Residencial'),
(6,  'Equipe 06', 'Instalação Comercial'),
(7,  'Equipe 07', 'Manutenção e Assistência'),
(8,  'Equipe 08', 'Instalação Industrial'),
(9,  'Equipe 09', 'Instalação Rural'),
(10, 'Equipe 10', 'Manutenção e Assistência');

SELECT setval('equipe_id_seq', (SELECT MAX(id) FROM equipe));


-- ---------------------------------------------------------
-- 3. CLIENTE (10 clientes)
-- ---------------------------------------------------------
INSERT INTO cliente (id, nome, cidade, dados_contrato) VALUES
(1,  'Rede Alfa Supermercados',          'Campinas',         'Contrato n° 2026-001 | Projeto comercial 45 painéis'),
(2,  'Indústria Metalúrgica Ramos',      'Sorocaba',         'Contrato n° 2026-002 | Galpão industrial 120 painéis'),
(3,  'Residencial Vista Verde — Bloco A','Campinas',         'Contrato n° 2026-003 | Condomínio 24 painéis'),
(4,  'Fazenda Santa Maria',              'Itapetininga',     'Contrato n° 2026-004 | Área rural 80 painéis'),
(5,  'Hospital São Lucas',               'Santos',           'Contrato n° 2026-005 | Crítico — prioridade alta'),
(6,  'Condomínio Solar das Flores',      'São Paulo',        'Contrato n° 2026-006 | Residencial 36 painéis'),
(7,  'Posto Alvorada Combustíveis',      'Guarulhos',        'Contrato n° 2026-007 | Comercial 50 painéis'),
(8,  'Granja Silva',                     'Itu',              'Contrato n° 2026-008 | Rural — manutenção preventiva'),
(9,  'Escola Estadual Dom Pedro II',     'Campinas',         'Contrato n° 2026-009 | Programa energia solar pública'),
(10, 'Shopping Bela Vista',              'São Bernardo do Campo', 'Contrato n° 2026-010 | Grande porte 200 painéis');

SELECT setval('cliente_id_seq', (SELECT MAX(id) FROM cliente));


-- ---------------------------------------------------------
-- 4. USUARIO (10 usuários — senhas com hash bcrypt de "Senha123!")
-- ---------------------------------------------------------
INSERT INTO usuario (id, nome, email, senha, id_perfil, id_equipe) VALUES
(1,  'Carlos Administrador', 'admin@zl.com.br',              '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaVzgEMlzNJ8UcSTH4DY.5XCa', 1, NULL),
(2,  'Ana Souza',            'engenharia@zlengenharia.com',  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaVzgEMlzNJ8UcSTH4DY.5XCa', 2, 3),
(3,  'Fernanda Financeiro',  'financeiro@zl.com.br',         '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaVzgEMlzNJ8UcSTH4DY.5XCa', 3, NULL),
(4,  'Roberto Leitor',       'leitor@zl.com.br',             '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaVzgEMlzNJ8UcSTH4DY.5XCa', 4, NULL),
(5,  'Marcos Instalador',    'instalador@zl.com.br',         '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaVzgEMlzNJ8UcSTH4DY.5XCa', 5, 3),
(6,  'Paulo Engenheiro',     'paulo.eng@zl.com.br',          '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaVzgEMlzNJ8UcSTH4DY.5XCa', 2, 1),
(7,  'Julia Engenheira',     'julia.eng@zl.com.br',          '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaVzgEMlzNJ8UcSTH4DY.5XCa', 2, 2),
(8,  'Diego Instalador',     'diego.campo@zl.com.br',        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaVzgEMlzNJ8UcSTH4DY.5XCa', 5, 1),
(9,  'Beatriz Instaladora',  'beatriz.campo@zl.com.br',      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaVzgEMlzNJ8UcSTH4DY.5XCa', 5, 2),
(10, 'Lucas Financeiro',     'lucas.fin@zl.com.br',          '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaVzgEMlzNJ8UcSTH4DY.5XCa', 3, NULL);

SELECT setval('usuario_id_seq', (SELECT MAX(id) FROM usuario));


-- ---------------------------------------------------------
-- 5. OBRA (10 obras — base dos cards do Kanban)
-- ---------------------------------------------------------
INSERT INTO obra (id, status, categoria, quantidade_paineis, data_inicio_estimada, data_fim_estimada, data_inicio_real, data_fim_real, id_cliente) VALUES
(301, 'MaterialComprado', 'Comercial',    45,  '2026-09-20', '2026-10-06', NULL,         NULL,         1),
(302, 'MaterialComprado', 'Industrial',   120, '2026-10-01', '2026-10-25', NULL,         NULL,         2),
(303, 'NoDeposito',       'Residencial',  24,  '2026-10-05', '2026-10-14', NULL,         NULL,         3),
(304, 'Separado',         'Rural',        80,  '2026-10-01', '2026-10-08', NULL,         NULL,         4),
(305, 'EmAndamento',      'Comercial',    96,  '2026-09-25', '2026-10-02', '2026-09-26', NULL,         5),
(306, 'EmAndamento',      'Residencial',  36,  '2026-09-28', '2026-10-04', '2026-09-29', NULL,         6),
(307, 'Concluido',        'Comercial',    50,  '2026-09-05', '2026-09-18', '2026-09-06', '2026-09-17', 7),
(308, 'Assistencia',      'Manutenção',   30,  '2026-10-10', '2026-10-12', NULL,         NULL,         8),
(309, 'NoDeposito',       'Comercial',    60,  '2026-10-08', '2026-10-20', NULL,         NULL,         9),
(310, 'MaterialComprado', 'Comercial',    200, '2026-10-15', '2026-11-10', NULL,         NULL,         10);

SELECT setval('obra_id_seq', (SELECT MAX(id) FROM obra));


-- ---------------------------------------------------------
-- 6. PAGAMENTO (1 por obra)
-- ---------------------------------------------------------
INSERT INTO pagamento (id, data_confirmacao, prazo_contratual_dias, id_obra) VALUES
(1,  '2026-09-15', 45, 301),
(2,  '2026-09-20', 60, 302),
(3,  '2026-09-28', 30, 303),
(4,  '2026-09-18', 45, 304),
(5,  '2026-09-10', 30, 305),
(6,  '2026-09-22', 30, 306),
(7,  '2026-08-20', 45, 307),
(8,  '2026-10-01', 15, 308),
(9,  '2026-09-30', 45, 309),
(10, '2026-10-05', 90, 310);

SELECT setval('pagamento_id_seq', (SELECT MAX(id) FROM pagamento));


-- ---------------------------------------------------------
-- 7. HOMOLOGACAO (1 por obra)
-- ---------------------------------------------------------
INSERT INTO homologacao (id, parecer_acesso, art_trt, prazo_vistoria, atualizado_em, id_obra) VALUES
(1,  'Aprovado',  'ART-2026-0301',  '2026-10-10', '2026-09-20 10:00:00', 301),
(2,  'Pendente',  NULL,             '2026-10-28', '2026-09-21 09:00:00', 302),
(3,  'EmAnalise', 'ART-2026-0303',  '2026-10-18', '2026-10-01 14:00:00', 303),
(4,  'Aprovado',  'ART-2026-0304',  '2026-10-12', '2026-09-25 11:00:00', 304),
(5,  'Aprovado',  'ART-2026-0305',  '2026-10-05', '2026-09-12 16:00:00', 305),
(6,  'EmAnalise', 'ART-2026-0306',  '2026-10-08', '2026-09-30 08:30:00', 306),
(7,  'Aprovado',  'ART-2026-0307',  '2026-09-20', '2026-09-05 10:00:00', 307),
(8,  'Pendente',  NULL,             NULL,          '2026-10-02 07:00:00', 308),
(9,  'Pendente',  NULL,             '2026-10-25', '2026-10-01 15:00:00', 309),
(10, 'Pendente',  NULL,             '2026-11-15', '2026-10-05 09:00:00', 310);

SELECT setval('homologacao_id_seq', (SELECT MAX(id) FROM homologacao));


-- ---------------------------------------------------------
-- 8. MATERIAL (múltiplos por obra, total > 10)
-- ---------------------------------------------------------
INSERT INTO material (id, tipo, quantidade, status_logistico, id_obra) VALUES
(501, 'Painel Solar 550W',     45,  'EmTransito', 301),
(502, 'Inversor 5kW',          2,   'Disponivel', 301),
(503, 'Cabo Solar 6mm',        200, 'Comprado',   301),
(504, 'Painel Solar 550W',     120, 'Comprado',   302),
(505, 'Inversor 10kW',         6,   'Comprado',   302),
(506, 'Painel Solar 400W',     24,  'Disponivel', 303),
(507, 'Inversor 3kW',          1,   'Disponivel', 303),
(508, 'Painel Solar 550W',     80,  'Disponivel', 304),
(509, 'Inversor 8kW',          4,   'Disponivel', 304),
(510, 'Painel Solar 550W',     96,  'Utilizado',  305),
(511, 'Inversor 10kW',         5,   'Utilizado',  305),
(512, 'Painel Solar 400W',     36,  'Utilizado',  306),
(513, 'Inversor 3kW',          2,   'Utilizado',  306),
(514, 'Painel Solar 550W',     50,  'Utilizado',  307),
(515, 'Painel Solar 400W',     30,  'Comprado',   308);

SELECT setval('material_id_seq', (SELECT MAX(id) FROM material));


-- ---------------------------------------------------------
-- 9. COMENTARIO (pelo menos 10)
-- ---------------------------------------------------------
INSERT INTO comentario (id, descricao, data_registro, id_obra, id_usuario) VALUES
(701, 'Material conferido no depósito, tudo OK.',                     '2026-09-22 10:30:00', 301, 2),
(702, 'Cliente confirmou acesso ao telhado para terça-feira.',        '2026-09-25 14:00:00', 301, 2),
(703, 'Aguardando chegada dos inversores para liberar separação.',    '2026-10-01 09:15:00', 302, 6),
(704, 'Equipe alocada para semana que vem, ok com o cliente.',        '2026-10-01 11:00:00', 303, 7),
(705, 'Estrutura metálica do telhado precisa de reforço antes da instalação.', '2026-09-30 16:45:00', 304, 2),
(706, 'Instalação iniciada. Tempo estimado 3 dias.',                  '2026-09-26 08:00:00', 305, 2),
(707, 'Equipe 02 adiantou 1 dia no cronograma.',                      '2026-09-29 17:00:00', 306, 7),
(708, 'Obra finalizada. Laudo técnico emitido e enviado ao cliente.', '2026-09-17 15:30:00', 307, 1),
(709, 'Problema no inversor principal identificado em vistoria.',     '2026-10-02 07:30:00', 308, 5),
(710, 'Documentação contratual enviada para homologação.',            '2026-10-02 10:00:00', 309, 2),
(711, 'Reunião de briefing realizada com equipe de engenharia do shopping.', '2026-10-06 14:00:00', 310, 1);

SELECT setval('comentario_id_seq', (SELECT MAX(id) FROM comentario));


-- ---------------------------------------------------------
-- 10. HISTORICO_OBRA (pelo menos 10 — rastreia as transições)
-- ---------------------------------------------------------
INSERT INTO historico_obra (id, status_anterior, status_novo, data_alteracao, observacao, id_obra, id_usuario) VALUES
(9001, NULL,              'MaterialComprado', '2026-09-20 09:00:00', 'Obra criada no sistema.',                  301, 1),
(9002, NULL,              'MaterialComprado', '2026-09-21 10:00:00', 'Obra criada no sistema.',                  302, 1),
(9003, NULL,              'MaterialComprado', '2026-09-28 11:00:00', 'Obra criada no sistema.',                  303, 2),
(9004, 'MaterialComprado','NoDeposito',       '2026-10-01 14:00:00', 'Material chegou ao depósito.',             303, 6),
(9005, NULL,              'MaterialComprado', '2026-09-18 09:30:00', 'Obra criada no sistema.',                  304, 2),
(9006, 'MaterialComprado','NoDeposito',       '2026-09-22 10:00:00', 'Material recebido e conferido.',           304, 2),
(9007, 'NoDeposito',      'Separado',         '2026-09-28 15:00:00', 'Kits separados por endereço de entrega.',  304, 6),
(9008, NULL,              'MaterialComprado', '2026-09-10 08:00:00', 'Obra criada no sistema.',                  305, 1),
(9009, 'MaterialComprado','NoDeposito',       '2026-09-15 11:00:00', 'Material no depósito.',                    305, 2),
(9010, 'NoDeposito',      'Separado',         '2026-09-20 13:00:00', 'Separação concluída.',                     305, 6),
(9011, 'Separado',        'EmAndamento',      '2026-09-26 08:00:00', 'Equipe iniciou instalação hoje.',          305, 2),
(9012, 'Separado',        'EmAndamento',      '2026-09-29 08:30:00', 'Equipe 02 a caminho do local.',            306, 7),
(9013, 'EmAndamento',     'Concluido',        '2026-09-17 16:00:00', 'Instalação concluída. Sistema ligado.',    307, 2),
(9014, 'Concluido',       'Assistencia',      '2026-10-02 07:00:00', 'Cliente relatou problema no inversor.',    308, 5);

SELECT setval('historico_obra_id_seq', (SELECT MAX(id) FROM historico_obra));


-- ---------------------------------------------------------
-- 11. PROGRAMACAO_OBRA (alocações do Gantt — base dos fixtures)
-- ---------------------------------------------------------
INSERT INTO programacao_obra (id, data_inicio, data_fim, prioridade, duracao_estimada_dias, id_obra, id_equipe) VALUES
(601, '2026-10-01', '2026-10-03', 1, 2.0, 301, 1),
(602, '2026-10-06', '2026-10-10', 2, 4.0, 302, 1),
(603, '2026-10-02', '2026-10-06', 1, 2.0, 303, 2),
(604, '2026-10-07', '2026-10-10', 2, 3.0, 305, 2),
(605, '2026-10-01', '2026-10-07', 1, 4.0, 304, 3),
(606, '2026-10-08', '2026-10-10', 2, 2.0, 306, 3),
(607, '2026-10-13', '2026-10-17', 3, 4.5, 309, 1),
(608, '2026-10-20', '2026-11-07', 3, 14.0,310, 2),
(609, '2026-10-09', '2026-10-10', 1, 1.0, 308, 7),
(610, '2026-10-14', '2026-10-18', 3, 3.5, 302, 4);

SELECT setval('programacao_obra_id_seq', (SELECT MAX(id) FROM programacao_obra));


-- ---------------------------------------------------------
-- 12. RELATORIO_CUSTO (1 por obra — custo_total é calculado)
-- ---------------------------------------------------------
INSERT INTO relatorio_custo (id, custo_mao_obra, custo_insumos, id_obra) VALUES
(1,  8500.00,  21300.50, 301),
(2,  18000.00, 58400.00, 302),
(3,  4200.00,  9800.00,  303),
(4,  12000.00, 32000.00, 304),
(5,  14500.00, 43200.00, 305),
(6,  6800.00,  14400.00, 306),
(7,  9200.00,  22500.00, 307),
(8,  3500.00,  1200.00,  308),
(9,  10500.00, 28000.00, 309),
(10, 35000.00, 98000.00, 310);

SELECT setval('relatorio_custo_id_seq', (SELECT MAX(id) FROM relatorio_custo));
