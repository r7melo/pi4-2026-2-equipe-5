SET client_encoding = 'UTF8';
BEGIN;

-- 1. Perfil de acesso inicial (Administrador)
INSERT INTO perfil_acesso (id, nome_perfil, permissoes) VALUES
(1, 'Administrador', '*');

SELECT setval('perfil_acesso_id_seq', (SELECT MAX(id) FROM perfil_acesso));

-- 2. Usuário administrador inicial
INSERT INTO usuario (id, nome, email, senha, id_perfil, id_equipe) VALUES
(1, 'Administrador Default', 'admin@zl.com.br', '$2b$12$hkTtA7rMA1J8/gfBHvzHme.rGJzrqOg6RVBhDOxK5tUOjhPcQPxaO', 1, NULL);

SELECT setval('usuario_id_seq', (SELECT MAX(id) FROM usuario));

-- 3. Log de auditoria inicial
INSERT INTO audit_log (id_usuario, acao, entidade, entidade_id, detalhes) VALUES
(1, 'Cadastro', 'usuario', 1, '{"origem":"seed_base"}'::jsonb);

COMMIT;