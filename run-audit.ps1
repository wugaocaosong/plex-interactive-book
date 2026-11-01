Set-Location $PSScriptRoot
$py = "C:\Users\lenovo\.workbuddy\binaries\python\envs\default\Scripts\python.exe"
& $py scripts\audit_content.py 1> "$PSScriptRoot\.audit_out.txt" 2> "$PSScriptRoot\.audit_err.txt"
$LASTEXITCODE | Out-File "$PSScriptRoot\.audit_exit.txt" -Encoding utf8
