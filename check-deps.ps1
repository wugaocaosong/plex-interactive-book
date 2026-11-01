Set-Location $PSScriptRoot
$sys = "C:\Users\lenovo\AppData\Local\Programs\Python\Python313\python.exe"
& $sys -c "import bs4, markdown, yaml; print('deps-ok')" 1> "$PSScriptRoot\.deps.txt" 2> "$PSScriptRoot\.deps_err.txt"
