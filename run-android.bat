@echo off
set ANDROID_HOME=C:\Users\Beyza\AppData\Local\Android\Sdk
set PATH=%PATH%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\emulator
cd /d "%~dp0"
call npm run android
