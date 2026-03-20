param(
  [string]$RepoPath = "C:\Users\Anthony Figueroa\Desktop\tehleader1",
  [string]$CommitMessage = "Automated update",
  [string]$RenderDeployHook = "https://api.render.com/deploy/srv-d6fq8v88tnhs73d28440?key=mfxoH3hKsXM",
  [string]$HealthUrl = "https://ai-hair-advisor.onrender.com/health"
)

$ErrorActionPreference = "Stop"

function Step([string]$text){
  Write-Host "`n==> $text"
}

Step "Checking git status"
git -C $RepoPath status -sb

Step "Staging changes"
git -C $RepoPath add .

Step "Committing (if needed)"
try {
  git -C $RepoPath commit -m $CommitMessage | Out-Host
} catch {
  Write-Host "No new commit created (possibly no staged changes)."
}

Step "Pushing to origin/main"
git -C $RepoPath push | Out-Host

Step "Triggering Render deploy"
Invoke-RestMethod -Method Post -Uri $RenderDeployHook | Out-Null
Write-Host "Render deploy triggered."

Step "Health check"
Start-Sleep -Seconds 8
$health = Invoke-RestMethod -Method Get -Uri $HealthUrl
Write-Host ("Health status: " + ($health.status | Out-String).Trim())

Write-Host "`nDone."
