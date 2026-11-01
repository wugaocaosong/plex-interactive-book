Set-Location $PSScriptRoot
$env:NODE_PATH = "$PSScriptRoot\node_modules"
& "D:\Program Files\nodejs\node.exe" "$PSScriptRoot\check-ui3.cjs"
