# Produit un ZIP de release propre pour le depot Google Drive (Livrable 2).
# Exclut node_modules, .venv, .git, caches, uploads et .env (secrets).
# Usage : powershell -ExecutionPolicy Bypass -File scripts/make-release-zip.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$staging = Join-Path $env:TEMP "profmatch-release"
$zipPath = Join-Path $root "profmatch-release.zip"

$exclude = @(
    "node_modules", ".venv", "venv", ".git", "__pycache__",
    ".pytest_cache", "htmlcov", ".next", ".superpowers"
)

if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging | Out-Null

# Copie via robocopy en excluant les repertoires lourds/sensibles.
# robocopy renvoie un code de sortie 1 en cas de succes avec copie : on neutralise.
robocopy $root $staging /E /XD $exclude /XF ".env" "profmatch-release.zip" | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy a echoue (code $LASTEXITCODE)" }
$global:LASTEXITCODE = 0

# Vide le contenu des uploads mais garde le dossier + le .gitkeep
$uploads = Join-Path $staging "backend\uploads"
if (Test-Path $uploads) {
    Get-ChildItem $uploads -Exclude ".gitkeep" | Remove-Item -Recurse -Force
}

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $zipPath
Remove-Item $staging -Recurse -Force

Write-Host "ZIP de release cree : $zipPath"
Write-Host "ETAPE MANUELLE : ajouter le fichier .env rempli dans le ZIP/Drive."
