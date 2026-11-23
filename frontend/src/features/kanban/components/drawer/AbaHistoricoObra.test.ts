import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { AbaHistoricoObra } from './AbaHistoricoObra';

it('distingue cadastro e comentário de movimentação sem imprimir estados vazios', () => {
  const html = renderToStaticMarkup(createElement(AbaHistoricoObra, { historico: [
    { id: 1, tipoAcao: 'Cadastro', usuarioNome: 'Ana', dataAlteracao: '2026-11-23', statusAnterior: null, statusNovo: 'Separado' },
    { id: 2, tipoAcao: 'Comentario', usuarioNome: 'Ana', dataAlteracao: '2026-11-23', statusAnterior: null, statusNovo: null },
  ] }));
  expect(html).toContain('Obra cadastrada');
  expect(html).toContain('Comentário registrado');
  expect(html).not.toContain('De <strong>');
  expect(html).not.toContain('undefined');
});
