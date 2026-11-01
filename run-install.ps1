Set-Location $PSScriptRoot
& "D:\Program Files\nodejs\npm.cmd" ci 1> "$PSScriptRoot\.npmci.log" 2> "$PSScriptRoot\.npmci_err.log"
$LASTEXITCODE | Out-File "$PSScriptRoot\.npmci_exit.txt" -Encoding utf8
