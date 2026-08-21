@echo off
powercfg /hibernate off
dism.exe /Online /Cleanup-Image /StartComponentCleanup /ResetBase
