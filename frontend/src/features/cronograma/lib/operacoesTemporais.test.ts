import { expect, it } from 'vitest';
import { useOperacoesTemporais } from '../stores/useOperacoesTemporais';

it('incerteza é da sessão/operação e somente consulta confirmada a libera', () => {
  const s=useOperacoesTemporais.getState();
  expect(s.reservar(100,'nova')).toBe(true);
  s.marcar(100,'nova','incerta');
  expect(s.reservar(100,'601')).toBe(false);
  s.confirmarConsulta(99);
  expect(s.reservar(100,'nova')).toBe(false);
  s.confirmarConsulta(100);
  expect(s.reservar(100,'601')).toBe(true);
  expect(s.reservar(101,'nova')).toBe(true);
  s.marcar(100,'601','incerta');
  expect(useOperacoesTemporais.getState().sessao).toBe(101);
  expect(useOperacoesTemporais.getState().fases).toEqual({nova:'enviando'});
});
