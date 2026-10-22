# PLEX · 星轨编程

**Python 与算法的探索之旅** — 可从封面连续读到封底的 H5 交互式数字教材。

首版包含《Hello 算法》简体中文 118 个教材页面、11 个 PLEX 附页、星域目录、全文搜索、书签、图解逐帧播放、14 种代码语言、浏览器 Python 实验室，以及一套真正可评分的 H5P 二分查找练习。桌面双页，手机与平板单页；进度和练习保存在本机浏览器。

## 本地启动

要求 **Node.js 24+、Python 3.10+**。首次安装需要网络；日常阅读、字体、图片、Python 与练习均由本地站点提供。

```sh
npm ci
python -m pip install -r requirements.txt
npm run dev
```

打开 **http://127.0.0.1:5190/**。首次点击「运行 Python」时才加载本地运行环境。

```sh
npm run check       # TypeScript、全文审计、导入与定位回归测试
npm run build       # 校验资源并生成静态成品
npm run preview     # 本地预览静态成品，先停止同端口开发服务器
```

静态成品位于 `web/.vitepress/dist/`。使用 HTTP 静态服务从站点根路径提供，支持 `/read/...` 对应 `.html` 文件；不要用文件管理器直接打开 HTML。首版未配置公开部署或子路径部署。

## 浏览器验收

```sh
npx playwright install chromium
npm run test:e2e
```

验收包括所有教材与附页在 390 / 820 / 1440 px 下的分页文字守恒、图片和公式检查，以及阅读、导航、搜索、书签、Python、H5P 流程。逐个执行全书 73 个独立 Python 源文件及其演示入口。结果和截图写到 `output/`，失败跟踪写到 `test-results/`。

已有 Chromium 时可用 `PLAYWRIGHT_CHROMIUM_EXECUTABLE` 指定可执行文件。测试只操作本地测试浏览器。

## 内容与编辑

- `content/upstream/hello-algo/`：原文、图片、全语言代码及许可的相关目录快照，固定提交 `350f483801b2badb95180047aa82cadb825852a2`。网站首页和纸质书宣传页的来源文件保留，但不进入正文。
- `content/editorial.json`：封面、扉页、版权、献辞、编者前言、目录、后记、致谢、索引、作者简介、封底。未知身份与出版信息保留「待填写」。
- `web/public/book/`：导入清单、页面数据、代码片段、搜索索引和 Python 辅助文件。每页有原路径、版本、SHA-256 与转换记录。
- `web/read/`：VitePress 稳定小节路由，由导入器生成。
- `content/h5p/binary-search/`：自编三道二分查找题和 9 个固定运行库；`runtime-lock.json` 校验每个库文件。
- `web/.vitepress/theme/`：Vue 阅读器、分页、星图、代码实验室和 H5P 宿主。

修改附页后运行 `npm run import:book`。修改练习参数后运行 `npm run build:activity`。重复导入只重建生成文件，不改原创 JSON、H5P 内容或来源快照。

需要重新获取固定上游快照时运行 `python scripts/download-source.py`；日常构建和导入无需重新下载。数量见 [导入报告](docs/import-report.json)，实现说明见 [架构与维护](docs/ARCHITECTURE.md)。

## 阅读与运行说明

- 点击封面进入扉页；页边箭头或键盘左右键连续翻阅，可跨小节到封底。
- 目录支持原作行星导航和全章节文字目录。搜索跳到匹配块；书签和继续阅读使用内容锚点，不使用物理页码。
- 图解支持全部帧、播放、暂停、放大。超长块有「展开阅读」入口。
- 代码面板保留全部可用语言，默认 Python，可编辑完整源文件、运行、停止、重置。10 秒超时终止 Worker；其他语言可查看、复制和访问原始源码。
- 二分查找末尾「开始练习」打开 H5P，包含三题、反馈、重试、成绩和恢复。刷新恢复已选答案与分数；可再次检查答案查看反馈。
- 本机数据与站点来源绑定；换浏览器、换端口或清除站点数据后不会共享进度。首版不含账号同步、在线编辑后台或 EPUB/PDF 导出。

## 固定版本与许可

VitePress 1.6.4、Vue 3.5.22、StPageFlip 2.0.7、h5p-standalone 3.8.2、Pyodide 314.0.7；直接依赖固定版本并提交锁文件。H5P 官方分发包中的 Interactive Book 1.11.11 及依赖以资源文件形式固定。

使用与思源字体同源的 Noto Serif SC / Noto Sans SC，以及 JetBrains Mono，字体通过固定 Fontsource 包本地打包，许可在 `licenses/`。

教材改编内容遵循 **CC BY-NC-SA 4.0**，保留 krahets 与 Hello Algo 贡献者署名；封面沿用用户原附件。各软件组件保留各自许可。详见 [第三方说明](THIRD_PARTY_NOTICES.md)。

验收范围与首版截图见 [验证记录](docs/VALIDATION.md)。
