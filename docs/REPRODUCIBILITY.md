# 从 GitHub 克隆并复现本地效果

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

这组命令与 Windows 使用相同来源和依赖锁；实际干净克隆验收平台见 [验证记录](VALIDATION.md)，未将文档中的启动说明当作跨平台实测结论。

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

完整套件包含 16 项测试，其中三项逐节遍历全部普通小节，另有 73 个 Python 源文件运行，可能需要数分钟。仅验证鼠标拖拽可运行 `npx playwright test tests/browser/drag.spec.ts`。

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

构建后可以复制整个 `web/.vitepress/dist/`，使用支持 `.html` 干净路由的 HTTP 静态服务器从网站根目录提供。无需 Python、Node 构建工具或源教材运行浏览器端功能。不要通过 `file://` 直接打开；当前资源路径按站点根 `/` 设计，尚未配置子目录前缀。

首次打开新浏览器应显示封面。阅读进度、书签、语言偏好与练习成绩保存在 localStorage，不属于教材内容，不随 clone 复制；它们按浏览器和来源（主机、协议、端口）隔离。页面实际分页依赖窗口大小和字体渲染，但内容和所有交互应保持一致。

## 常见问题

- **打开仍是旧界面或脚本 404**：停止旧 preview，构建后重新启动；浏览器强制刷新。VitePress preview 的旧进程可能仍持有旧资源映射。
- **缺 `bs4` / `yaml` 等 Python 包**：确认 `python` 指向 `.venv`，并从 `requirements.lock.txt` 安装，而非另一套系统 Python。
- **封面或 H5P / Python 资源 404**：先执行 `npm run build`（包含 assets）或 `npm run dev`（predev 自动执行 assets）；不要只启动尚未构建的 preview。
- **来源 / H5P 哈希报错**：检查是否下载不完整或编辑了原始文件，保留 `.gitattributes` 的字节策略，使用 Git 恢复对应来源；不要关闭完整性检查。
- **端口已经被使用**：停止旧进程或执行 `npm run preview -- --port 5192`；测试端口使用上述环境变量。
- **没有旧书签或成绩**：这是正常的新浏览器 / 新端口状态；验证同一来源下的刷新恢复即可。
