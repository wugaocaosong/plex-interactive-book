# PLEX · 星轨编程

**Python 与算法的探索之旅** — 可从封面连续读到封底的 H5 交互式数字教材。

**v0.3 三门教学版**保留 118 个教材页面、11 个 PLEX 附页、双模式阅读、六类算法实验、24 题与全部代码图解，增加 14 页「三扇舱门：直觉可靠吗？」：故事预测、真实 Python 模拟、3 道模板练习、4 题 H5P 自测、小黑板与学习反思。

底部「目录」进入学习起点；「更多」打开模式、笔记、搜索和设置。「小E」连接现有 PLEX 学生账号与真实辅导，后端离线时本机学习仍可使用。当前共 27 道练习、130 个参考用例。维护说明见 [v0.3 技术总结](docs/LEARNING_V03.md) 和 [逐页教学脚本](docs/LESSON_MONTY.md)。

## 本地启动

推荐复现环境 **Node.js 24.14.1、Python 3.14.3**（仓库内提供版本文件）。首次安装需要网络；日常阅读、字体、图片、Python 与练习均由本地站点提供。完整 Windows / macOS / Linux 命令见 [克隆与复现](docs/REPRODUCIBILITY.md)。默认 `main` 为可验收版本。

```sh
git clone https://github.com/yeniwu46-max/plex-interactive-book.git
cd plex-interactive-book
npm ci
npm run dev
```

打开 **http://127.0.0.1:5190/**。直接开发预览只需要 Node；内容导入、检查和构建需按 [复现说明](docs/REPRODUCIBILITY.md) 创建 Python 虚拟环境并安装 `requirements.lock.txt`。首次点击「运行 Python」时才加载浏览器内的本地运行环境。

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

新增 Python 练习维护在 `content/learning/exercises.py`，术语解释在 `content/learning/glossary.tsv`；修改后运行 `npm run build:learning`。`npm run check:learning` 会校验 27 题的 130 个参考用例、章节关联以及生成资源是否过期。`content/block-registry.json` 是持久化定位注册表，必须随源码保存，不能作为缓存删除。

需要重新获取固定上游快照时运行 `python scripts/download-source.py`；日常构建和导入无需重新下载。数量见 [导入报告](docs/import-report.json)，实现说明见 [架构与维护](docs/ARCHITECTURE.md)。

## 阅读与运行说明

- 点击封面或按住封面向左拖动进入扉页。按住书页左右外侧约 24 px 的页边向内拖动，纸页随鼠标卷起；双页拖过书脊后松开翻页，拖回可取消。单页模式同样支持拖拽，章节交界自动进入相邻小节。
- 页边箭头或键盘左右键仍可连续翻阅；正文区域可选中文字，图解和代码按钮保持独立操作。拖动时按 Escape 可取消，系统减少动态效果设置下省略连续卷页动画。
- 目录支持原作行星导航和全章节文字目录。搜索跳到匹配块；书签和继续阅读使用内容锚点，不使用物理页码。
- 图解支持全部帧、播放、暂停、放大。超长块有「展开阅读」入口。
- 代码面板保留全部可用语言，默认 Python，可编辑完整源文件、运行、停止、重置。10 秒超时终止 Worker；其他语言可查看、复制和访问原始源码。
- 二分查找末尾「开始练习」打开 H5P，包含三题、反馈、重试、成绩和恢复。刷新恢复已选答案与分数；可再次检查答案查看反馈。
- 本机数据与站点来源绑定；换浏览器、换端口或清除站点数据后不会共享进度。本机笔记与草稿不做账号云同步；不含在线编辑后台或 EPUB/PDF 导出。

## v0.2 学习功能

- 底部「更多」切换「学习模式／翻书模式」，在「设置」中调整字号、行距、主题、宽度和全屏。再次访问恢复上次阅读。
- 选择正文后高亮、划线或批注；代码、公式和图片面板提供块级笔记。「笔记」可筛选、编辑、导出 Markdown，以及导出／恢复完整 JSON 学习备份。冲突版本单独保留。
- 点击带虚线的术语查看解释；搜索结果显示命中片段，定位到对应内容。
- 「实验」包含数组／链表、栈／队列、二分、三种排序、树／图遍历、两种递归的操作模型。先预测再看解释；这些是教学模型，不会追踪编辑器中任意代码。
- 「实验 → 编程练习」提供六组各四题：填空、修改、修错、独立实现。查看三层提示或提交测试，可得到每个用例的期望与实际结果。
- Python 编辑器支持高亮、行号、错误定位、标准输入、自动保存、重置撤销和差异查看；其他语言位于「更多语言」，可查看与复制。
- 旧版阅读坐标与书签保留；教材更新后无法唯一匹配的批注显示「待重新定位」，可选择新的原文进行关联。

## 固定版本与许可

VitePress 1.6.4、Vue 3.5.22、StPageFlip 2.0.7、h5p-standalone 3.8.2、Pyodide 314.0.7；直接依赖固定版本并提交锁文件。H5P 官方分发包中的 Interactive Book 1.11.11 及依赖以资源文件形式固定。

使用与思源字体同源的 Noto Serif SC / Noto Sans SC，以及 JetBrains Mono，字体通过固定 Fontsource 包本地打包，许可在 `licenses/`。

教材改编内容遵循 **CC BY-NC-SA 4.0**，保留 krahets 与 Hello Algo 贡献者署名；封面沿用用户原附件。各软件组件保留各自许可。详见 [第三方说明](THIRD_PARTY_NOTICES.md)。

当前验收范围、干净克隆复验及截图见 [v0.3 验证记录](docs/VALIDATION_V03.md)；[v0.2 验证记录](docs/VALIDATION_V02.md) 保留；[首版记录](docs/VALIDATION.md) 保留作为历史参考。

首版实现、拖拽翻页、Python / H5P 接入经验与维护取舍见 [技术总结](docs/TECHNICAL_SUMMARY.md)。

## PLEX 在线接入

开发与 ZIP 预览默认 `/api` 代理到本机 5100；可用 `PLEX_API_TARGET` 配置固定后端地址或设为 `off`。题目需要先增量注册，详细步骤和主工程版本见 [接入说明](docs/PLEX_INTEGRATION.md)。令牌不进入学习备份，旧数据保留在访客空间。

## 完整压缩包

完整 ZIP 包含受版本控制的源码、教材、练习库、文档和已构建静态成品。解压后安装 Node.js 24+，Windows 双击 `START_PREVIEW.cmd`，或跨平台执行 `node scripts/serve-dist.mjs`，打开终端提示的本机地址；无需先安装 npm 或 Python 依赖。GitHub 克隆不含静态成品，需先按上方说明构建。

开发者在已提交的干净 Git 工作区运行 `npm run package`，会先构建再生成 `output/releases/` 下的 ZIP、SHA-256 校验文件。包内 `PACKAGE-MANIFEST.json` 记录提交版本及逐文件哈希，不包含 `.git`、虚拟环境、`node_modules`、本机日志或浏览器进度。
