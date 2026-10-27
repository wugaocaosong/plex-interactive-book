# 从 GitHub 克隆并复现本地效果

## v0.2 新增资源

运行步骤沿用下文。`npm ci` 会安装锁定的 CodeMirror 与 Shiki；`web/public/learning/` 已随仓库保存，开发预览不需要先运行 Python。修改 `content/learning/` 后执行 `npm run build:learning`；`npm run check` 和 `npm run build` 都会检查这些资源与原始练习、术语定义一致。

备份恢复位于应用「笔记」面板。学习记录属于浏览器站点数据，克隆仓库或解压 ZIP 不会自动携带；需要手动导出 JSON，在新来源中导入。发布包继续包含已构建静态站点及 `START_PREVIEW.cmd`。

仓库：<https://github.com/yeniwu46-max/plex-interactive-book>，保持私有。默认 `main` 是可验收版本；需要拥有仓库访问权限并已配置 GitHub Git 凭据。无需从原作者仓库再次复制教材，也无需找到旧聊天附件。

## 环境

| 工具 | 本次复现版本 | 说明 |
| --- | --- | --- |
| Node.js | 24.14.1 | `.nvmrc` 固定；项目要求 24+ |
| Python | 3.14.3 | `.python-version` 固定；建议使用同版验收 |
| npm | Node 随附版本 | 必须用 `npm ci` 安装锁文件 |
| 浏览器 | Chromium / Chrome / Edge | 运行需支持模块 Worker、WebAssembly 和 Pointer Events |

首次下载 npm / Python 依赖及测试浏览器需要网络。日常阅读、字体、图片、Python 运行和 H5P 练习均从本地服务提供。查看上游源码等外链仍会访问外网。

## Windows PowerShell

在希望保存项目的目录执行：

```powershell
git clone https://github.com/yeniwu46-max/plex-interactive-book.git
cd plex-interactive-book
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.lock.txt
$env:Path = "$PWD\.venv\Scripts;$env:Path"
npm ci
npm run check
npm run build
npm run preview
```

无需运行 `Activate.ps1`，上述 PATH 仅影响当前终端。重新打开终端时再次设置 venv PATH 后再运行检查或构建，确保脚本中的 `python` 使用已安装依赖的环境。

## macOS / Linux

已安装上述 Node / Python 后：

```sh
git clone https://github.com/yeniwu46-max/plex-interactive-book.git
cd plex-interactive-book
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.lock.txt
npm ci
npm run check
npm run build
npm run preview
```

这组命令与 Windows 使用相同来源和依赖锁；实际干净克隆验收平台见 [v0.3 验证记录](VALIDATION_V03.md)，未将文档中的启动说明当作跨平台实测结论。

打开 **http://127.0.0.1:5190/**，应先显示完整封面。拖开封面后进入扉页，目录、搜索、拖拽翻页、代码实验室和二分查找练习可使用。停止服务使用运行终端的 Ctrl+C。

日常开发改用 `npm run dev`，它会自动准备运行资源并支持热更新。`npm run preview` 只服务已有构建，不会自动构建；源码修改后先停止 preview，重新 `npm run build`，再启动 preview。

## 完整浏览器验收

标准安装测试浏览器：

```sh
npx playwright install chromium
npm run test:e2e
```

Linux CI 如缺系统库，使用 `npx playwright install --with-deps chromium`。已有可兼容 Chromium 时可设置 `PLAYWRIGHT_CHROMIUM_EXECUTABLE` 为其绝对路径；这个本机路径不写入配置默认值。

要明确验收本次构建、避免复用另一个工作区的 5190 服务，在完成 build 后使用独立端口：

```powershell
# Windows；确保当前终端已设置上面的 venv PATH。
$env:PLEX_TEST_PORT = '5192'
$env:PLEX_TEST_PREVIEW = '1'
$env:PLEX_TEST_REUSE = '0'
npm run test:e2e
```

```sh
# macOS / Linux，先激活 .venv。
PLEX_TEST_PORT=5192 PLEX_TEST_PREVIEW=1 PLEX_TEST_REUSE=0 npm run test:e2e
```

Playwright 自动启动、结束该测试服务。默认是 5190 开发服务，`PLEX_TEST_PREVIEW=1` 切换到生产预览，`PLEX_TEST_REUSE=0` 拒绝误用已有服务。占用端口时请换一个未占用端口。

完整套件包含 37 项测试，其中三项逐节遍历全部普通小节，另有 73 个 Python 源文件、27 题参考解法和错误起始代码的实际运行，可能需要数分钟。仅验证鼠标拖拽可运行 `npx playwright test tests/browser/drag.spec.ts`。

## 哪些文件必须能从克隆中恢复

| 输入 | Git 中的位置 | 生成方式 |
| --- | --- | --- |
| 用户封面与星图参考 | `assets/references/` | assets 脚本复制封面 |
| 原教材和多语言代码 | `content/upstream/hello-algo/` | 已提交固定快照，不需联网重取 |
| 原创附页、教材 JSON、路由和图片 | `content/editorial.json`、`web/public/book/`、`web/read/`、`web/public/upstream/` | 已提交；`npm run import:book` 可再生 |
| H5P 内容和依赖库 | `content/h5p/binary-search/`、`runtime-lock.json` | assets 校验哈希并复制 |
| Python / H5P 播放器 / 字体 | `package-lock.json` 和包依赖 | `npm ci` 后由 assets / Vite 构建 |
| 许可 | `licenses/`、`THIRD_PARTY_NOTICES.md` | 随 assets 复制进站点 |
| 静态成品 | `web/.vitepress/dist/` | `npm run build` |

`node_modules/`、`.venv/`、浏览器缓存和构建产物不上传 Git，它们可以由锁文件与仓库输入重建。`web/public/vendor/`、`h5p/`、`images/`、`licenses/` 是资源副本，故也忽略。H5P 依赖自身的 `dist` 文件已通过 `.gitignore` 例外保留，不能把这些例外删掉。

## 独立分发静态成品

构建后可以复制整个 `web/.vitepress/dist/`，使用支持 `.html` 干净路由的 HTTP 静态服务器从网站根目录提供。无需 Python、Node 构建工具或源教材运行浏览器端功能。项目也自带仅依赖 Node 内置模块的服务器：`node scripts/serve-dist.mjs`，或 `node scripts/serve-dist.mjs --port 5192`。不要通过 `file://` 直接打开；当前资源路径按站点根 `/` 设计，尚未配置子目录前缀。

完整 ZIP 已包含静态成品和源码。解压完整目录后，Windows 可双击 `START_PREVIEW.cmd`；macOS / Linux 运行上面的 Node 命令。此方式需要 Node.js 24+，不需要 `npm ci`、Python、数据库或外网运行时。需要编辑源码时再按前文安装开发依赖。

ZIP 内的 `PACKAGE-MANIFEST.json` 提供每个文件的 SHA-256 和应用提交号，ZIP 旁的 `.zip.sha256` 校验整个压缩包。开发者先提交改动，再运行 `npm run package`，产物位于 `output/releases/`；该命令先构建，打包脚本拒绝有未提交改动的工作区。

首次打开新浏览器应显示封面。阅读进度、书签、语言偏好与练习成绩保存在 IndexedDB（阅读设置和 H5P 另有 localStorage 镜像），不属于教材内容，不随 clone 复制；它们按浏览器和来源（主机、协议、端口）隔离。页面实际分页依赖窗口大小和字体渲染，但内容和所有交互应保持一致。

## 常见问题

- **打开仍是旧界面或脚本 404**：停止旧 preview，构建后重新启动；浏览器强制刷新。VitePress preview 的旧进程可能仍持有旧资源映射。
- **缺 `bs4` / `yaml` 等 Python 包**：确认 `python` 指向 `.venv`，并从 `requirements.lock.txt` 安装，而非另一套系统 Python。
- **封面或 H5P / Python 资源 404**：先执行 `npm run build`（包含 assets）或 `npm run dev`（predev 自动执行 assets）；不要只启动尚未构建的 preview。
- **来源 / H5P 哈希报错**：检查是否下载不完整或编辑了原始文件，保留 `.gitattributes` 的字节策略，使用 Git 恢复对应来源；不要关闭完整性检查。
- **端口已经被使用**：停止旧进程或执行 `npx vitepress preview web --host 127.0.0.1 --port 5192`；不要在已有固定端口的 npm preview 命令上重复追加 `--port`。测试端口使用上述环境变量。
- **没有旧书签或成绩**：这是正常的新浏览器 / 新端口状态；验证同一来源下的刷新恢复即可。

## v0.3 单元与 PLEX

新增 14 页、3 道编程题和四题 H5P，`npm run build:activity` 同时重建两套练习。基础本机功能不要求安装 Flask、Docker 或配置模型服务；在线接入另见 [PLEX_INTEGRATION](PLEX_INTEGRATION.md)。

## v0.4 深化单元

原 14 个地址与 27 题保持不变，`content/learning/monty_lesson.py` 管理逐页目标、活动、分层提示及三个不计分示例。更新后运行 `npm run import:book`；重复导入不会覆盖板书与浏览器数据。完整 ZIP 内的静态成品已包含动画、ECharts、Rough.js、Python 标准库、两套 H5P 和字体，无需运行时 CDN。

备份导出为 v3，继续导入 v1/v2。新浏览器或新端口用“更多 → 笔记 → JSON 恢复”主动恢复；账号隔离保持不变。学习报告可单独下载 HTML 后离线查看和打印，返回原书链接需要本机预览服务器。

推荐先运行 `npm run check`、`npm run build`，再设 `PLEX_TEST_PREVIEW=1` 和独立 `PLEX_TEST_PORT` 执行 `npm run test:e2e`。完整结果见 [VALIDATION_V04.md](VALIDATION_V04.md)，技术维护见 [LEARNING_V04.md](LEARNING_V04.md)。
