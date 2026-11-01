# Executar da raiz: powershell -File tests/executar-backend1.ps1
# Requer Docker Desktop em modo Linux. Nao usa o compose nem o banco de desenvolvimento.
$ErrorActionPreference = 'Stop'
$repoBackend1 = Split-Path -Parent $PSScriptRoot
$sufixoBackend1 = [Guid]::NewGuid().ToString('N').Substring(0, 12)
$redeBackend1 = "pi4-b1-$sufixoBackend1"
$bancoBackend1 = "$redeBackend1-db"
$senhaBackend1 = [Guid]::NewGuid().ToString('N')
$redeCriadaBackend1 = $false
$bancoCriadoBackend1 = $false

function Invoke-DockerBackend1 {
    param([string[]]$Argumentos)
    & docker @Argumentos
    if ($LASTEXITCODE -ne 0) { throw "Docker falhou (codigo $LASTEXITCODE)." }
}

try {
    Invoke-DockerBackend1 -Argumentos @('info', '--format', '{{.ServerVersion}}')
    Invoke-DockerBackend1 -Argumentos @('network', 'create', $redeBackend1)
    $redeCriadaBackend1 = $true
    Invoke-DockerBackend1 -Argumentos @('run', '--detach', '--name', $bancoBackend1,
        '--network', $redeBackend1, '--env', "POSTGRES_PASSWORD=$senhaBackend1",
        '--mount', "type=bind,source=$repoBackend1,target=/source,readonly", 'postgres:16')
    $bancoCriadoBackend1 = $true
    $prontoBackend1 = $false
    for ($tentativaBackend1 = 0; $tentativaBackend1 -lt 30; $tentativaBackend1++) {
        & docker exec $bancoBackend1 pg_isready -U postgres *> $null
        if ($LASTEXITCODE -eq 0) { $prontoBackend1 = $true; break }
        Start-Sleep -Seconds 1
    }
    if (-not $prontoBackend1) { throw 'PostgreSQL de testes nao ficou pronto em 30 segundos.' }

    Invoke-DockerBackend1 -Argumentos @('exec', $bancoBackend1, 'createdb', '-U', 'postgres', 'pi4_integridade')
    Invoke-DockerBackend1 -Argumentos @('exec', $bancoBackend1, 'psql', '-X', '-q', '-v', 'ON_ERROR_STOP=1',
        '-U', 'postgres', '-d', 'pi4_integridade', '-f', '/source/database/01_schema.sql',
        '-f', '/source/database/02_seed.sql', '-f', '/source/tests/database/testes_integridade.sql')

    $conexaoBackend1 = "Host=$bancoBackend1;Username=postgres;Password=$senhaBackend1;Database=postgres"
    $comandosBackend1 = @'
set -e
mkdir -p /tmp/work
cp -r /source/backend /source/database /source/tests /tmp/work/
cd /tmp/work
dotnet build backend/Backend.Api/Backend.Api.csproj --nologo -v minimal
dotnet run --project tests/perfis/Backend.Perfis.Tests.csproj
dotnet run --project tests/usuarios/Backend.Usuarios.Tests.csproj
dotnet run --project tests/cadastros/Backend.Cadastros.Tests.csproj
dotnet run --project tests/operacoes/Backend.Operacoes.Tests.csproj
'@
    Invoke-DockerBackend1 -Argumentos @('run', '--rm', '--network', $redeBackend1,
        '--env', "PERFIS_TEST_ADMIN_CONNECTION=$conexaoBackend1",
        '--env', "USUARIOS_TEST_ADMIN_CONNECTION=$conexaoBackend1",
        '--env', "CADASTROS_TEST_ADMIN_CONNECTION=$conexaoBackend1",
        '--env', "OPERACOES_TEST_ADMIN_CONNECTION=$conexaoBackend1",
        '--mount', "type=bind,source=$repoBackend1,target=/source,readonly",
        'mcr.microsoft.com/dotnet/sdk:8.0', 'sh', '-c', $comandosBackend1.Replace("`r", ''))
}
finally {
    # Os nomes aleatorios abaixo pertencem exclusivamente a esta execucao.
    $falhasLimpezaBackend1 = @()
    if ($bancoCriadoBackend1) {
        & docker rm --force --volumes $bancoBackend1 | Out-Null
        if ($LASTEXITCODE -ne 0) { $falhasLimpezaBackend1 += $bancoBackend1 }
    }
    if ($redeCriadaBackend1) {
        & docker network rm $redeBackend1 | Out-Null
        if ($LASTEXITCODE -ne 0) { $falhasLimpezaBackend1 += $redeBackend1 }
    }
    if ($falhasLimpezaBackend1.Count -gt 0) {
        throw "Falha ao limpar recursos de teste: $($falhasLimpezaBackend1 -join ', ')."
    }
}
Write-Output 'PASSOU: build, integridade e suites Backend 1; ambiente descartavel removido.'
