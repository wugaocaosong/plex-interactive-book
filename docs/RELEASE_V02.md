# PLEX · 星轨编程 v0.2.0

从翻书演示升级为可保存学习记录的数字教材。

- 翻书与连续学习模式共享定位；桌面实验分栏、手机独立面板。
- 阅读设置、高亮／划线／批注、128 个术语解释、精确搜索、Markdown 笔记和 JSON 备份恢复。
- 六类主题、16 个算法模型，提供预测、单步、解释、变量及代码行。
- 24 道 Python 练习、112 个测试用例，支持分层提示与逐例反馈。
- CodeMirror 编辑器、自动保存草稿、修改差异、标准输入、错误定位、独立 Worker 判题。
- 保留全部 118 个教材页面、73 个 Python 示例、14 种语言代码及原有 H5P 练习。

完整 ZIP 包含源码、教材与学习资源、静态成品、启动脚本、技术文档和逐文件哈希。解压后安装 Node.js 24+，Windows 双击 START_PREVIEW.cmd；其他平台运行 `node scripts/serve-dist.mjs`。无需为成品预览安装 npm 或 Python 依赖。

从 GitHub 克隆开发时运行 `npm ci`、`npm run dev`。重新检查和构建需安装 requirements.lock.txt 中的 Python 依赖，详见 docs/REPRODUCIBILITY.md。

本版本为私有仓库发布，无公开部署。学习数据保存在本机。验证报告为 docs/VALIDATION_V02.md；NVDA / VoiceOver 实机验收及非 Chromium 浏览器仍为明确的待验收项。
