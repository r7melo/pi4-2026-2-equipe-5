import type MockAdapter from 'axios-mock-adapter';
import { z } from 'zod';
import { resolverUsuarioAutenticadoMock, erroUsuarioMock } from '../core/auth';
import { extrairDados, extrairQueryParams } from '../core/http';
import { alterarEquipeMock, disponibilidadeTemporal, ocupacaoTemporal, FalhaEquipeTemporal, criarProgramacaoTemporal } from '../dados/equipesTemporais';
import { dataCivilValida, periodoCivilValido } from '@/shared/lib/datasCivis';
import { obterProgramacoesArmazenadas } from '../dados/programacoes';
import type { AlteracaoEquipeTemporal } from '@/shared/types/equipeTemporal';

export function registrarEquipesTemporais(mock: MockAdapter) {
  const gestao = ['Administrador','Engenharia'];
  const id=z.number().int().positive(); const data=z.string().refine(dataCivilValida);
  const datas=z.object({dataEntrada:data,dataSaida:data});
  function executar(config: import('axios').AxiosRequestConfig, escrita: boolean, acao: () => [number,unknown]): [number,unknown] {
    const u=resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if(!u) return erroUsuarioMock(401,'UNAUTHORIZED','Sessão ausente ou expirada.');
    if(escrita&&!gestao.includes(u.perfil.nomePerfil)) return erroUsuarioMock(403,'ACCESS_DENIED','Acesso não permitido.');
    try{return acao();}catch(e){return e instanceof FalhaEquipeTemporal?erroUsuarioMock(e.status,e.codigo,e.message):erroUsuarioMock(400,'VALIDATION_ERROR',e instanceof Error?e.message:'Confira os dados.');}
  }
  mock.onGet(/\/instaladores\/disponibilidade\/?(\?.*)?$/).reply(c=>executar(c,true,()=>{
    const q=extrairQueryParams(c); if(!periodoCivilValido(q.dataInicio,q.dataFim)) return erroUsuarioMock(400,'INVALID_PARAMETER','Informe início e fim válidos.');
    return [200,disponibilidadeTemporal(q.dataInicio,q.dataFim)];
  }));
  mock.onGet(/\/gantt\/ocupacao\/?(\?.*)?$/).reply(c=>executar(c,false,()=>{
    const u=resolverUsuarioAutenticadoMock(c.headers?.Authorization)!;
    if(u.perfil.nomePerfil==='InstaladorCampo') return erroUsuarioMock(403,'ACCESS_DENIED','Acesso não permitido.');
    const q=extrairQueryParams(c); if(!periodoCivilValido(q.dataInicio,q.dataFim)||(Date.parse(q.dataFim)-Date.parse(q.dataInicio))/86400000>366) return erroUsuarioMock(400,'INVALID_PARAMETER','Informe um período de até 366 dias.');
    return [200,ocupacaoTemporal(q.dataInicio,q.dataFim)];
  }));
  mock.onPost(/\/programacoes\/?(\?.*)?$/).reply(c=>executar(c,true,()=>{
    const body=z.object({obraId:id,dataInicio:data,pessoasPrevistas:id,integrantesIds:z.array(id).optional(),prioridade:id.optional()}).parse(extrairDados(c.data));
    return [201,criarProgramacaoTemporal(body)];
  }));
  const rota=/\/programacoes\/(\d+)\/(equipe|integrantes)(?:\/(\d+))?\/?(?:\?.*)?$/;
  for(const metodo of ['post','patch','delete'] as const) {
    const responder = (c: import('axios').AxiosRequestConfig) => executar(c,true,()=>{
      const m=c.url?.match(rota); if(!m) return erroUsuarioMock(404,'ROUTE_NOT_FOUND','Rota não encontrada.');
      const [,programacao,tipo,usuario]=m; const body=extrairDados(c.data);
      let alteracao: AlteracaoEquipeTemporal;
      if(tipo==='equipe'&&metodo==='patch'&&!usuario) alteracao={tipo:'previstas',...z.object({pessoasPrevistas:id}).parse(body)};
      else if(tipo==='integrantes'&&metodo==='post'&&!usuario) {
        const p=obterProgramacoesArmazenadas().find(item=>item.id===Number(programacao));
        const b=z.object({usuarioId:id,dataEntrada:data.optional(),dataSaida:data.optional()}).parse(body);
        alteracao={tipo:'incluir',usuarioId:b.usuarioId,dataEntrada:b.dataEntrada??p?.dataInicio??'',dataSaida:b.dataSaida??p?.dataFim??''};
      } else if(tipo==='integrantes'&&metodo==='patch'&&usuario) alteracao={tipo:'datas',usuarioId:Number(usuario),...datas.parse(body)};
      else if(tipo==='integrantes'&&metodo==='delete'&&usuario) alteracao={tipo:'remover',usuarioId:Number(usuario),dataSaida:extrairQueryParams(c).dataSaida};
      else return erroUsuarioMock(405,'METHOD_NOT_ALLOWED','Método não permitido.');
      return [200,alterarEquipeMock(Number(programacao),alteracao)];
    });
    if(metodo==='post') mock.onPost(rota).reply(responder);
    if(metodo==='patch') mock.onPatch(rota).reply(responder);
    if(metodo==='delete') mock.onDelete(rota).reply(responder);
  }
}
