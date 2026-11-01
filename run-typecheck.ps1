Set-Location $PSScriptRoot
& "D:\Program Files\nodejs\npm.cmd" run typecheck 1> "$PSScriptRoot\.tsc_out.txt" 2> "$PSScriptRoot\.tsc_err.txt"
$LASTEXITCODE | Out-File "$PSScriptRoot\.tsc_exit.txt" -Encoding utf8
