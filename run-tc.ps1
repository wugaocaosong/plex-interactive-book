Set-Location "E:\数字教材\plex-interactive-book"
& "D:\Program Files\nodejs\node.exe" ".\node_modules\vue-tsc\bin\vue-tsc.js" --noEmit 1>"E:\数字教材\.tsc_out.txt" 2>"E:\数字教材\.tsc_err.txt"
$LASTEXITCODE | Out-File "E:\数字教材\.tsc_exit.txt" -Encoding utf8
