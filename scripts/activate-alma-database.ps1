param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern("^[a-z0-9]{20}$")]
    [string]$ProjectRef,

    [switch]$Apply
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repositoryRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repositoryRoot

$requiredMigrations = @(
    "supabase/migrations/20260728001000_alma_business_office_refocus.sql",
    "supabase/migrations/20260729001000_alma_bookkeeping_voice_agents.sql",
    "supabase/migrations/20260729002000_alma_business_launch_center.sql"
)

foreach ($migration in $requiredMigrations) {
    if (-not (Test-Path -LiteralPath $migration)) {
        throw "Required ALMA migration is missing: $migration"
    }
}

if (-not $Apply) {
    Write-Host ""
    Write-Host "No database changes were made." -ForegroundColor Yellow
    Write-Host "Target project: $ProjectRef"
    Write-Host ""
    Write-Host "Review the target, then run:" -ForegroundColor Cyan
    Write-Host ".\scripts\activate-alma-database.ps1 -ProjectRef $ProjectRef -Apply"
    exit 0
}

Write-Host "Linking ALMA to Supabase project $ProjectRef..." -ForegroundColor Cyan
& npx supabase link --project-ref $ProjectRef
if ($LASTEXITCODE -ne 0) {
    throw "Supabase project linking failed. No further activation steps ran."
}

Write-Host "Applying committed ALMA migrations..." -ForegroundColor Cyan
& npx supabase db push
if ($LASTEXITCODE -ne 0) {
    throw "Supabase migration push failed. Review the Supabase output before retrying."
}

Write-Host "Running ALMA activation checks..." -ForegroundColor Cyan
& npm run onboarding:check
if ($LASTEXITCODE -ne 0) { throw "Onboarding readiness check failed." }
& npm run business-office:check
if ($LASTEXITCODE -ne 0) { throw "Business Office check failed." }
& npm run launch-office:check
if ($LASTEXITCODE -ne 0) { throw "Bookkeeping and voice check failed." }
& npm run business-launch:check
if ($LASTEXITCODE -ne 0) { throw "Business Launch check failed." }

Write-Host ""
Write-Host "ALMA database activation completed." -ForegroundColor Green
Write-Host "Redeploy the current application revision, then test /onboarding and /money."
