# 第 12 章《分治》示范章

日期：2026-10-29。开发分支：`codex/ch12-learning-demo`。本次为现有 v0.4 内容的增量示范，不是全书新版本发布。

## 启动与入口

沿用 `docs/REPRODUCIBILITY.md` 的 Node 24.14.1 / Python 3.14.3 环境。`npm ci` 后执行 `npm run dev`；访问 `/read/chapter_divide_and_conquer/index`。静态交付使用 `npm run build` 后执行 `node scripts/serve-dist.mjs --port 5190`。

12.1 导入例子后的“开始探险！”打开五站任务路线。桌面实验/编辑器使用居中浮动窗口，手机使用适配屏幕的独立窗口；关闭后返回原文位置，路线可跳过和返回。访问、实验完成、最近代码测试各自显示，不把浏览次数算成掌握证据。全书窗口与暗色背景调整见 [UI 更新说明](GRAPHIC_UI_REFRESH.md)。

## 逐节改稿与素材

| 小节 | 新增讲解与示意图 | 活动 |
|---|---|---|
| 章首页 | 能源模块课程封面、学习目标、本地视频占位 | 视频未导入时不显示播放按钮 |
| 12.1 | 整理能源补给线；`merge.svg` 展示拆分与有序合并 | 本章路线、可输入 2—8 个整数的教学模型、合并两个有序列表任务 |
| 12.2 | 搜索有序信号；`search.svg` 展示中点与区间 | 递归二分查找，含空输入和未命中测试 |
| 12.3 | 根据前序/中序巡检记录重建连接树；`tree.svg` | 构建树任务；原逐帧建树讲解保留 |
| 12.4 | 能源环搬运；`hanoi.svg` | 1—5 环手动搬运、非法移动提示、标准解回看；原逐帧图解可展开对照；递归搬运代码任务 |
| 12.5 | 拆分、停止条件、返回/合并的回顾，澄清递归不等于自动并行 | 本章活动记录与返回路线 |
| 12.6 | 保留原巩固问题和快速幂内容 | 快速幂任务、提示、测试反馈 |

四张 SVG 为本次原创教学示意图，无外部图片或 CDN。已有上游教材、代码及图片的作者与许可保留；正文无作者简介/推广段落需要删除。本章默认 Python 编辑视图折叠源文件头部元信息，可通过“源码信息（展开）”查看，代码字节、行号、源码地址和草稿标识未删除。

本章任务 ID 为 `ch12-merge/search/tree/hanoi/power`，与原 27 道练习隔离。参考解法与 26 个用例在 `scripts/chapter12_tasks.py`；本机测试结果不作为 PLEX 服务器正式成绩。运行时可以修改示例调用的输入，判题仍使用受控用例。

## 术语与批注

`content/chapter12/config.json` 内的 `terms` 是本章解释清单。导入器按正文顺序标记每个术语首次出现，排除标题、目录、代码、公式、链接和活动卡；重复访问或从中间进入不会重新计算首次位置。标记只包装原文，不增加正文文本偏移。

桌面悬停/键盘聚焦浮现解释，点击固定；手机点击。解释贴在术语旁，边缘避让，不打开旧侧栏。Escape/空白处收起；滚动时跟随原词定位，原词离开可见区域或翻页时收起。浮注中的“记一笔”创建原文引用批注。

选字后就近显示高亮、划线和批注，支持多行文字。`Ctrl+Alt+M` / macOS `Command+Option+M` 添加批注，`Ctrl/Command+Enter` 保存，Escape 收起保留草稿。编辑器或输入框中不抢占选字快捷键；保存失败保留编辑内容并提示。点击原文批注标记可编辑已有笔记。

## 内容生成与视频接入

配置与四张素材在 `content/chapter12/`，增强转换在 `scripts/chapter12.py`，生成资源在 `web/public/chapter12/`。不直接改 `content/upstream/hello-algo/` 或生成页面。

更新后运行：

```sh
npm run import:book
npm run check
npm run build
```

视频尚未制作，配置的 `src` 和 `captions` 为 null。后续把 `intro.mp4`、`intro.zh.vtt` 放进 `content/chapter12/`，将 video.src 设为 `/chapter12/intro.mp4`、video.captions 设为 `/chapter12/intro.zh.vtt`；poster 可使用 `/chapter12/merge.svg` 或同目录新的 SVG。运行导入命令后资源会复制进本地站点。使用原生播放器，不自动播放，不通过外站请求。缺少已配置的文件会使导入失败。

关闭 `config.json` 的 `enabled` 并重新导入可撤下本章内容入口。完全回退阅读器交互需回退本分支相应提交；不要删除浏览器学习记录或来源快照。

## 数据与兼容

- 复用账号隔离的 IndexedDB 和 JSON v3 备份，继续兼容旧 v1/v2；不新增数据库版本。
- `chapter12:progress` 保存访问和实验完成；`chapter12:lab:merge/hanoi` 保存输入、步骤和手动历史；`chapter12:annotation-draft:*` 保存批注草稿。
- 编程沿用 `draft:ch12-*` 和 `attempt:ch12-*`；笔记仍是 `annotation:*`。全部通过现有备份服务导出，令牌不参与。
- 原内容的稳定 ID、旧别名和未修改段落保持；新卡片与改动块进入现有定位注册表。不能唯一匹配的旧批注按现有机制标为待重新定位，不擅自绑定到相似文字。
- 动画是确定性教学模型；真实 Python 运行与其分离。手动汉诺塔历史在恢复时逐步验证合法移动。

## 验证方法

`npm run check` 覆盖类型、118 页资源、原练习、模型和导入测试。新增 `tests/chapter12.test.mjs` 和 `tests/import_test.py` 检查首次术语、独立任务、重复导入、原段落 ID、排序重复/负数、汉诺塔所有规模、参考解法和典型错误。

`tests/browser/chapter12.spec.ts` 覆盖三尺寸/两模式、活动保存恢复、术语批注/快捷键、真实 Python、源码折叠以及活动面板 axe。全书与旧功能回归继续使用完整 `npm run test:e2e`。结果另见 `CHAPTER12_VALIDATION.md`，不以此测试说明代替实际运行结果。

人工课堂试用、NVDA/VoiceOver 验收和后续视频效果需要单独验收。
