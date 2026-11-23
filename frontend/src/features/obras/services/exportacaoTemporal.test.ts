import { afterEach, expect, it } from 'vitest';
import type { AxiosAdapter } from 'axios';
import { api } from '@/shared/api/api';
import { consultarDadosInstalacao } from './exportacaoInstalacao';

const original = api.defaults.adapter;
afterEach(() => { api.defaults.adapter = original; });
it('exportação recebe equipe temporal sem consultar cadastro fixo ou perder o resumo', async () => {
  const caminhos: string[] = [];
  const respostas: Record<string, unknown> = {
    '/obras/301': { id: 301, cliente: { nome: 'Cliente' }, endereco: 'Rua A', descricao: 'Instalar' },
    '/obras/301/materiais': [],
    '/programacoes': [{ id: 601, obraId: 301, dataInicio: '2026-11-23', dataFim: '2026-11-25',
      equipe: { pessoasPrevistas: 3, pessoasAlocadas: 0, pessoasFaltantes: 3, pessoaDia: 0, integrantes: [] } }],
  };
  const adapter: AxiosAdapter = async config => {
    const url = config.url ?? '';
    caminhos.push(url);
    if (!(url in respostas)) throw new Error('Consulta inesperada: '+url);
    return { data: respostas[url], status: 200, statusText: 'OK', headers: {}, config };
  };
  api.defaults.adapter = adapter;
  const dados = await consultarDadosInstalacao(301);
  expect(caminhos.sort()).toEqual(['/obras/301', '/obras/301/materiais', '/programacoes'].sort());
  expect(dados.programacoes[0].nomeEquipe).toBe('0/3 pessoas vinculadas');
  expect(dados.programacoes[0].equipeId).toBeNull();
});
