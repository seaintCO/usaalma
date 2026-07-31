param(
    [string]$ProjectRef = $env:SUPABASE_PROJECT_REF,
    [string]$ProductionUrl = "https://www.seaintalma.com",
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repositoryRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repositoryRoot

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)][string]$Label,
        [Parameter(Mandatory = $true)][scriptblock]$Command
    )

    Write-Host ""
    Write-Host "==> $Label" -ForegroundColor Cyan
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed with exit code $LASTEXITCODE. Release stopped safely."
    }
}

foreach ($command in @("git", "node", "npm", "npx", "vercel")) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        throw "Required command is unavailable: $command"
    }
}

$branch = (& git branch --show-current).Trim()
if ($branch -ne "main") {
    throw "Production releases must run from main. Current branch: $branch"
}

$changes = (& git status --porcelain)
if ($changes) {
    throw "The worktree is not clean. Commit or remove local changes before release."
}

$origin = (& git remote get-url origin).Trim()
if ($origin -notmatch "seaintCO/usaalma(\.git)?$") {
    throw "Origin is not the approved ALMA repository: $origin"
}

if (-not $ProjectRef) {
    $linkedProject = Join-Path $repositoryRoot "supabase/.temp/project-ref"
    if (Test-Path -LiteralPath $linkedProject) {
        $ProjectRef = (Get-Content -LiteralPath $linkedProject -Raw).Trim()
    }
}

if (-not $ProjectRef) {
    throw "Set SUPABASE_PROJECT_REF once or pass -ProjectRef. No database changes or deployment were started."
}

if (-not $SkipInstall) {
    Invoke-Checked "Install locked dependencies" { npm ci }
}

Invoke-Checked "Encoding check" { npm run check:encoding }
Invoke-Checked "Onboarding check" { npm run onboarding:check }
Invoke-Checked "Business Office check" { npm run business-office:check }
Invoke-Checked "Office payments check" { npm run office-payments:check }
Invoke-Checked "Managed Office check" { npm run managed-office:check }
Invoke-Checked "Sell-ready release check" { npm run sell-ready:check }
Invoke-Checked "TypeScript check" { npx tsc --noEmit }
Invoke-Checked "Lint check" { npm run lint }
Invoke-Checked "Production build" { npm run build }

Write-Host ""
Write-Host "Database-first release: applying additive migrations before the new application revision becomes live." -ForegroundColor Yellow
Invoke-Checked "Link production Supabase project" {
    npx supabase link --project-ref $ProjectRef
}
Invoke-Checked "Review pending Supabase migrations" {
    npx supabase db push --dry-run
}
Invoke-Checked "Apply pending Supabase migrations" {
    npx supabase db push
}

Invoke-Checked "Push verified main branch" { git push origin main }
Invoke-Checked "Deploy verified production revision" { vercel --prod --yes }

Write-Host ""
Write-Host "==> Production smoke checks" -ForegroundColor Cyan
$home = Invoke-WebRequest -Uri $ProductionUrl -Method Get -UseBasicParsing
if ($home.StatusCode -ne 200) {
    throw "Production homepage returned HTTP $($home.StatusCode)."
}

$login = Invoke-WebRequest -Uri "$ProductionUrl/login" -Method Get -UseBasicParsing
if ($login.StatusCode -ne 200) {
    throw "Production login returned HTTP $($login.StatusCode)."
}

Write-Host ""
Write-Host "ALMA production release completed." -ForegroundColor Green
Write-Host "Database: migrated"
Write-Host "GitHub main: pushed"
Write-Host "Vercel production: deployed"
Write-Host "Smoke checks: passed"
Write-Host ""
Write-Host "External providers still require their one-time OAuth/app credentials. Customers never run migrations or paste owner secrets."
