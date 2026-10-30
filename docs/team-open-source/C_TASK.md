# C：编程活动与执行环境负责人

> 2026-10-30 补充：第 12 章与全书暗色浮窗现位于 `codex/ch12-learning-demo`，见 [本次更新](../UPDATE_2026-10-30.md)。下文共同基线是 10 月 28 日的历史约定；新任务应先整合本分支，保留章节增强与全书浮窗。本文所列四条任务分支仍为规划，并非本次创建。

把本文件完整交给你的 AI。先执行首批任务，后续清单只是责任归属，不要一口气全部实施。

- 提交仓库：https://github.com/yeniwu46-max/plex-interactive-book （私有）
- 你的分支：`codex/ebook-c-coding`（约定，尚未创建）
- 整合目标：`codex/learning-v05-integration`（由 A 创建）
- 路线图编号：7, 8, 9, 10, 11
- 共同基线：`76c27d79c4f36d247ff1796dd436c1c7509c90c9`

## 共同背景（给接手 AI）

这是《PLEX·星轨编程》的增量开发，不是新建网站。主仓库是私有的 https://github.com/yeniwu46-max/plex-interactive-book 。四人都在这个仓库开发，各有独立 clone 和分支；下面列出的开源项目是依赖或参考仓库，不是提交目标。仓库管理员需先给四人的 GitHub 账号协作者权限。不要公开 fork、部署或上传教材。

共同已核对本地提交：`76c27d79c4f36d247ff1796dd436c1c7509c90c9`，package.json 版本 0.4.0。启动前 fetch 并验证该提交；不能把远端当前 main 自动等同于此提交。本轮交接未创建远端分支，所列分支名是约定名称。文件已保存在本地，交接 ZIP 不含完整项目源码。

现有栈：Vue 3.5.22、VitePress 1.6.4、StPageFlip 2.0.7、CodeMirror 6、模块 Worker/Pyodide 314.0.7、H5P standalone 3.8.2、Motion、ECharts、Rough.js。保留 118 个上游教材页、73 个 Python 示例、27 道编程练习、两套 H5P、三门单元 14 个稳定逻辑页及双模式阅读。保留账号隔离、稳定块定位、批注、JSON v3 备份且继续兼容 v1/v2。教材作者、许可、来源快照必须保留。

优先阅读：README.md、docs/REPRODUCIBILITY.md、docs/ARCHITECTURE.md、docs/LEARNING_V04.md、docs/LESSON_MONTY_V04.md、docs/VALIDATION_V04.md、docs/PLEX_INTEGRATION.md、THIRD_PARTY_NOTICES.md；再看交接包内 ROADMAP_OPEN_SOURCE_2026-10-28.md。新功能参考仓库尚未完成安装兼容性验证，需核对官方文档、许可证和可兼容版本后固定精确版本，不能同时全量安装 latest。

本次四条工作线覆盖全部 22 项路线，不表示所有功能要在一次 PR 完成。首批 v0.5 仅实施：离线课包、统一搜索、间隔复习、积木 Python、代码拼图、小E证据引用。后续功能按路线图各自排期。D 首批负责教学数据与跨模块验收，创作后台等后续任务暂不提前扩张。

## 环境、启动、测试与 Git

Node 24.14.1、Python 3.14.3；每人使用自己的 clone。Windows PowerShell 示例（将 ROLE_BRANCH 替换为本任务指定分支）：

```powershell
git clone https://github.com/yeniwu46-max/plex-interactive-book.git
cd plex-interactive-book
git fetch origin
git switch -c ROLE_BRANCH 76c27d79c4f36d247ff1796dd436c1c7509c90c9
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.lock.txt
$env:Path = "$PWD\.venv\Scripts;$env:Path"
npm ci
$env:PLEX_API_TARGET = 'off'
npm run dev
```

打开 http://127.0.0.1:5190/ 。同一机器开多个 clone 时使用 `npx vitepress dev web --host 127.0.0.1 --port 5191` 等不同端口，先执行 `npm run assets`；端口不同的学习记录不共享，不能据此判断丢档。macOS/Linux 按复现文档设置 Python 虚拟环境。

开发前记录基线测试结果。完成模块后执行：

```powershell
npm run check
npm run build
npx playwright install chromium
$env:PLEX_TEST_PORT = '5192'
$env:PLEX_TEST_PREVIEW = '1'
$env:PLEX_TEST_REUSE = '0'
npm run test:e2e
```

先跑相关测试定位问题，合并门禁跑全量；基线失败与新增失败分开记录，不能删测试规避。浏览器覆盖 390/820/1440px、翻书/学习两模式、刷新/恢复/账号切换、键盘操作。axe 不代替人工屏幕阅读器验收。真实模型、真实后端和模拟接口测试必须分别标记。

提交使用明确文件列表，检查 diff，不使用 `git add .` 带入无关删除、凭据或产物。允许推自己的任务分支并开 Draft PR；不直接推 main、不覆盖他人分支、不自行发布版本。首次 `git push -u origin ROLE_BRANCH` 才创建对应远端分支。PR 目标为 A 建立的 `codex/learning-v05-integration`；目标未建立时先提交自己的分支，待建立后再开 PR。

## 公共接口与文件所有权

以下是待 A 用现有接口适配并落实的协作约定，不是声称仓库已经具有这些插件接口。A 先交付最小接口 PR，其余成员可以先写纯模型、教学数据和测试，不必等待完整 UI。

- 沿用 `web/.vitepress/theme/types.ts` 的 ReadingLocator：`sectionId, blockId, offset, contentVersion?`。不使用物理页码；旧 block 别名保留。
- A 负责活动宿主适配：按需加载，传入 activityId、locator、内容版本、当前账号 scope，统一打开/关闭/导航。关闭前 flush、停止运行、释放监听并恢复原文位置；书页内只放入口和摘要。
- A 提供统一块检索结果约定：来源 ID、稳定 locator、版本、原文片段、匹配偏移、内容类型。Pagefind 负责全书检索；B 的 Orama 仅为小E证据检索做对照实验，不另建第二个用户搜索入口或重复全文来源。
- B 负责学习数据和备份接口：模块按命名空间注册序列化/校验/迁移，包含 ownerScope、稳定 ID、schemaVersion、contentVersion、updatedAt；记录冲突分别保留。缓存与学习数据分开，令牌不进入备份。其他成员提供模块 schema/测试 fixture，由 B 整合公共 store 与迁移。
- C 负责 Python 运行适配：沿用请求 ID/运行 ID、输出/诊断、停止与超时；自由运行和判题隔离；迟到结果丢弃。新增活动不能各自复制一套 Worker。
- D 负责可审核的教学内容与测试数据：活动 ID、对应章节/locator、题意、提示、输入输出、参考结果、内容版本；和 B/C 协调 schema 后冻结 fixture。访问、完成活动、练习通过和正式成绩分别记录。
- 优先在 `web/.vitepress/theme/features/<模块>/` 新增自包含实现（此为建议新增目录）；优先在 `content/extensions/<模块>/` 保存原创内容。新增入口和生成流水线由公共文件负责人接线。测试文件顶层采用 `tests/<模块>-*.test.mjs` 或 `tests/browser/<模块>-*.spec.ts`，以适配现有运行命令；其他路径需显式注册脚本。

公共文件负责人：A 管 `Layout.vue`、`UnitPanel.vue`、公共导航/样式、`types.ts`、VitePress 配置、资源打包/预览脚本及发布；B 管 `learning-store.ts`、`learning-scope.ts`、`annotations.ts`、备份/迁移、`PlexCoach.vue` 和 `plex-client.ts`；C 管 `CodePanel.vue`、`CodeEditor.vue`、`web/public/python-worker.js`；D 管原创教学脚本、题目 fixtures、教学手册及验收矩阵。跨界修改先在 PR 写明请求，交由对应负责人处理或明确协调，不让四个 AI 同时重写同一个文件。生成目录只由源文件和脚本再生，不手改生成 JSON。

各人可以在自己的分支增加本模块依赖，但要同时提交 package.json 与锁文件、第三方说明。A 顺序合并依赖清单，用 npm 重新生成/校验锁文件，绝不文本拼接锁文件或盲目采用一侧版本。全局框架升级独立 PR，先跑基线。

## PLEX 与安全边界

现有 PLEX 主工程远端已核对：私有 https://github.com/yeniwu46-max/plex 。它不是电子书前端目录。后端仅 B 在确有需要时另 clone 开分支；禁止照旧工作树直接改错项目。既有接口适配记录在 `integration/plex-manifest.json`，提交 `536ac132f35dfff88f97bc85f1515a77d405b153`；它是历史兼容基线，使用当前后端前要核对差异。默认 `/api` 代理 http://127.0.0.1:5100，使用 `PLEX_API_TARGET` 固定配置。

保留现有登录/刷新/退出、画像、练习提交与 tutor 接口；题目 MH030001/MH030002/MH030003 的身份和版本由服务器核验。检索到的书文不是可信系统指令；浏览器自报的成绩不是服务器成绩。缺后端时显示不可用，不冒充在线模型。B 若需要新增证据来源协议或协作服务，先提出后端契约与独立 PR，不捏造现有 API 字段。不要上传用户笔记、令牌、数据库或模型密钥。

## 每个 PR 的交付物

1. 可运行代码、精确依赖锁、许可来源；功能开关或延迟加载入口，普通阅读不加载全部新引擎。
2. 本模块说明 `docs/features/<模块>.md`：目标、边界、接口、离线能力、启动与回退办法。
3. 确定性单元测试与相关浏览器测试，明确真实结果、失败和未验收项；不把写了测试等同于通过。
4. 数据迁移/导入导出 fixture；旧版数据保留、账号不串档、关闭后恢复位置。
5. PR 说明包括修改文件、共享接口请求、测试命令与结果、演示步骤、后续任务。发布 tag、完整 ZIP、SHA-256 由 A 在整合验收后统一产出。

请先检查仓库状态和适用 AGENTS.md，报告与你任务相关的现有实现，然后从下面“首批任务”逐步实现，禁止一次重写整个阅读器。


## 本人负责的候选开源仓库

| 功能 | 仓库 | 调研时核对许可 |
|---|---|---|
| 7 积木 Python | https://github.com/RaspberryPiFoundation/blockly | Apache-2.0 |
| 8 Parsons 题型 | https://github.com/js-parsons/js-parsons | MIT |
| 8 Vue 拖拽 | https://github.com/SortableJS/vue.draggable.next | MIT |
| 9 实验笔记本 | https://github.com/jupyterlite/jupyterlite | BSD-3-Clause |
| 10 网页作品编译 | https://github.com/evanw/esbuild | MIT |
| 11 SQL | https://github.com/sql-js/sql.js | MIT |

## 先读的现有代码入口

web/.vitepress/theme/CodePanel.vue、CodeEditor.vue、LearningHub.vue、types.ts；web/public/python-worker.js；content/learning/exercises.py、scripts/prepare-learning.py；tests/browser/learning.spec.ts。

## 首批任务：v0.5

1. 暴露现有 Worker 的稳定运行适配器，与 A 的固定活动宿主接线；关闭、切换、停止必须终止或取消运行，迟到结果不得保存为成功。
2. Blockly 三个案例：变量与比较、合法开门筛选、循环重复计数。生成 Python 送入现有 Worker，保存工作区和代码；明确单向生成，不承诺任意代码反向转积木。
3. Parsons 代码拼图：使用 D 提供的 12 题数据，实现排序、缩进、干扰项、重置、提示和测试反馈。借鉴 js-parsons 题型，不引入其旧 jQuery/Skulpt 栈；Vue 拖拽外还提供键盘上移/下移/缩进按钮。
4. 原 27 道题及服务器 MH030001/2/3 的身份不变；新拼图是独立活动，不冒充原题成绩。数据通过 B 的账号/备份适配器持久化。
5. 为 D 的教案提供运行示例、每种失败状态和可录屏演示步骤。

## 首批验收

三类积木生成代码与参考结果一致；12 题参考排列通过、典型错误被识别；键盘/触屏操作可完成；草稿刷新恢复；无限循环能停止/超时；Worker 不重复实例；73 个旧示例、27 题回归，运行真实 Pyodide 而非仅 mock。

## 后续归属（首批通过后再排期）

v0.6 独立 JupyterLite 三门统计 notebook，验证自己的内核/资源/导入导出，不假设共享 Worker。v0.7 先做三文件 HTML/CSS/JS 作品工坊，再做 SQL 示例库与查询任务；两个模块各自限时/清理和隔离用户代码。

## 边界与协作

esbuild 不是安全沙箱，学生预览不能访问 PLEX 会话；sql.js 数据库不得与学习记录数据库混用。JupyterLite 体积和包依赖必须单独列入 A 的离线清单。不要擅自替换现有 CodeMirror、Pyodide 或判题协议。

## 给 AI 的执行要求

我在四人小组中负责 C。请在上述私有仓库和独立分支推进，先读取现有文档与代码，然后实现本文件首批任务。尊重公共文件所有权，跨模块先提出最小接口请求。不要改成 React，不要另建身份/评分系统，不要删教材或版权，不要覆盖其他人的分支。每个可验收小任务提交一次，更新文档并运行相关检查，最后推送自己的任务分支并给出 Draft PR、演示步骤、真实验证结果与剩余问题。公共接口未合入时可以写模型/fixture/测试，但不能把临时 mock 当成真实接入交付。没有远端权限时保留本地提交并明确说明，不声称已上传。
