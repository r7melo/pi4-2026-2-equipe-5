API="${API:-http://localhost:8000/api}"
SENHA='Senha123!'
PASSOU=0
FALHOU=0
RESP="$(mktemp)"

token() {
  curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$1\",\"senha\":\"$SENHA\"}" \
    | python -c "import json,sys;print(json.loads(sys.stdin.buffer.read().decode('utf-8'))['token'])"
}

ADM=$(token admin@zl.com.br)
ENG=$(token engenharia@zlengenharia.com)
FIN=$(token financeiro@zl.com.br)
INS=$(token instalador@zl.com.br)

chamar() {
  local metodo="$1" rota="$2" tok="$3" corpo="$4"
  local args=(-s -o "$RESP" -w "%{http_code}" -X "$metodo" "$API$rota" -H "Authorization: Bearer $tok")
  [ -n "$corpo" ] && args+=(-H "Content-Type: application/json" -d "$corpo")
  curl "${args[@]}"
}

conferir() {
  local acao="$1" perfil="$2" esperado="$3" codigo="$4" obtido
  if [ "$codigo" = "403" ]; then obtido="Negado"; elif [ "$codigo" = "401" ] || [ "$codigo" = "000" ]; then obtido="Erro $codigo"; else obtido="Pode"; fi
  if [ "$esperado" = "$obtido" ]; then
    PASSOU=$((PASSOU + 1)); echo "OK      | $acao | $perfil | esperado $esperado | obtido $obtido ($codigo)"
  else
    FALHOU=$((FALHOU + 1)); echo "FALHOU  | $acao | $perfil | esperado $esperado | obtido $obtido ($codigo) | $(head -c 200 "$RESP")"
  fi
}

linha() {
  local acao="$1" metodo="$2" rota="$3" corpo="$4" eA="$5" eE="$6" eF="$7" eI="$8"
  conferir "$acao" Administrador "$eA" "$(chamar "$metodo" "$rota" "$ADM" "$corpo")"
  conferir "$acao" Engenharia "$eE" "$(chamar "$metodo" "$rota" "$ENG" "$corpo")"
  conferir "$acao" Financeiro "$eF" "$(chamar "$metodo" "$rota" "$FIN" "$corpo")"
  conferir "$acao" Instalador "$eI" "$(chamar "$metodo" "$rota" "$INS" "$corpo")"
}

linha "Ver os proprios dados" GET /auth/me "" Pode Pode Pode Pode
linha "Ver lista de obras" GET /obras "" Pode Pode Pode Negado
linha "Cadastrar obra" POST /obras '{}' Pode Pode Negado Negado
linha "Editar obra" PUT /obras/304 '{"quantidadePaineis":0}' Pode Pode Negado Negado
linha "Mudar etapa da obra" PATCH /obras/304/status '{}' Pode Pode Negado Negado
linha "Ver detalhe da obra da equipe" GET /obras/304 "" Pode Pode Pode Pode
linha "Ver detalhe da obra de outra equipe" GET /obras/301 "" Pode Pode Pode Negado
linha "Ver materiais da obra da equipe" GET /obras/304/materiais "" Pode Pode Pode Pode
linha "Ver materiais da obra de outra equipe" GET /obras/301/materiais "" Pode Pode Pode Negado
linha "Incluir material" POST /obras/304/materiais '{}' Pode Pode Negado Negado
linha "Ver historico da obra" GET /obras/304/historico "" Pode Pode Pode Negado
linha "Ver comentarios da obra da equipe" GET /obras/304/comentarios "" Pode Pode Pode Pode
linha "Ver comentarios da obra de outra equipe" GET /obras/301/comentarios "" Pode Pode Pode Negado
linha "Comentar no cartao" POST /obras/304/comentarios '{"descricao":"Teste de acesso QA","tipo":"Cartao"}' Pode Pode Negado Negado
linha "Editar comentario" PUT /comentarios/701 '{"descricao":""}' Pode Negado Negado Negado
linha "Apagar comentario" DELETE /comentarios/999999 "" Pode Negado Negado Negado
linha "Ver cronograma" GET /programacoes "" Pode Pode Pode Pode
linha "Agendar obra" POST /programacoes '{}' Pode Pode Negado Negado
linha "Mudar datas no cronograma" PUT /programacoes/601/reordenar '{}' Pode Pode Negado Negado
linha "Ver instalacoes do instalador" GET /instalador/instalacoes "" Negado Negado Negado Pode
linha "Ver detalhe da instalacao da equipe" GET /instalador/instalacoes/304 "" Negado Negado Negado Pode
linha "Ver detalhe da instalacao de outra equipe" GET /instalador/instalacoes/301 "" Negado Negado Negado Negado
linha "Ver manutencoes do instalador" GET /instalador/manutencoes "" Negado Negado Negado Pode

rm -f "$RESP"
echo
echo "Passou: $PASSOU | Falhou: $FALHOU"
