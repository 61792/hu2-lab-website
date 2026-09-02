param(
    [string]$Message = ""
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

$ExpectedRemote = "https://github.com/61792/hu2-lab-website.git"
$SiteUrl = "https://61792.github.io/hu2-lab-website/"
$VersionedPaths = @(
    "index.html",
    "styles.css",
    "script.js",
    ".nojekyll",
    "README.md",
    ".gitignore",
    "qa-edge.mjs",
    "发布网站.ps1"
)

Write-Host "[1/5] 检查部署仓库..." -ForegroundColor Cyan
$repoRoot = (git rev-parse --show-toplevel 2>$null).Trim()
if (-not $repoRoot) {
    throw "当前目录不是 Git 仓库。"
}

$origin = (git remote get-url origin 2>$null).Trim()
if ($origin -ne $ExpectedRemote) {
    throw "远程仓库不符合预期：$origin"
}

$branch = (git branch --show-current).Trim()
if ($branch -ne "main") {
    throw "发布脚本只能在 main 分支运行；当前分支为：$branch"
}

foreach ($path in @("index.html", "styles.css", "script.js")) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "缺少必要文件：$path"
    }
}

Write-Host "[2/5] 检查 JavaScript 语法和远程状态..." -ForegroundColor Cyan
if (Get-Command node -ErrorAction SilentlyContinue) {
    node --check script.js
    if ($LASTEXITCODE -ne 0) {
        throw "script.js 语法检查失败。"
    }
}

git fetch origin main --quiet
if ($LASTEXITCODE -ne 0) {
    throw "无法读取远程 main 分支。"
}

$local = (git rev-parse HEAD).Trim()
$remote = (git rev-parse origin/main).Trim()
$base = (git merge-base HEAD origin/main).Trim()
if (($local -ne $remote) -and ($base -eq $local)) {
    throw "远程仓库包含本地尚未取得的更新。请先执行 git pull --rebase origin main。"
}
if (($local -ne $remote) -and ($base -ne $remote)) {
    throw "本地与远程历史已分叉，请先处理 Git 冲突。"
}

Write-Host "[3/5] 暂存正式仓库文件..." -ForegroundColor Cyan
git add -- $VersionedPaths
if ($LASTEXITCODE -ne 0) {
    throw "暂存网页文件失败。"
}

git diff --cached --check
if ($LASTEXITCODE -ne 0) {
    throw "变更中存在 Git 空白字符错误，请修正后再发布。"
}

git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "没有需要发布的网页变更。" -ForegroundColor Yellow
    Write-Host $SiteUrl -ForegroundColor Green
    exit 0
}

Write-Host "即将发布以下变更：" -ForegroundColor Yellow
git diff --cached --stat

if ([string]::IsNullOrWhiteSpace($Message)) {
    $Message = "更新网站 " + (Get-Date -Format "yyyy-MM-dd HH:mm")
}

Write-Host "[4/5] 创建提交：$Message" -ForegroundColor Cyan
git commit -m $Message
if ($LASTEXITCODE -ne 0) {
    throw "创建 Git 提交失败。"
}

Write-Host "[5/5] 推送并触发 GitHub Pages 更新..." -ForegroundColor Cyan
git push origin main
if ($LASTEXITCODE -ne 0) {
    throw "推送失败；本地提交已经保留，可以稍后再次执行 git push origin main。"
}

Write-Host "发布完成。GitHub Pages 稍后会自动更新：" -ForegroundColor Green
Write-Host $SiteUrl -ForegroundColor Green
