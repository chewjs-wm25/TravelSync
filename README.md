# TravelSync
Collaboration Development Assignment

## Importnant information
This is the document who introduce this project and teach you how to deploy and run it
Please **DO NOT** upload your change log to here!

## Before deploy
Please **install** the following items before you try to run
1. Visual Studio Code
2. Docker

For Visual Studio Code, you will need to install the following extenstions:
 - Dev Containers [LINK](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

## How to deploy (For developer)
1. Pull it into your local pc
2. Run your dev container
 - It will pop up message to call you **Reopen Container**
 - **OR** you can manually type command ">Dev Reopen" inside your search bar (Top Middle) and choose **Dev Container: Reopen Container**
3. Wait until installation finish
 - **Warning** It may be error during running Docker, Copy the log and ask AI if you cannot solve it
4. After all installation finish, run "npm run dev" in your terminal (Build inside Visual Studio Code)
5. Open it on your browser, Default URL: http://localhost:3000

## google API Setting
npm run preview:secure or node scripts/run-temp-auth.mjs <br><br>

终端交互输入：<br>
提示 请输入 Google Client ID：直接按回车，默认自动使用已配置的公共 Client ID。<br>
提示 请输入 Google Client Secret：输入你的密钥（输入过程自动以 * 号遮蔽，防止旁人偷窥）。<br>
临时注入与启动：<br>
脚本将密钥注入并启动项目预览服务（npm run preview）。<br>
退出自动粉碎清理（Auto-Wipe on Exit）：<br>
当你演示或测试完毕，按下 Ctrl + C（或直接关闭终端窗口）时：<br>
脚本会自动触发安全清理逻辑，将临时记录彻底覆盖擦除并销毁。<br>
对方电脑的硬盘上不会留下任何你的私钥记录。<br>
