# Rotina de backup e restauração do banco

Os comandos abaixo devem ser executados na raiz do repositório, com o Docker em execução. O serviço PostgreSQL deve estar ativo; os arquivos gerados ficam em `backend/backups/`, que é ignorado pelo Git.

## Criar backup

```powershell
.\backend\scripts\database-backup.ps1 -Action Backup
```

O script gera um dump PostgreSQL em formato custom (`.dump`), valida o arquivo com `pg_restore --list` e se recusa a sobrescrever um backup existente. Para indicar outro caminho:

```powershell
.\backend\scripts\database-backup.ps1 -Action Backup -BackupPath .\backend\backups\antes-da-migracao.dump
```

Guarde uma cópia dos backups fora da máquina que executa o banco. O dump contém os dados da aplicação e deve ser tratado como informação sensível.

## Restaurar backup

Pare primeiro a API para evitar gravações durante a recuperação:

```powershell
docker compose stop backend
.\backend\scripts\database-backup.ps1 -Action Restore -BackupPath .\backend\backups\pi4-db-AAAAmmdd-HHmmss.dump -Confirm
docker compose start backend
```

A restauração substitui os objetos e dados do banco atual e, por isso, solicita confirmação. O `pg_restore` usa uma única transação e falha ao primeiro erro; um arquivo inválido ou uma restauração com erro é revertido. Se a restauração falhar, mantenha a API parada, verifique a mensagem e repita com um backup válido antes de reiniciá-la.

O dump não inclui roles globais do PostgreSQL nem configurações externas ao banco. O usuário do banco precisa existir no Compose e ter permissão para restaurar o schema.

## Validar isoladamente

Os parâmetros `-ProjectName` e `-EnvFile` permitem executar os scripts contra um projeto Compose separado, sem afetar o banco de desenvolvimento. Use-os para validar a rotina com um volume descartável.
