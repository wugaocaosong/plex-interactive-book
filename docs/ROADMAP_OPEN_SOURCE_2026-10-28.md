# PLEX · 星轨编程：开源扩展调研与 22 项功能路线

调研日期：2026-10-28。基线：已发布的 v0.4.0。状态：功能规划与候选选型，尚未安装新依赖或完成兼容性原型，不是开发完成声明。

核对了公开 GitHub 仓库、README、可见许可证和官方功能文档。GitHub 连接器不可用，本机 CLI 未登录，匿名元数据 API 受限，因此不提供未经核实的最新版本、提交活跃度或星数排名。以下接入难度和优先级是针对本项目的工程判断。

## 产品方向与基线

把电子书扩展为贯通阅读、练习、复习、创作、分享的学习工作台。保留 Vue/VitePress、翻书与连续阅读、稳定块定位、IndexedDB、CodeMirror/Pyodide、H5P、Motion、ECharts、Rough.js 和真实 PLEX 账号／辅导。已有全文搜索、笔记、绘画、报告打印不作为全新功能重复计数；下面说明其新增部分。

接入类型：直接适配＝可作为浏览器组件接入，仍需开发；隔离模块＝独立面板、iframe 或 Worker；服务扩展＝需要 PLEX／部署端能力；借鉴适配＝复用题型或算法设计，不能直接整站搬入。中／大表示相对工作量，不是工期承诺。

## A. 长期学习与知识组织

| ID | 功能 | GitHub 候选与已核对许可 | 我们要实现的新增部分 | 接入与首轮验收 |
|---|---|---|---|---|
| 1 | 可安装的离线学习包 | [vite-pwa/vitepress](https://github.com/vite-pwa/vitepress)，MIT | 按章下载、缓存大小和进度、离线状态、内容更新提示；比现有 Node 静态预览多出浏览器安装与缓存管理。 | 直接适配／中。已下载章节在断网重启后可阅读；选装运行资源后 Python/H5P 可用；更新不清空学习记录。首次下载仍需可访问站点。 |
| 2 | 跨教材、术语和活动的统一检索 | [Pagefind/pagefind](https://github.com/Pagefind/pagefind)，MIT | 中文分词、类型／章节筛选、命中片段、课程扩展后的分块加载。 | 构建期适配／中。从原始内容块生成索引，不抓取翻页副本；结果映射既有 ReadingLocator，命中后准确回原文。个人笔记单独本机索引，不写入共享静态索引。 |
| 3 | 间隔复习与错题卡 | [open-spaced-repetition/ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)，MIT | 把术语、错题与选中文本制作成卡片，生成到期复习队列，保存忘记／困难／良好／简单评价。 | 直接适配／中。先制作 30 张审校卡；时钟、时区、撤销和备份恢复有确定性测试。调度建议不等于知识掌握判定。 |
| 4 | 结构化学习笔记本 | [ueberdosis/tiptap](https://github.com/ueberdosis/tiptap)，开源编辑器核心 MIT | 在现有批注上增加章节笔记、代码块、表格、实验截图、引用卡与双向返回链接。 | Vue 组件／中。迁移旧纯文本笔记，保留原文锚点；往返导入不丢引用。仅选开源核心，不默认包含付费 Pro／Cloud 功能。 |
| 5 | 图解上的区域批注 | [annotorious/annotorious](https://github.com/annotorious/annotorious)，BSD-3-Clause | 在数组元素、树节点、指针、三门图解的指定区域圈画、提问与写解释，区别于现有整块笔记。 | 原生 JS 包装／中。记录图片 ID、帧 ID、内容版本与坐标；缩放和手机旋转不漂移，图片更新时提示重新定位。 |
| 6 | 可解释的知识路线图 | [bcakmakoglu/vue-flow](https://github.com/bcakmakoglu/vue-flow)，MIT | 星域目录之外增加“前置知识—当前知识—练习—应用”的节点网络，以及失败后的补学路径。 | Vue 3 原生／中。先人工定义三门、二分、递归关系；所有节点能跳到稳定内容地址。访问、练习通过、自评分别显示。 |

Pagefind 中文分词需要相应扩展构建，见[官方多语言说明](https://pagefind.app/docs/multilingual/)。PWA 缓存下载、储存额度、更新策略和大型 WASM 资源需要自行编排；安装插件不会自动完成整本书的离线验收。

## B. 编程与可计算实验

| ID | 功能 | GitHub 候选与已核对许可 | 我们要实现的新增部分 | 接入与首轮验收 |
|---|---|---|---|---|
| 7 | 积木到 Python 的入门桥梁 | [RaspberryPiFoundation/blockly](https://github.com/RaspberryPiFoundation/blockly)，Apache-2.0 | 拖拽变量、条件、循环积木，实时展示生成的 Python，送入现有 Worker 执行。 | 隔离活动／中。先覆盖三门变量、合法门筛选、重复计数；相同输入下积木生成代码与参考代码结果一致。首版只做积木→代码，不承诺任意 Python 反向还原积木。 |
| 8 | 代码拼图与缩进练习 | [js-parsons/js-parsons](https://github.com/js-parsons/js-parsons)，MIT；[SortableJS/vue.draggable.next](https://github.com/SortableJS/vue.draggable.next)，MIT | 把打乱的代码片段排序、缩进、移除干扰项，作为独立实现之前的过渡任务。 | 借鉴适配／中。首批 12 题；重写 Vue 交互、增加键盘移动按钮，判题沿用 Pyodide。js-parsons 示例含 jQuery/UI/Skulpt，不直接把旧运行栈带入项目。 |
| 9 | 可计算实验笔记本 | [jupyterlite/jupyterlite](https://github.com/jupyterlite/jupyterlite)，BSD-3-Clause | 在同一实验文档中写解释、运行多个代码单元、生成图表、保存和导出 `.ipynb`。 | 隔离模块／大。先交付三门统计实验簿；打包其内核／包资源，测离线导入导出。它有独立内核生命周期，不假设自动共享现有 Pyodide 进程或练习成绩。 |
| 10 | HTML/CSS/JS 小作品工坊 | [evanw/esbuild](https://github.com/evanw/esbuild)，MIT | 多文件编辑、网页预览、控制台和项目模板；从“会写算法”扩展到“做出网页作品”。 | esbuild-wasm + 隔离预览／大。先无依赖三文件项目，再支持明确打包的库；学习代码不得访问 PLEX 会话。esbuild 是编译工具，不是安全沙箱或完整 Node 运行时。 |
| 11 | 浏览器 SQL 实验室 | [sql-js/sql.js](https://github.com/sql-js/sql.js)，MIT | 用课程样例数据库练习 SELECT、过滤、分组与 JOIN，查看结果表并完成查询任务。 | Worker／中。数据库文件与学习档案分离，提供重置和导入导出；错误 SQL 与长查询可恢复。需要另外编写数据库入门教学单元。 |
| 12 | 可拖动的数学／概率实验 | [jsxgraph/jsxgraph](https://github.com/jsxgraph/jsxgraph)，MIT 或 LGPL 双许可 | 调整概率参数、拖动几何对象、比较 n/log n/n² 增长曲线，并与正文解释联动。 | 原生 JS 包装／中。采用 MIT 许可路径；先做三门概率和复杂度比较两个模块，边界值有模型测试。已有 ECharts 继续承担统计曲线。 |
| 13 | 公式输入与推导练习 | [arnog/mathlive](https://github.com/arnog/mathlive)，MIT | 使用数学键盘输入分式、概率式、递推式，保存每一步推导，给出结构化反馈。 | Web Component／中。先受限表达式和人工定义步骤；MathLive 负责输入，不自动证明式子等价。若做符号判分，单独实现判定规则与测试。 |

Blockly 的边界见[官方代码生成文档](https://docs.blockly.com/guides/create-custom-blocks/code-generation/overview/)；esbuild 的浏览器能力见[官方 API](https://esbuild.github.io/api/#browser)。任意程序逐行执行分析不因引入动画或编辑器自动成立，仍须单独设计轨迹采集与限制。

## C. 表达、教学与出版

| ID | 功能 | GitHub 候选与已核对许可 | 我们要实现的新增部分 | 接入与首轮验收 |
|---|---|---|---|---|
| 14 | 算法剧情闯关 | [phaserjs/phaser](https://github.com/phaserjs/phaser)，MIT | 栈模拟货舱、BFS 规划星舰路径、排序安排能源模块；每关有预测、操作和解释。 | 隔离活动／大。先做一关验证教学价值；复用确定性算法模型，通关动画／随机获奖不冒充测验成绩；提供等价文字操作。简单舱门动画继续使用已有 Motion。 |
| 15 | 书页内的微课视频与字幕 | [videojs/video.js](https://github.com/videojs/video.js)，Apache-2.0 | 短讲解、字幕、章节时间点、续播与指定节点练习入口。 | 媒体适配／中。使用原生 HTML 接入路径，按选定版本验证 Vue 集成；先接一段自制本地视频。字幕、习题联动和学习记录需要自建，不把播放完成视为掌握。 |
| 16 | 教学投屏模式 | [hakimel/reveal.js](https://github.com/hakimel/reveal.js)，MIT | 从单元脚本生成课堂演示，提供讲稿、计时、逐步揭示及返回书页链接。 | 独立课堂视图／中。首个产物为三门 45 分钟演示；复用同一内容来源，避免课件与书籍分别维护。 |
| 17 | 正式讲义与纸质书 PDF | [pagedjs/pagedjs](https://github.com/pagedjs/pagedjs)，MIT | 从现有“学习报告打印”扩展到教材章节／全书排版，带目录、页眉、页码和可选留白。 | 独立出版流水线／大。先导出一章；代码、公式、图片跨页无丢失；交互组件生成静态说明和回书链接。Paged.js 负责打印排版，不替换 StPageFlip。 |
| 18 | PDF／EPUB 辅助资料架 | [mozilla/pdf.js](https://github.com/mozilla/pdf.js)，Apache-2.0；[futurepress/epub.js](https://github.com/futurepress/epub.js)，BSD-2-Clause | 导入用户有权使用的参考资料，与教材并排阅读，保留书签和资料引用。 | 隔离阅读模块／大。PDF 用页号／坐标，EPUB 用自身定位并映射学习档案；关闭资料脚本执行。PDF.js 不是 OCR，EPUB.js 是阅读器而非导出器。 |

## D. 内容生产、辅导与分发

| ID | 功能 | GitHub 候选与已核对许可 | 我们要实现的新增部分 | 接入与首轮验收 |
|---|---|---|---|---|
| 19 | 学习单元创作工作台 | [eclipsesource/jsonforms](https://github.com/eclipsesource/jsonforms)，MIT | 编者通过表单配置目标、逻辑页、活动、题目、提示和参考答案，预览后导出单元包。 | Vue 表单 + 内容构建／大。先做本地编辑器，无账号后台；产出经过 Schema 校验的 LearningUnitDefinition，稳定 ID 和原创／上游边界不变。在线发布审核另行建设。 |
| 20 | 小组笔记与结对编程 | [yjs/yjs](https://github.com/yjs/yjs)，MIT | 共同笔记、共享光标、结对改代码、协作画布，以及离线编辑后的重连合并。 | 服务扩展／大。需同步 provider、认证、房间权限、存储和运维；两端离线重连不丢文本。正式提交与成绩不使用 CRDT 随意合并，沿用 PLEX 权威记录。 |
| 21 | 有教材证据的小E辅导 | [oramasearch/orama](https://github.com/oramasearch/orama)，Apache-2.0 | 检索教材与活动证据，让每条解释能回到原文块；先提示，再解释，再给代码。 | 本机检索 + 既有 PLEX／中到大。先关键词／元数据证据版，语义检索后做对比实验；Orama 不是语言模型。服务端核验题目与内容版本，不把浏览器文本视为可信系统指令，笔记默认不上传。 |
| 22 | 无需安装 Node 的桌面版 | [tauri-apps/tauri](https://github.com/tauri-apps/tauri)，MIT 或 Apache-2.0 | 为 Windows 提供安装包，直接打开教材、管理本地课包与备份；后续评估其他系统。 | 桌面封装／大。先验证 WebView 内 Worker/WASM/H5P/打印/文件导出；浏览器与桌面数据迁移显式操作。签名、更新、系统运行组件及 `/api` 代理需独立适配。 |

## 第一批建议：v0.5 学习闭环

优先组合 **1 离线课包、2 统一检索、3 间隔复习、7 Blockly、8 代码拼图、21 小E证据引用**。它们可串成“阅读→检索→动手→解释→复习”的日常学习流程。

先完成一次底座兼容检查，针对当前固定 VitePress/Vue 及已有依赖公告拟定升级集合；每个新包选定具体版本后锁定并记录许可证，不能按本调研页面的 latest 直接全部安装。

| 小阶段 | 交付范围 | 退出条件 |
|---|---|---|
| v0.5 A | 活动接入约定、离线三门课包、块级统一索引 | 不丢旧定位／笔记；断网重启可学习；缓存更新可取消且不清档；中文检索测试集能准确跳回原文。 |
| v0.5 B | 三门积木示例 + 12 道代码拼图 | 三个补学示例能由积木生成并在 Pyodide 执行；拼图支持鼠标、触屏与键盘；原有 27 题身份及评分不变。 |
| v0.5 C | 30 张复习卡 + 小E原文引用 | 调度、撤销、备份与时间边界可复现；显示引用内容版本，来源链接有效；没有命中时如实说明。 |

检索试验集建议先收集至少 50 个真实中文问题、术语与代码符号查询，人工标注目标内容块；比较现有检索与新引擎的前 5 条召回、定位正确率及低端手机耗时，再确定是否替换默认检索。此处数量是计划目标，不是已经达成的指标。

## 后续分期

| 阶段 | 功能 ID | 主要交付 |
|---|---|---|
| v0.6 知识工作台 | 4、5、6、9、12、13 | 富笔记、图解批注、知识地图、实验簿、数学实验、公式练习。JupyterLite 与公式判分分别做技术原型。 |
| v0.7 创作与教学表达 | 10、11、14、15、16、17、18 | 网页作品、SQL、算法闯关、微课、投屏课件、教材 PDF、资料架。每项先配套一个原创教学样例再扩展。 |
| v0.8 可扩展分发 | 19、20、22 | 单元创作工具、经过权限设计的协作服务、Windows 桌面包。三个项目分别验收，避免绑定成一次大改版。 |

## 共同接入约定

1. 新功能按需加载，普通阅读不下载全部实验引擎。PWA 大文件、Notebook 内核、游戏素材、外部资料分别计入资源清单；离线能力逐模块标注。
2. 全部活动从书页固定宿主打开，退出时保存、停止运行、释放监听，再恢复 ReadingLocator。移动端保留单独面板，键盘有等价操作。
3. 统一活动 ID、内容版本、账户命名空间、草稿／记录和备份迁移。新编辑器不会替换稳定引用定位；失败不生成“完成”证据。
4. PLEX 继续负责账号与正式作答；同步、模型调用和资料上传为显式操作。新增平台不另建一套学生身份或重复成绩真相源。
5. 每阶段仍回归 118 个上游页面、73 个 Python 示例、27 题、两套 H5P；验证 390／820／1440px、两种模式、存储失败与恢复。无障碍工具检查不代替人工键盘与屏幕阅读器试用。
6. 资源与内容分别保存来源和许可；现有教材的作者、许可证和来源快照继续保留。新增媒体必须有明确使用来源。

## 调研中暂不直接引入的候选

- [RunestoneComponents](https://github.com/RunestoneInteractive/RunestoneComponents) README 明确已归档，后续开发转到 [RunestoneInteractive/rs](https://github.com/RunestoneInteractive/rs)。可研究其教材／交互组织方式；不把旧组件仓库当作当前推荐依赖，也不整体迁移 VitePress 和 PLEX。
- [Hedy](https://github.com/hedyorg/hedy) 值得借鉴渐进式语法教学；其 [LICENSE](https://github.com/hedyorg/hedy/blob/main/LICENSE) 为 EUPL-1.2，不按“普通 MIT 小组件”处理。先参考教学编排，不直接复制整个平台。
- [tldraw](https://github.com/tldraw/tldraw) 当前 README 标明 SDK 生产使用需要 license key，不能当作无条件免费开源依赖纳入。
- [Excalidraw](https://github.com/excalidraw/excalidraw) 的开源编辑器为 MIT，但现有 Rough.js 小黑板已覆盖基础用途；完整编辑器接入还要评估 React 宿主与隔离成本。暂不为替换已有画板增加第二套编辑器。
- Tiptap 开源核心与收费 Pro／Cloud 分开；本计划不把付费服务功能写成开源组件自带能力。见 [Tiptap README](https://github.com/ueberdosis/tiptap)。

## 下一步实施入口

建议下一张开发任务卡为“v0.5 A：三门单元离线课包与可回原文的统一搜索”。先保留现有搜索作为对照，交付一个章节资源清单、可取消的下载流程、断网回归和中文查询基准，随后再接 Blockly 与拼图。上述 22 项是路线图，开发顺序可按课堂试用结果调整。
