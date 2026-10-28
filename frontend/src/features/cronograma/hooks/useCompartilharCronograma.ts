import { useLayoutEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { PeriodoCompartilhado, VariaveisGeracaoLink } from "@/types";
import { capturarSessaoOperacional, sessaoOperacionalVigente, deveExibirErroLocal, exigirSessaoOperacional } from "@/shared/lib/sessaoOperacao";
import { gerarLinkCompartilhado } from "@/features/cronograma/services/cronogramaPublico";
import { validarLinkRecebido, mensagemFalhaGeracao } from "@/features/cronograma/lib/compartilhamento";

export function useCompartilharCronograma(podeInteragir: () => boolean) {
  const [origem] = useState(capturarSessaoOperacional);
  const montado = useRef(false);
  const enviando = useRef(false);
  useLayoutEffect(() => {
    montado.current = true;
    return () => { montado.current = false; };
  }, []);
  const podeAgir = () => montado.current && sessaoOperacionalVigente(origem) && podeInteragir();
  const mutacao = useMutation({
    mutationKey: ["compartilharCronograma", origem],
    gcTime: 0,
    mutationFn: async ({ periodo, sessao }: VariaveisGeracaoLink) => {
      const resposta = await gerarLinkCompartilhado(periodo, sessao);
      exigirSessaoOperacional(sessao);
      return validarLinkRecebido(resposta, window.location.origin);
    },
    retry: false,
    networkMode: "always",
    onSuccess: (resultado, variaveis) => {
      if (!sessaoOperacionalVigente(variaveis.sessao)) return;
      if (Date.now() >= Date.parse(resultado.expiraEm)) {
        toast.error("O link recebido já expirou. Gere outro link.");
      } else {
        toast.success("Link do cronograma gerado.");
      }
    },
    onError: (erro, variaveis) => {
      if (!sessaoOperacionalVigente(variaveis.sessao) || !deveExibirErroLocal(erro)) return;
      toast.error(mensagemFalhaGeracao(erro));
    },
    onSettled: () => { enviando.current = false; },
  });
  function gerar(periodo: PeriodoCompartilhado) {
    if (!podeAgir() || enviando.current) return;
    enviando.current = true;
    mutacao.mutate({ periodo, sessao: origem });
  }
  return { ...mutacao, gerar, podeAgir, estaEnviando: () => enviando.current };
}
