--  proposta_03_seed_qa.sql
--  ZL Engenharia Solar - dados complementares para os casos de teste do QA
--
--  PROPOSTA para validação do Backend 1 (ver docs/qa/03_Dados_Carga_Inicial.md).
--  Não está em database/ de propósito: lá os scripts rodam automaticamente
--  no initdb do PostgreSQL. Se aprovado, mover para database/03_seed_qa.sql.
--
--  Somente INSERTs: não altera nenhum registro do 02_seed.sql.
--  Datas das programações usam apenas dias úteis (RF-09).
--  Duração = arredondamento para cima de (painéis / 9) - regra a confirmar (RF-08).

SET client_encoding = 'UTF8';


-- ---------------------------------------------------------
-- 1. CLIENTE (11 a 16)
-- ---------------------------------------------------------
INSERT INTO cliente (id, nome, cidade, dados_contrato) VALUES
(11, 'Padaria Pão Dourado',        'Campinas',    'Contrato n° 2026-011 | QA cadeia RF-09'),
(12, 'Clínica Bem Viver',          'Valinhos',    'Contrato n° 2026-012 | QA cadeia RF-09'),
(13, 'Residência Família Costa',   'Vinhedo',     'Contrato n° 2026-013 | QA cadeia RF-09'),
(14, 'Mercado Bom Preço',          'Indaiatuba',  'Contrato n° 2026-014 | QA cadeia RF-09'),
(15, 'Oficina Mecânica Torque',    'Sumaré',      'Contrato n° 2026-015 | QA cadeia RF-09'),
(16, 'Academia Corpo em Forma',    'Hortolândia', 'Contrato n° 2026-016 | QA alocação limpa e custo inexistente');

SELECT setval('cliente_id_seq', (SELECT MAX(id) FROM cliente));


-- ---------------------------------------------------------
-- 2. OBRA (311 a 316)
-- 311-315: cadeia da Equipe 06 para teste de propagação (RF-09)
-- 316: sem programação e sem relatório de custo (CT-04 e CT-05)
-- ---------------------------------------------------------
INSERT INTO obra (id, status, categoria, quantidade_paineis, data_inicio_estimada, data_fim_estimada, data_inicio_real, data_fim_real, id_cliente) VALUES
(311, 'Separado',         'Comercial',   18, '2026-10-19', '2026-10-20', NULL, NULL, 11),
(312, 'Separado',         'Comercial',   27, '2026-10-21', '2026-10-23', NULL, NULL, 12),
(313, 'Separado',         'Residencial',  9, '2026-10-26', '2026-10-26', NULL, NULL, 13),
(314, 'Separado',         'Comercial',   18, '2026-10-27', '2026-10-28', NULL, NULL, 14),
(315, 'Separado',         'Comercial',   36, '2026-10-29', '2026-11-03', NULL, NULL, 15),
(316, 'MaterialComprado', 'Comercial',   90, '2026-10-26', '2026-11-06', NULL, NULL, 16);

SELECT setval('obra_id_seq', (SELECT MAX(id) FROM obra));


-- ---------------------------------------------------------
-- 3. PAGAMENTO e HOMOLOGACAO (1:1 com obra)
-- ---------------------------------------------------------
INSERT INTO pagamento (id, data_confirmacao, prazo_contratual_dias, id_obra) VALUES
(11, '2026-10-01', 30, 311),
(12, '2026-10-01', 30, 312),
(13, '2026-10-01', 30, 313),
(14, '2026-10-01', 30, 314),
(15, '2026-10-01', 45, 315),
(16, '2026-10-02', 45, 316);

SELECT setval('pagamento_id_seq', (SELECT MAX(id) FROM pagamento));

INSERT INTO homologacao (id, parecer_acesso, art_trt, prazo_vistoria, atualizado_em, id_obra) VALUES
(11, 'Aprovado', 'ART-2026-0311', '2026-10-30', '2026-10-02 10:00:00', 311),
(12, 'Aprovado', 'ART-2026-0312', '2026-10-30', '2026-10-02 10:00:00', 312),
(13, 'Aprovado', 'ART-2026-0313', '2026-10-30', '2026-10-02 10:00:00', 313),
(14, 'Aprovado', 'ART-2026-0314', '2026-11-04', '2026-10-02 10:00:00', 314),
(15, 'Aprovado', 'ART-2026-0315', '2026-11-06', '2026-10-02 10:00:00', 315),
(16, 'Pendente', NULL,            '2026-11-13', '2026-10-02 10:00:00', 316);

SELECT setval('homologacao_id_seq', (SELECT MAX(id) FROM homologacao));


-- ---------------------------------------------------------
-- 4. PROGRAMACAO_OBRA (611 a 615 - cadeia da Equipe 06)
-- Equipe 06 não tem alocações no 02_seed.sql.
-- Resultado esperado ao reordenar 611 para 2026-10-21: ver seção 4 do documento 03.
-- ---------------------------------------------------------
INSERT INTO programacao_obra (id, data_inicio, data_fim, prioridade, duracao_estimada_dias, id_obra, id_equipe) VALUES
(611, '2026-10-19', '2026-10-20', 1, 2.0, 311, 6),
(612, '2026-10-21', '2026-10-23', 2, 3.0, 312, 6),
(613, '2026-10-26', '2026-10-26', 3, 1.0, 313, 6),
(614, '2026-10-27', '2026-10-28', 4, 2.0, 314, 6),
(615, '2026-10-29', '2026-11-03', 5, 4.0, 315, 6);

SELECT setval('programacao_obra_id_seq', (SELECT MAX(id) FROM programacao_obra));


-- ---------------------------------------------------------
-- 5. HISTORICO_OBRA
-- Criação das obras 309 e 310 (ausente no 02_seed.sql) e das novas obras
-- ---------------------------------------------------------
INSERT INTO historico_obra (id, status_anterior, status_novo, data_alteracao, observacao, id_obra, id_usuario) VALUES
(9015, NULL,               'MaterialComprado', '2026-09-30 09:00:00', 'Obra criada no sistema.',       309, 2),
(9016, 'MaterialComprado', 'NoDeposito',       '2026-10-02 10:00:00', 'Material recebido.',            309, 2),
(9017, NULL,               'MaterialComprado', '2026-10-03 09:00:00', 'Obra criada no sistema.',       310, 1),
(9018, NULL,               'MaterialComprado', '2026-10-01 08:00:00', 'Obra criada no sistema.',       311, 2),
(9019, 'MaterialComprado', 'NoDeposito',       '2026-10-01 14:00:00', 'Material recebido.',            311, 2),
(9020, 'NoDeposito',       'Separado',         '2026-10-02 09:00:00', 'Kit separado.',                 311, 2),
(9021, NULL,               'MaterialComprado', '2026-10-01 08:05:00', 'Obra criada no sistema.',       312, 2),
(9022, 'MaterialComprado', 'NoDeposito',       '2026-10-01 14:05:00', 'Material recebido.',            312, 2),
(9023, 'NoDeposito',       'Separado',         '2026-10-02 09:05:00', 'Kit separado.',                 312, 2),
(9024, NULL,               'MaterialComprado', '2026-10-01 08:10:00', 'Obra criada no sistema.',       313, 2),
(9025, 'MaterialComprado', 'NoDeposito',       '2026-10-01 14:10:00', 'Material recebido.',            313, 2),
(9026, 'NoDeposito',       'Separado',         '2026-10-02 09:10:00', 'Kit separado.',                 313, 2),
(9027, NULL,               'MaterialComprado', '2026-10-01 08:15:00', 'Obra criada no sistema.',       314, 2),
(9028, 'MaterialComprado', 'NoDeposito',       '2026-10-01 14:15:00', 'Material recebido.',            314, 2),
(9029, 'NoDeposito',       'Separado',         '2026-10-02 09:15:00', 'Kit separado.',                 314, 2),
(9030, NULL,               'MaterialComprado', '2026-10-01 08:20:00', 'Obra criada no sistema.',       315, 2),
(9031, 'MaterialComprado', 'NoDeposito',       '2026-10-01 14:20:00', 'Material recebido.',            315, 2),
(9032, 'NoDeposito',       'Separado',         '2026-10-02 09:20:00', 'Kit separado.',                 315, 2),
(9033, NULL,               'MaterialComprado', '2026-10-02 08:00:00', 'Obra criada no sistema.',       316, 2);

SELECT setval('historico_obra_id_seq', (SELECT MAX(id) FROM historico_obra));


-- ---------------------------------------------------------
-- 6. COMENTARIO 712 - exclusivo do teste de exclusão pelo Administrador (CT-02)
-- O comentário 710 fica reservado ao teste de bloqueio (HTTP 403).
-- ---------------------------------------------------------
INSERT INTO comentario (id, descricao, data_registro, id_obra, id_usuario) VALUES
(712, 'Comentário de teste QA - pode ser excluído pelo Administrador.', '2026-10-02 11:00:00', 303, 2);

SELECT setval('comentario_id_seq', (SELECT MAX(id) FROM comentario));


-- ---------------------------------------------------------
-- 7. MATERIAL - cabos e disjuntores da obra 307 (balanço do DRE, RF-20)
-- Obra 316 fica propositalmente sem materiais e sem relatorio_custo.
-- ---------------------------------------------------------
INSERT INTO material (id, tipo, quantidade, status_logistico, id_obra) VALUES
(516, 'Cabo Solar 6mm', 180, 'Utilizado', 307),
(517, 'Disjuntor 32A',    4, 'Utilizado', 307);

SELECT setval('material_id_seq', (SELECT MAX(id) FROM material));
