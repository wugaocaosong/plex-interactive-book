Set-Location $PSScriptRoot
& "D:\Program Files\nodejs\npm.cmd" run dev 1> "$PSScriptRoot\.npmdev.log" 2> "$PSScriptRoot\.npmdev_err.log"
