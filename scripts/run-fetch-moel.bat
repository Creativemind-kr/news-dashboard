@echo off
set /p GITHUB_TOKEN=<"C:\Users\User\news-dashboard\scripts\github-token.txt"
node "C:\Users\User\news-dashboard\scripts\fetch-moel.js" >> "C:\Users\User\news-dashboard\scripts\fetch-moel.log" 2>&1
