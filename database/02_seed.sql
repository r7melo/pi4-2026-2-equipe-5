SET client_encoding = 'UTF8';
BEGIN;

INSERT INTO perfil_acesso (id, nome_perfil, permissoes) VALUES
(1, 'Administrador',      '*'),
(2, 'EngenhariaObras',    'obras:criar,obras:mover,programacoes:editar'),
(3, 'Financeiro',         'financeiro:visualizar,relatorios:visualizar'),
(4, 'VisualizadorLeitor', 'obras:visualizar'),
(5, 'InstaladorCampo',    'obras:visualizar,materiais:confirmar');

SELECT setval('perfil_acesso_id_seq', (SELECT MAX(id) FROM perfil_acesso));

INSERT INTO equipe (id, nome, especialidade, id_responsavel) VALUES
(1,  'Equipe 01', 'Instalação Residencial', 8),
(2,  'Equipe 02', 'Instalação Comercial', 9),
(3,  'Equipe 03', 'Instalação Industrial', 5),
(4,  'Equipe 04', 'Instalação Rural', 11),
(5,  'Equipe 05', 'Instalação Residencial', 12),
(6,  'Equipe 06', 'Instalação Comercial', 13),
(7,  'Equipe 07', 'Manutenção e Assistência', 14),
(8,  'Equipe 08', 'Instalação Industrial', 15),
(9,  'Equipe 09', 'Instalação Rural', 16),
(10, 'Equipe 10', 'Manutenção e Assistência', 17);

SELECT setval('equipe_id_seq', (SELECT MAX(id) FROM equipe));

INSERT INTO cliente (id, nome, cidade, dados_contrato, cpf_cnpj, endereco) VALUES
(1,  'Rede Alfa Supermercados',          'Campinas',         'Contrato n° 2026-001 | Projeto comercial 45 painéis', '12345678000195', 'Rua Alfa, 101'),
(2,  'Indústria Metalúrgica Ramos',      'Sorocaba',         'Contrato n° 2026-002 | Galpão industrial 120 painéis', '12345678000276', 'Rua Industrial, 202'),
(3,  'Residencial Vista Verde — Bloco A','Campinas',         'Contrato n° 2026-003 | Condomínio 24 painéis', '12345678000357', 'Rua Verde, 303'),
(4,  'Fazenda Santa Maria',              'Itapetininga',     'Contrato n° 2026-004 | Área rural 80 painéis', '12345678000438', 'Estrada Rural, km 4'),
(5,  'Hospital São Lucas',               'Santos',           'Contrato n° 2026-005 | Crítico — prioridade alta', '12345678000519', 'Avenida Saúde, 505'),
(6,  'Condomínio Solar das Flores',      'São Paulo',        'Contrato n° 2026-006 | Residencial 36 painéis', '12345678000608', 'Rua das Flores, 606'),
(7,  'Posto Alvorada Combustíveis',      'Guarulhos',        'Contrato n° 2026-007 | Comercial 50 painéis', '12345678000780', 'Avenida Alvorada, 707'),
(8,  'Granja Silva',                     'Itu',              'Contrato n° 2026-008 | Rural — manutenção preventiva', '12345678000861', 'Estrada da Granja, km 8'),
(9,  'Escola Estadual Dom Pedro II',     'Campinas',         'Contrato n° 2026-009 | Programa energia solar pública', '12345678000942', 'Rua Escolar, 909'),
(10, 'Shopping Bela Vista',              'São Bernardo do Campo', 'Contrato n° 2026-010 | Grande porte 200 painéis', '12345678001086', 'Avenida Bela Vista, 1010');

SELECT setval('cliente_id_seq', (SELECT MAX(id) FROM cliente));

INSERT INTO usuario (id, nome, email, senha, id_perfil, id_equipe) VALUES
(1,  'Carlos Administrador', 'admin@zl.com.br',              '$2b$12$hkTtA7rMA1J8/gfBHvzHme.rGJzrqOg6RVBhDOxK5tUOjhPcQPxaO', 1, NULL),
(2,  'Ana Souza',            'engenharia@zlengenharia.com',  '$2b$12$hkTtA7rMA1J8/gfBHvzHme.rGJzrqOg6RVBhDOxK5tUOjhPcQPxaO', 2, 3),
(3,  'Fernanda Financeiro',  'financeiro@zl.com.br',         '$2b$12$hkTtA7rMA1J8/gfBHvzHme.rGJzrqOg6RVBhDOxK5tUOjhPcQPxaO', 3, NULL),
(4,  'Roberto Leitor',       'leitor@zl.com.br',             '$2b$12$hkTtA7rMA1J8/gfBHvzHme.rGJzrqOg6RVBhDOxK5tUOjhPcQPxaO', 4, NULL),
(5,  'Marcos Instalador',    'instalador@zl.com.br',         '$2b$12$hkTtA7rMA1J8/gfBHvzHme.rGJzrqOg6RVBhDOxK5tUOjhPcQPxaO', 5, 3),
(6,  'Paulo Engenheiro',     'paulo.eng@zl.com.br',          '$2b$12$hkTtA7rMA1J8/gfBHvzHme.rGJzrqOg6RVBhDOxK5tUOjhPcQPxaO', 2, 1),
(7,  'Julia Engenheira',     'julia.eng@zl.com.br',          '$2b$12$hkTtA7rMA1J8/gfBHvzHme.rGJzrqOg6RVBhDOxK5tUOjhPcQPxaO', 2, 2),
(8,  'Diego Instalador',     'diego.campo@zl.com.br',        '$2b$12$hkTtA7rMA1J8/gfBHvzHme.rGJzrqOg6RVBhDOxK5tUOjhPcQPxaO', 5, 1),
(9,  'Beatriz Instaladora',  'beatriz.campo@zl.com.br',      '$2b$12$hkTtA7rMA1J8/gfBHvzHme.rGJzrqOg6RVBhDOxK5tUOjhPcQPxaO', 5, 2),
(10, 'Lucas Financeiro',     'lucas.fin@zl.com.br',          '$2b$12$hkTtA7rMA1J8/gfBHvzHme.rGJzrqOg6RVBhDOxK5tUOjhPcQPxaO', 3, NULL),
(11, 'Instalador Equipe 04', 'instalador04@zl.com.br', '$2b$12$hkTtA7rMA1J8/gfBHvzHme.rGJzrqOg6RVBhDOxK5tUOjhPcQPxaO', 5, 4),
(12, 'Instalador Equipe 05', 'instalador05@zl.com.br', '$2b$12$hkTtA7rMA1J8/gfBHvzHme.rGJzrqOg6RVBhDOxK5tUOjhPcQPxaO', 5, 5),
(13, 'Instalador Equipe 06', 'instalador06@zl.com.br', '$2b$12$hkTtA7rMA1J8/gfBHvzHme.rGJzrqOg6RVBhDOxK5tUOjhPcQPxaO', 5, 6),
(14, 'Instalador Equipe 07', 'instalador07@zl.com.br', '$2b$12$hkTtA7rMA1J8/gfBHvzHme.rGJzrqOg6RVBhDOxK5tUOjhPcQPxaO', 5, 7),
(15, 'Instalador Equipe 08', 'instalador08@zl.com.br', '$2b$12$hkTtA7rMA1J8/gfBHvzHme.rGJzrqOg6RVBhDOxK5tUOjhPcQPxaO', 5, 8),
(16, 'Instalador Equipe 09', 'instalador09@zl.com.br', '$2b$12$hkTtA7rMA1J8/gfBHvzHme.rGJzrqOg6RVBhDOxK5tUOjhPcQPxaO', 5, 9),
(17, 'Instalador Equipe 10', 'instalador10@zl.com.br', '$2b$12$hkTtA7rMA1J8/gfBHvzHme.rGJzrqOg6RVBhDOxK5tUOjhPcQPxaO', 5, 10);

SELECT setval('usuario_id_seq', (SELECT MAX(id) FROM usuario));

INSERT INTO equipe_instalador (id_equipe, id_usuario) VALUES
(1, 8), (2, 9), (3, 5), (4, 11), (5, 12), (6, 13), (7, 14), (8, 15), (9, 16), (10, 17);

INSERT INTO obra (id, status, categoria, quantidade_paineis, data_inicio_estimada, data_fim_estimada, data_inicio_real, data_fim_real, id_cliente, quantidade_inversores, endereco) VALUES
(301, 'MaterialComprado', 'Comercial', 45, '2026-09-20', '2026-10-06', NULL, NULL, 1, 2, 'Rua Alfa, 101'),
(302, 'MaterialComprado', 'Industrial', 120, '2026-10-01', '2026-10-25', NULL, NULL, 2, 6, 'Rua Industrial, 202'),
(303, 'NoDeposito', 'Residencial', 24, '2026-10-05', '2026-10-14', NULL, NULL, 3, 1, 'Rua Verde, 303'),
(304, 'Separado', 'Rural', 80, '2026-10-01', '2026-10-08', NULL, NULL, 4, 4, 'Estrada Rural, km 4'),
(305, 'EmAndamento', 'Comercial', 96, '2026-09-25', '2026-10-02', '2026-09-26', NULL, 5, 5, 'Avenida Saúde, 505'),
(306, 'EmAndamento', 'Residencial', 36, '2026-09-28', '2026-10-04', '2026-09-29', NULL, 6, 2, 'Rua das Flores, 606'),
(307, 'Concluido', 'Comercial', 50, '2026-09-05', '2026-09-18', '2026-09-06', '2026-09-17', 7, 3, 'Avenida Alvorada, 707'),
(308, 'Assistencia', 'Manutenção', 30, '2026-10-10', '2026-10-12', NULL, NULL, 8, 1, 'Estrada da Granja, km 8'),
(309, 'NoDeposito', 'Comercial', 60, '2026-10-08', '2026-10-20', NULL, NULL, 9, 3, 'Rua Escolar, 909'),
(310, 'MaterialComprado', 'Comercial', 200, '2026-10-15', '2026-11-10', NULL, NULL, 10, 10, 'Avenida Bela Vista, 1010');

SELECT setval('obra_id_seq', (SELECT MAX(id) FROM obra));

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

INSERT INTO material (id, tipo, quantidade, status_logistico, id_obra, quantidade_utilizada, custo_unitario) VALUES
(501, 'Painel Solar 550W', 45, 'EmTransito', 301, 0, 350.00),
(502, 'Inversor 5kW', 2, 'Disponivel', 301, 0, 1200.00),
(503, 'Cabo Solar 6mm', 200, 'Comprado', 301, 0, 8.50),
(504, 'Painel Solar 550W', 120, 'Comprado', 302, 0, 350.00),
(505, 'Inversor 10kW', 6, 'Comprado', 302, 0, 1200.00),
(506, 'Painel Solar 400W', 24, 'Disponivel', 303, 0, 350.00),
(507, 'Inversor 3kW', 1, 'Disponivel', 303, 0, 1200.00),
(508, 'Painel Solar 550W', 80, 'Disponivel', 304, 0, 350.00),
(509, 'Inversor 8kW', 4, 'Disponivel', 304, 0, 1200.00),
(510, 'Painel Solar 550W', 96, 'Utilizado', 305, 96, 350.00),
(511, 'Inversor 10kW', 5, 'Utilizado', 305, 5, 1200.00),
(512, 'Painel Solar 400W', 36, 'Utilizado', 306, 36, 350.00),
(513, 'Inversor 3kW', 2, 'Utilizado', 306, 2, 1200.00),
(514, 'Painel Solar 550W', 50, 'Utilizado', 307, 50, 350.00),
(515, 'Painel Solar 400W', 30, 'Comprado', 308, 0, 350.00);

SELECT setval('material_id_seq', (SELECT MAX(id) FROM material));

INSERT INTO comentario (id, descricao, data_registro, id_obra, id_usuario, tipo) VALUES
(701, 'Material conferido no depósito, tudo OK.', '2026-09-22 10:30:00', 301, 2, 'Cartao'),
(702, 'Cliente confirmou acesso ao telhado para terça-feira.', '2026-09-25 14:00:00', 301, 2, 'Cartao'),
(703, 'Aguardando chegada dos inversores para liberar separação.', '2026-10-01 09:15:00', 302, 6, 'Cartao'),
(704, 'Equipe alocada para semana que vem, ok com o cliente.', '2026-10-01 11:00:00', 303, 7, 'Cartao'),
(705, 'Estrutura metálica do telhado precisa de reforço antes da instalação.', '2026-09-30 16:45:00', 304, 2, 'Cartao'),
(706, 'Instalação iniciada. Tempo estimado 3 dias.', '2026-09-26 08:00:00', 305, 2, 'Cartao'),
(707, 'Equipe 02 adiantou 1 dia no cronograma.', '2026-09-29 17:00:00', 306, 7, 'Cartao'),
(708, 'Obra finalizada. Laudo técnico emitido e enviado ao cliente.', '2026-09-17 15:30:00', 307, 1, 'Timeline'),
(709, 'Problema no inversor principal identificado em vistoria.', '2026-10-02 07:30:00', 308, 5, 'Manutencao'),
(710, 'Documentação contratual enviada para homologação.', '2026-10-02 10:00:00', 309, 2, 'Cartao'),
(711, 'Reunião de briefing realizada com equipe de engenharia do shopping.', '2026-10-06 14:00:00', 310, 1, 'Cartao');

SELECT setval('comentario_id_seq', (SELECT MAX(id) FROM comentario));

INSERT INTO historico_obra (id, tipo_acao, status_anterior, status_novo, data_alteracao, observacao, id_obra, id_usuario) VALUES
(9001, 'Cadastro', NULL, 'MaterialComprado', '2026-09-20 09:00:00', 'Obra criada no sistema.', 301, 1),
(9002, 'Cadastro', NULL, 'MaterialComprado', '2026-09-21 10:00:00', 'Obra criada no sistema.', 302, 1),
(9003, 'Cadastro', NULL, 'MaterialComprado', '2026-09-28 11:00:00', 'Obra criada no sistema.', 303, 2),
(9004, 'MudancaStatus', 'MaterialComprado', 'NoDeposito', '2026-10-01 14:00:00', 'Material chegou ao depósito.', 303, 6),
(9005, 'Cadastro', NULL, 'MaterialComprado', '2026-09-18 09:30:00', 'Obra criada no sistema.', 304, 2),
(9006, 'MudancaStatus', 'MaterialComprado', 'NoDeposito', '2026-09-22 10:00:00', 'Material recebido e conferido.', 304, 2),
(9007, 'MudancaStatus', 'NoDeposito', 'Separado', '2026-09-28 15:00:00', 'Kits separados por endereço de entrega.', 304, 6),
(9008, 'Cadastro', NULL, 'MaterialComprado', '2026-09-10 08:00:00', 'Obra criada no sistema.', 305, 1),
(9009, 'MudancaStatus', 'MaterialComprado', 'NoDeposito', '2026-09-15 11:00:00', 'Material no depósito.', 305, 2),
(9010, 'MudancaStatus', 'NoDeposito', 'Separado', '2026-09-20 13:00:00', 'Separação concluída.', 305, 6),
(9011, 'MudancaStatus', 'Separado', 'EmAndamento', '2026-09-26 08:00:00', 'Equipe iniciou instalação hoje.', 305, 2),
(9012, 'MudancaStatus', 'Separado', 'EmAndamento', '2026-09-29 08:30:00', 'Equipe 02 a caminho do local.', 306, 7),
(9013, 'MudancaStatus', 'EmAndamento', 'Concluido', '2026-09-17 16:00:00', 'Instalação concluída. Sistema ligado.', 307, 2),
(9014, 'MudancaStatus', 'Concluido', 'Assistencia', '2026-10-02 07:00:00', 'Cliente relatou problema no inversor.', 308, 5);

SELECT setval('historico_obra_id_seq', (SELECT MAX(id) FROM historico_obra));

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

INSERT INTO relatorio_custo (id, custo_mao_obra, custo_insumos, id_obra, valor_obra) VALUES
(1, 8500.00, 21300.50, 301, NULL),
(2, 18000.00, 58400.00, 302, NULL),
(3, 4200.00, 9800.00, 303, NULL),
(4, 12000.00, 32000.00, 304, NULL),
(5, 14500.00, 43200.00, 305, NULL),
(6, 6800.00, 14400.00, 306, NULL),
(7, 9200.00, 22500.00, 307, 45000.00),
(8, 3500.00, 1200.00, 308, NULL),
(9, 10500.00, 28000.00, 309, NULL),
(10, 35000.00, 98000.00, 310, NULL);

SELECT setval('relatorio_custo_id_seq', (SELECT MAX(id) FROM relatorio_custo));

INSERT INTO manutencao (id, descricao, status, data_conclusao, id_obra, id_equipe) VALUES
(1, 'Revisão do inversor principal', 'Pendente', NULL, 308, 7),
(2, 'Inspeção preventiva após instalação', 'Concluida', '2026-09-20 14:00:00', 307, 10);
SELECT setval('manutencao_id_seq', (SELECT MAX(id) FROM manutencao));

UPDATE comentario SET id_manutencao = 1 WHERE id = 709;

INSERT INTO audit_log (id_usuario, acao, entidade, entidade_id, detalhes) VALUES
(1, 'Cadastro', 'obra', 301, '{"origem":"seed"}'::jsonb);

INSERT INTO cronograma_compartilhado (token, data_inicio, data_fim, expira_em, id_usuario) VALUES
('seed-cronograma-2026-10', '2026-10-01', '2026-10-31', '2026-11-01 00:00:00+00', 2);

COMMIT;
