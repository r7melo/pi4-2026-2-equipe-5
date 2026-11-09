[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'Medium')]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Backup', 'Restore')]
    [string]$Action,

    [string]$BackupPath,

    [string]$ProjectName,

    [string]$EnvFile
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$composeArguments = @('compose')

if ($ProjectName) {
    $composeArguments += @('--project-name', $ProjectName)
}

if ($EnvFile) {
    if (-not [IO.Path]::IsPathRooted($EnvFile)) {
        $EnvFile = Join-Path $repositoryRoot $EnvFile
    }

    $EnvFile = (Resolve-Path $EnvFile).Path
    $composeArguments += @('--env-file', $EnvFile)
}

function Invoke-Compose {
    param([string[]]$Arguments)

    $output = & docker @script:composeArguments @Arguments
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        throw "docker $($script:composeArguments -join ' ') $($Arguments -join ' ') failed with exit code $exitCode."
    }

    return $output
}

function Remove-TemporaryContainerFile {
    param([string]$ContainerPath)

    try {
        Invoke-Compose @('exec', '-T', 'db', 'rm', '-f', $ContainerPath) | Out-Null
    }
    catch {
        Write-Warning "Nao foi possivel remover o arquivo temporario '$ContainerPath' do container: $_"
    }
}

if ($Action -eq 'Backup') {
    if (-not $BackupPath) {
        $BackupPath = Join-Path 'backend\backups' ("pi4-db-{0}.dump" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
    }

    if (-not [IO.Path]::IsPathRooted($BackupPath)) {
        $BackupPath = Join-Path $repositoryRoot $BackupPath
    }

    $BackupPath = [IO.Path]::GetFullPath($BackupPath)
    if (Test-Path -LiteralPath $BackupPath) {
        throw "O arquivo de backup ja existe; escolha outro caminho para evitar sobrescreve-lo: $BackupPath"
    }

    if (-not $PSCmdlet.ShouldProcess("arquivo '$BackupPath'", 'Criar backup do banco')) {
        return
    }

    $backupDirectory = Split-Path -Parent $BackupPath
    New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
}
else {
    if (-not $BackupPath) {
        throw 'Informe -BackupPath com o arquivo que sera restaurado.'
    }

    if (-not [IO.Path]::IsPathRooted($BackupPath)) {
        $BackupPath = Join-Path $repositoryRoot $BackupPath
    }

    $BackupPath = (Resolve-Path -LiteralPath $BackupPath).Path
    if ((Get-Item -LiteralPath $BackupPath).PSIsContainer) {
        throw "O caminho informado nao e um arquivo: $BackupPath"
    }

    if (-not $PSBoundParameters.ContainsKey('Confirm') -and -not $WhatIfPreference) {
        throw 'A restauracao sobrescreve os dados. Execute novamente com -Confirm para prosseguir.'
    }

    $projectDescription = if ($ProjectName) { $ProjectName } else { 'Compose deste diretorio' }
    if (-not $PSCmdlet.ShouldProcess(
        "banco PostgreSQL do projeto '$projectDescription'",
        "Substituir os dados pelo backup '$BackupPath'"
    )) {
        return
    }
}

$containerFile = '/tmp/pi4-db-{0}.dump' -f [guid]::NewGuid().ToString('N')
$locationPushed = $false

try {
    Push-Location $repositoryRoot
    $locationPushed = $true

    $runningDatabase = Invoke-Compose @('ps', '--status', 'running', '-q', 'db')
    if (-not $runningDatabase) {
        throw "O servico 'db' nao esta em execucao. Inicie o banco com 'docker compose up -d db' e tente novamente."
    }

    if ($Action -eq 'Backup') {
        Invoke-Compose @(
            'exec', '-T', 'db', 'sh', '-c',
            'pg_dump --format=custom --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --file="$1" && test -s "$1" && pg_restore --list "$1" >/dev/null',
            'backup', $containerFile
        ) | Out-Null

        Invoke-Compose @('cp', "db:$containerFile", $BackupPath) | Out-Null
        if (-not (Test-Path -LiteralPath $BackupPath) -or (Get-Item -LiteralPath $BackupPath).Length -eq 0) {
            throw "O backup nao foi criado corretamente em '$BackupPath'."
        }

        Write-Output "Backup criado e validado: $BackupPath"
    }
    else {
        $runningBackend = Invoke-Compose @('ps', '--status', 'running', '-q', 'backend')
        if ($runningBackend) {
            throw "O servico 'backend' esta em execucao. Pare-o antes da restauracao para evitar gravacoes concorrentes: docker compose stop backend"
        }

        Invoke-Compose @('cp', $BackupPath, "db:$containerFile") | Out-Null
        Invoke-Compose @(
            'exec', '-T', 'db', 'sh', '-c',
            'pg_restore --list "$1" >/dev/null && pg_restore --clean --if-exists --no-owner --no-acl --single-transaction --exit-on-error --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" "$1"',
            'restore', $containerFile
        ) | Out-Null

        Write-Output "Restauracao concluida a partir de: $BackupPath"
    }
}
finally {
    if ($locationPushed) {
        Remove-TemporaryContainerFile $containerFile
        Pop-Location
    }
}
