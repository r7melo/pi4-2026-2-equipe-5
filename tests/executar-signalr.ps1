# Executar da raiz: powershell -NoProfile -File tests/executar-signalr.ps1
# Cria somente recursos exclusivos de testes. Nao usa compose, portas ou volumes da equipe.
$ErrorActionPreference = 'Stop'
$repoSignalR = Split-Path -Parent $PSScriptRoot
$redeSignalR = 'pi4-signalr-' + [Guid]::NewGuid().ToString('N').Substring(0, 12)
$bancoSignalR = "$redeSignalR-db"
$senhaSignalR = [Guid]::NewGuid().ToString('N')
$redeCriadaSignalR = $false
$bancoCriadoSignalR = $false

function Invoke-DockerSignalR {
    param([string[]]$Argumentos)
    & docker @Argumentos
    if ($LASTEXITCODE -ne 0) { throw "Docker falhou (codigo $LASTEXITCODE)." }
}

try {
    Invoke-DockerSignalR -Argumentos @('info', '--format', '{{.ServerVersion}}')
    Invoke-DockerSignalR -Argumentos @('network', 'create', $redeSignalR)
    $redeCriadaSignalR = $true
    Invoke-DockerSignalR -Argumentos @('run', '--detach', '--name', $bancoSignalR,
        '--network', $redeSignalR, '--env', "POSTGRES_PASSWORD=$senhaSignalR", 'postgres:16')
    $bancoCriadoSignalR = $true
    $prontoSignalR = $false
    for ($tentativaSignalR = 0; $tentativaSignalR -lt 30; $tentativaSignalR++) {
        & docker exec $bancoSignalR pg_isready -U postgres *> $null
        if ($LASTEXITCODE -eq 0) { $prontoSignalR = $true; break }
        Start-Sleep -Seconds 1
    }
    if (-not $prontoSignalR) { throw 'PostgreSQL de testes nao ficou pronto em 30 segundos.' }

    $comandosSignalR = @'
set -e
mkdir -p /tmp/work
cp -r /source/backend /source/database /source/tests /tmp/work/
cd /tmp/work
dotnet build backend/Backend.Api/Backend.Api.csproj --nologo -v minimal
dotnet run --project tests/signalr/Backend.SignalR.Tests.csproj
'@
    Invoke-DockerSignalR -Argumentos @('run', '--rm', '--network', $redeSignalR,
        '--env', "SIGNALR_TEST_ADMIN_CONNECTION=Host=$bancoSignalR;Username=postgres;Password=$senhaSignalR;Database=postgres",
        '--mount', "type=bind,source=$repoSignalR,target=/source,readonly",
        'mcr.microsoft.com/dotnet/sdk:8.0', 'sh', '-c', $comandosSignalR.Replace("`r", ''))
}
finally {
    $falhasLimpezaSignalR = @()
    if ($bancoCriadoSignalR) {
        & docker rm --force --volumes $bancoSignalR | Out-Null
        if ($LASTEXITCODE -ne 0) { $falhasLimpezaSignalR += $bancoSignalR }
    }
    if ($redeCriadaSignalR) {
        & docker network rm $redeSignalR | Out-Null
        if ($LASTEXITCODE -ne 0) { $falhasLimpezaSignalR += $redeSignalR }
    }
    if ($falhasLimpezaSignalR.Count -gt 0) { throw "Falha ao limpar recursos de teste: $($falhasLimpezaSignalR -join ', ')." }
}
Write-Output 'PASSOU: build e suite SignalR; ambiente descartavel removido.'
