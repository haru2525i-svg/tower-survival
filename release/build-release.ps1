$ErrorActionPreference = "Stop"

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectName = Split-Path -Leaf $projectDir
$outputDir = Split-Path -Parent $projectDir
$variantBuilderPath = Join-Path $outputDir "build-variants.ps1"
$playDir = Join-Path $outputDir "play"
$devDir = Join-Path $outputDir "dev"
$standalonePath = Join-Path $outputDir "$projectName-standalone.html"
$zipPath = Join-Path $outputDir "$projectName-release.zip"
$tempZipRoot = Join-Path $outputDir "${projectName}-release"

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Read-Utf8([string]$path) {
  return [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
}

function Write-Utf8([string]$path, [string]$content) {
  [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
}

function Assert-Path([string]$path, [string]$label) {
  if (-not (Test-Path $path)) {
    throw "$label not found: $path"
  }
}

function Build-StandaloneHtml([string]$sourceDir, [string]$destinationPath) {
  $indexPath = Join-Path $sourceDir "index.html"
  $stylePath = Join-Path $sourceDir "style.css"
  $imagePath = Join-Path $sourceDir "tower.png"

  Assert-Path $indexPath "index.html"
  Assert-Path $stylePath "style.css"
  Assert-Path $imagePath "tower.png"

  $html = Read-Utf8 $indexPath
  $css = Read-Utf8 $stylePath
  $css = $css -replace "</style>", "<\\/style>"

  $imageBytes = [System.IO.File]::ReadAllBytes($imagePath)
  $imageDataUri = "data:image/png;base64," + [Convert]::ToBase64String($imageBytes)

  $scriptMatches = [regex]::Matches($html, '<script src="([^"]+)"></script>')
  $scriptContents = foreach ($match in $scriptMatches) {
    $scriptFile = $match.Groups[1].Value.Split("?")[0]
    $scriptPath = Join-Path $sourceDir $scriptFile
    Assert-Path $scriptPath "script"
    Read-Utf8 $scriptPath
  }

  $joinedScript = ($scriptContents -join "`n`n")
  $joinedScript = $joinedScript -replace "</script>", "<\\/script>"

  $html = [regex]::Replace($html, '<link rel="stylesheet" href="style\.css[^"]*">', "<style>`n$css`n</style>")
  $html = $html.Replace('src="tower.png"', "src=`"$imageDataUri`"")
  $html = [regex]::Replace($html, '\s*<script src="[^"]+"></script>', "")
  $html = $html.Replace("</body>", "  <script>`n$joinedScript`n</script>`n</body>")

  Write-Utf8 $destinationPath $html
}

function Copy-PackageDirectory([string]$sourceDir, [string]$destinationRoot) {
  $name = Split-Path -Leaf $sourceDir
  $destinationDir = Join-Path $destinationRoot $name
  New-Item -ItemType Directory -Path $destinationDir | Out-Null

  Get-ChildItem -LiteralPath $sourceDir -Force | Where-Object {
    $_.PSIsContainer -or ($_.Name -notmatch '^server\.(out|err)\.log$')
  } | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $destinationDir -Recurse -Force
  }
}

if (Test-Path $variantBuilderPath) {
  & powershell -ExecutionPolicy Bypass -File $variantBuilderPath
}

Assert-Path $projectDir "release directory"
Assert-Path $playDir "play directory"
Assert-Path $devDir "dev directory"

Build-StandaloneHtml $playDir $standalonePath

if (Test-Path $tempZipRoot) {
  Remove-Item -LiteralPath $tempZipRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $tempZipRoot | Out-Null
Copy-PackageDirectory $devDir $tempZipRoot
Copy-PackageDirectory $playDir $tempZipRoot
Copy-PackageDirectory $projectDir $tempZipRoot

if (Test-Path $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}
Compress-Archive -Path (Join-Path $tempZipRoot "*") -DestinationPath $zipPath -Force
Remove-Item -LiteralPath $tempZipRoot -Recurse -Force

Write-Host "standalone=$standalonePath"
Write-Host "zip=$zipPath"
