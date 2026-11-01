Set-Location "E:\数字教材\plex-interactive-book"
$env:NODE_PATH = "E:\数字教材\plex-interactive-book\node_modules"
& "D:\Program Files\nodejs\node.exe" "E:\数字教材\plex-interactive-book\check-gloss.cjs" 2>&1 | Out-File "E:\数字教材\.gloss_run.txt" -Encoding utf8
