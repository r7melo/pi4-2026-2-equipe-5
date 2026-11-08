API="${API:-http://localhost:8000/api}"
SENHA='Senha123!'
PASSOU=0
FALHOU=0

chamar() {
  local metodo="$1" rota="$2" token="$3" corpo="$4"
  local args=(-s -o /tmp/qa_resp.json -w "%{http_code}" -X "$metodo" "$API$rota")
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  [ -n "$corpo" ] && args+=(-H "Content-Type: application/json" -d "$corpo")
  curl "${args[@]}"
}

campo() {
  python -c "import json,sys;d=json.loads(sys.stdin.buffer.read().decode('utf-8'));print(eval(sys.argv[1]))" "$1" < /tmp/qa_resp.json 2>/dev/null
}

conferir() {
  local caso="$1" esperado="$2" obtido="$3"
  if [ "$esperado" = "$obtido" ]; then
    PASSOU=$((PASSOU + 1)); echo "OK      | $caso | esperado $esperado | obtido $obtido"
  else
    FALHOU=$((FALHOU + 1)); echo "FALHOU  | $caso | esperado $esperado | obtido $obtido | $(head -c 300 /tmp/qa_resp.json)"
  fi
}

token() {
  chamar POST /auth/login "" "{\"email\":\"$1\",\"senha\":\"$SENHA\"}" >/dev/null
  campo "d['token']"
}

ADM=$(token admin@zl.com.br)
ENG=$(token engenharia@zlengenharia.com)
FIN=$(token financeiro@zl.com.br)
INS=$(token instalador@zl.com.br)
LEI=$(token leitor@zl.com.br)

echo "== CT-01 Autenticação"
s=$(chamar POST /auth/login "" "{\"email\":\"admin@zl.com.br\",\"senha\":\"$SENHA\"}")
conferir "CT-01 p5 login admin" 200 "$s"
conferir "CT-01 p5 perfil" Administrador "$(campo "d['usuario']['perfil']")"
conferir "CT-01 p5 sem senha na resposta" False "$(campo "'senha' in json.dumps(d)")"
s=$(chamar POST /auth/login "" '{"email":"admin@zl.com.br","senha":"senhaerrada"}')
conferir "CT-01 p6 senha errada" 401 "$s"
s=$(chamar POST /auth/login "" "{\"email\":\"naoexiste@teste.com\",\"senha\":\"$SENHA\"}")
conferir "CT-01 p4 email inexistente" 401 "$s"
s=$(chamar GET /auth/me "")
conferir "CT-01 p7 me sem token" 401 "$s"

echo "== CT-02 RBAC"
s=$(chamar POST /obras "$LEI" '{"clienteId":1,"quantidadePaineis":10,"endereco":"Rua X","pagamento":{"prazoContratualDias":30,"dataConfirmacao":"2026-10-20"}}')
conferir "CT-02 p3 leitor cria obra" 403 "$s"
s=$(chamar PATCH /obras/305/status "$INS" '{"statusNovo":"Concluido"}')
conferir "CT-02 p4 instalador move card" 403 "$s"
s=$(chamar GET /obras/307/relatorio-custo "$ENG")
conferir "CT-02 p5 engenharia relatorio-custo" 403 "$s"
s=$(chamar GET /obras/307/relatorio-custo "$FIN")
conferir "CT-02 p6 financeiro relatorio-custo" 200 "$s"
s=$(chamar DELETE /comentarios/710 "$ENG")
conferir "CT-02 p7 engenharia exclui comentario" 403 "$s"
s=$(chamar DELETE /comentarios/711 "$ADM")
conferir "CT-02 p8 admin exclui comentario (711)" 204 "$s"

echo "== CT-03 Kanban"
s=$(chamar PATCH /obras/301/status "$ENG" '{"statusNovo":"EmAndamento"}')
conferir "CT-03 p2 pular etapa" 400 "$s"
conferir "CT-03 p2 codigo" INVALID_STATUS_TRANSITION "$(campo "d['error']['code']")"
s=$(chamar PATCH /obras/307/status "$ENG" '{"statusNovo":"MaterialComprado"}')
conferir "CT-03 p3 concluido para inicio" 400 "$s"
s=$(chamar PATCH /obras/301/status "$ENG" '{"statusNovo":"NoDeposito"}')
conferir "CT-03 p4 transicao valida" 200 "$s"
s=$(chamar GET /obras/301/historico "$ENG")
conferir "CT-03 p6 historico 301" 2 "$(campo "len(d) if isinstance(d,list) else len(d.get('itens',[]))")"
s=$(chamar GET "/obras?status=EmAndamento" "$ENG")
conferir "CT-03 p7 filtro EmAndamento" "[305, 306]" "$(campo "sorted(o['id'] for o in d['itens'])")"

echo "== CT-04 Gantt"
s=$(chamar GET "/programacoes?equipeId=1" "$ENG")
conferir "CT-04 p2 equipe 01" "[601, 602, 607]" "$(campo "sorted(p['id'] for p in (d if isinstance(d,list) else d['itens']))")"
s=$(chamar POST /programacoes "$ENG" '{"obraId":310,"equipeId":5,"dataInicio":"2026-10-19","prioridade":1}')
conferir "CT-04 p4 alocar obra 310" 201 "$s"
s=$(chamar POST /programacoes "$ENG" '{"obraId":306,"equipeId":1,"dataInicio":"2026-10-02","prioridade":1}')
conferir "CT-04 p5 conflito equipe 01" 409 "$s"

echo "== CT-05 Custo"
s=$(chamar GET /obras/307/relatorio-custo "$FIN")
conferir "CT-05 p2 financeiro" 200 "$s"
conferir "CT-05 p2 custoTotal" 31700.0 "$(campo "float(d['custoTotal'])")"
s=$(chamar GET /obras/307/relatorio-custo "$ADM")
conferir "CT-05 p3 admin" 200 "$s"
s=$(chamar GET /obras/301/relatorio-custo "$FIN")
conferir "CT-05 p6 obra nao concluida" 400 "$s"

echo "== CT-06 Cadastro com cliente"
BASE='"categoria":"Comercial","quantidadePaineis":18,"quantidadeInversores":1,"endereco":"Rua Teste, 10","dataInicioEstimada":"2026-11-03","dataFimEstimada":"2026-11-05","pagamento":{"prazoContratualDias":30,"dataConfirmacao":"2026-10-20"}'
s=$(chamar POST /obras "$ENG" "{\"clienteId\":1,$BASE}")
conferir "CT-06 p1 cliente existente" 201 "$s"
conferir "CT-06 p1 status inicial" MaterialComprado "$(campo "d['status']")"
s=$(chamar POST /obras "$ENG" "{$BASE}")
conferir "CT-06 p2 sem cliente" 400 "$s"
s=$(chamar POST /obras "$ENG" "{\"clienteId\":999,$BASE}")
conferir "CT-06 p3 cliente inexistente" 404 "$s"
conferir "CT-06 p3 codigo" CLIENTE_NOT_FOUND "$(campo "d['error']['code']")"
s=$(chamar POST /obras "$ENG" "{\"cliente\":{\"nome\":\"Cliente QA\",\"cpfCnpj\":\"11222333000182\"},$BASE}")
conferir "CT-06 p4 cnpj invalido" 400 "$s"
s=$(chamar POST /obras "$ENG" "{\"cliente\":{\"nome\":\"Cliente QA\",\"cpfCnpj\":\"12345678000195\"},$BASE}")
conferir "CT-06 p5 cnpj duplicado" 409 "$s"
s=$(chamar POST /obras "$ENG" "{\"cliente\":{\"nome\":\"Cliente QA\",\"cpfCnpj\":\"11222333000181\"},$BASE}")
conferir "CT-06 p6 cliente novo" 201 "$s"
NOVA=$(campo "d['id']")
s=$(chamar GET "/obras/$NOVA/historico" "$ENG")
conferir "CT-06 p7 historico obra nova" 1 "$(campo "len(d) if isinstance(d,list) else len(d.get('itens',[]))")"

echo "== CT-08 Instalador"
s=$(chamar POST /auth/login "" "{\"email\":\"instalador@zl.com.br\",\"senha\":\"$SENHA\"}")
conferir "CT-08 p1 login" 200 "$s"
conferir "CT-08 p1 equipe" 3 "$(campo "d['usuario']['equipeId']")"
s=$(chamar GET /programacoes "$INS")
conferir "CT-08 p2 so a propria equipe" "[605, 606]" "$(campo "sorted(p['id'] for p in (d if isinstance(d,list) else d['itens']))")"
s=$(chamar GET /obras/304 "$INS")
conferir "CT-08 p3 obra da equipe" 200 "$s"
s=$(chamar GET /obras/301 "$INS")
conferir "CT-08 p4 obra de outra equipe" 403 "$s"
s=$(chamar GET /obras "$INS")
conferir "CT-08 p5 lista geral" 403 "$s"
s=$(chamar PATCH /obras/304/status "$INS" '{"statusNovo":"Concluido"}')
conferir "CT-08 p6 mover card" 403 "$s"
s=$(chamar GET /obras/304/historico "$INS")
conferir "CT-08 p7 historico" 403 "$s"

echo "== CT-09 Propagação"
s=$(chamar PUT /programacoes/601/reordenar "$ENG" '{"novaDataInicio":"2026-10-05"}')
conferir "CT-09 p2 reordenar 601" 200 "$s"
conferir "CT-09 p2 601" "2026-10-05 2026-10-06" "$(campo "d['novaDataInicio']+' '+d['novaDataFim']")"
conferir "CT-09 p3 afetadas" "[(602, '2026-10-08', '2026-10-13'), (607, '2026-10-15', '2026-10-20')]" "$(campo "sorted((p['id'],p['novaDataInicio'],p['novaDataFim']) for p in d['programacoesAfetadas'])")"
s=$(chamar PUT /programacoes/601/reordenar "$ENG" '{"novaDataInicio":"2026-10-10"}')
conferir "CT-09 p4 sabado" 400 "$s"
s=$(chamar PUT /programacoes/601/reordenar "$FIN" '{"novaDataInicio":"2026-10-06"}')
conferir "CT-09 p5 financeiro" 403 "$s"

echo "== CT-10 Alocação de obra apta"
s=$(chamar POST /programacoes "$ENG" '{"obraId":310,"equipeId":5,"dataInicio":"2026-11-02","prioridade":1}')
conferir "CT-10 p1 obra nao apta (310)" 400 "$s"
s=$(chamar POST /programacoes "$ENG" '{"obraId":304,"equipeId":5,"dataInicio":"2026-11-02","prioridade":1}')
conferir "CT-10 p2 alocar 304" 201 "$s"
conferir "CT-10 p2 termino" 2026-11-12 "$(campo "d['dataFim']")"
s=$(chamar GET /obras/304 "$ENG")
conferir "CT-10 p3 status 304" EmAndamento "$(campo "d['status']")"
s=$(chamar GET /obras/304/historico "$ENG")
conferir "CT-10 p4 ultimo historico" "Separado EmAndamento" "$(campo "' '.join(str(x) for x in (lambda h:(h['statusAnterior'],h['statusNovo']))(max((d if isinstance(d,list) else d['itens']), key=lambda h:h['dataAlteracao'])))")"
s=$(chamar POST /programacoes "$ENG" '{"obraId":306,"equipeId":5,"dataInicio":"2026-11-05","prioridade":2}')
conferir "CT-10 p5 conflito" 409 "$s"
s=$(chamar POST /programacoes "$ENG" '{"obraId":306,"equipeId":5,"dataInicio":"2026-11-07","prioridade":2}')
conferir "CT-10 p6 sabado" 400 "$s"

echo "== CT-15 Comentários"
s=$(chamar POST /obras/303/comentarios "$ENG" '{"descricao":"   "}')
conferir "CT-15 p1 vazio" 400 "$s"
s=$(chamar POST /obras/303/comentarios "$ENG" '{"descricao":"Teste QA"}')
conferir "CT-15 p2 engenharia comenta" 201 "$s"
COM=$(campo "d['id']")
s=$(chamar POST /obras/303/comentarios "$FIN" '{"descricao":"Teste financeiro","tipo":"Cartao"}')
conferir "CT-15 p3 financeiro no cartao" 403 "$s"
s=$(chamar POST /obras/303/comentarios "$FIN" '{"descricao":"Teste financeiro","tipo":"Timeline"}')
conferir "CT-15 p4 financeiro na timeline" 201 "$s"
s=$(chamar PUT "/comentarios/$COM" "$ENG" '{"descricao":"Editado"}')
conferir "CT-15 p5 engenharia edita" 403 "$s"
s=$(chamar PUT "/comentarios/$COM" "$ADM" '{"descricao":"Editado"}')
conferir "CT-15 p6 admin edita" 200 "$s"
s=$(chamar DELETE "/comentarios/$COM" "$ADM")
conferir "CT-15 p7 admin exclui" 204 "$s"

echo
echo "Passou: $PASSOU | Falhou: $FALHOU"
