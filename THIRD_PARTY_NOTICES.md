# 第三方内容与许可

## Hello 算法

- 原作：[krahets/hello-algo](https://github.com/krahets/hello-algo)，作者 krahets 及 Hello Algo 贡献者。
- 固定版本：`350f483801b2badb95180047aa82cadb825852a2`。
- 文本、代码、图像与其他媒体：[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)。原文在 `licenses/hello-algo-CC-BY-NC-SA-4.0.txt`；快照也保留原 LICENSE 与 README。
- 使用范围：简体中文 118 个教材页面、全语言引用代码、Python 辅助模块、教材图片与全部图解帧、首页的独立行星 / 宇航员 / 轨道素材。网站首页和纸质书宣传页仅保存在来源快照中。
- 转换：MkDocs 语法转 HTML、公式与脚注、图解播放器、相对链接适配、代码展开、内容块锚点与编排调整。原始文件不修改。生成页保留路径、提交与 SHA-256。

教材改编内容按 CC BY-NC-SA 4.0 分享，保留署名，商业用途需另行取得授权。私有仓库不改变原有许可条件。PLEX 献辞、编者前言、后记、致谢与练习标明为新增内容，不归于原作者名下。

## 阅读软件与字体

| 组件 | 固定版本 | 许可 |
| --- | --- | --- |
| VitePress / Vue | 1.6.4 / 3.5.22 | MIT |
| StPageFlip（page-flip） | 2.0.7 | MIT |
| h5p-standalone | 3.8.2 | MIT，保留包内第三方声明 |
| H5P Interactive Book | 1.11.11 | MIT，Joubel |
| H5P Column / AdvancedText / MultiChoice / Question | 1.18.8 / 1.1.14 / 1.16.14 / 1.5.15 | 库元数据声明 MIT |
| H5P JoubelUI / Transition / FontIcons | 1.3.19 / 1.0.4 / 1.0.6 | 库元数据声明 MIT |
| Font Awesome（H5P 分发） | 4.5.4 库，4.5.0 字体 | CSS MIT / 字体 SIL OFL 1.1 |
| Pyodide | 314.0.7 | MPL-2.0，保留运行时及 Python 自带许可 |
| KaTeX | 0.16.22 | MIT |
| Lucide | 0.468.0 | ISC |
| CodeMirror | 6.0.2 | MIT |
| CodeMirror state / view | 6.7.6 / 6.43.15 | MIT |
| CodeMirror Python / merge / lint | 6.2.1 / 6.12.3 / 6.9.7 | MIT |
| Shiki | 2.5.0 | MIT，保留包内声明 |
| Noto Serif SC / Noto Sans SC | Fontsource 5.2.6 / 5.2.7 | SIL OFL 1.1 |
| JetBrains Mono | Fontsource 5.2.6 | SIL OFL 1.1 |

H5P 库来自 [官方 InteractiveBook 分发包](https://api.h5p.org/v1/content-types/H5P.InteractiveBook)，仅打包实际使用的 9 个运行库。版本、库元数据和逐文件哈希在 `content/h5p/runtime-lock.json`，保留原包作者、许可标识与内嵌声明。Interactive Book 与 H5P 原仓库许可副本在 `licenses/dependencies/`。H5P PHP 原仓库的 GPL 文本一并留存作来源记录，本项目没有引入 PHP 服务端；范围说明见 [H5P 官方许可说明](https://h5p.org/licensing)。

字体通过固定 npm 包本地打包，不依赖 Google Fonts 外链。直接依赖的许可与版本列表在 `licenses/dependencies/` 和 `licenses/dependencies.txt`；构建复制到站点 `/licenses/`。Pyodide 许可取自固定版本官方仓库；其他 npm 许可通过 `npm run assets` 从安装包复制。

## 用户附件与原创代码

`assets/references/cover.png`、`star-map.png` 来自用户附件。封面直接使用、不拉伸；星域截图仅作参考，实际导航使用上游独立素材。未为附件另行声明开放许可。

本项目原创应用代码未单独授予开放源代码许可；教材改编与第三方软件分别遵循上述许可。编者及出版机构信息待项目方填写。

## v0.3 原创教学与品牌

三门问题故事、中文讲解、CSS 舱门、板书图形、模拟程序与题目由本项目编写，未整本导入或翻译第二本教材。基础知识组织参考 [Allen B. Downey 的 Think Python 第三版](https://greenteapress.com/wp/think-python-3rd-edition/)（原书 CC BY-NC-SA 4.0）；经典问题的规则核对参考 [University of Illinois Data Science Discovery](https://discovery.cs.illinois.edu/guides/Classic-Problems/Monty-Hall-Problem-Interactive-Game-and-Solution/)，未复制该站交互代码或图片。

小E与 PLEX 标志复用本项目方 PLEX 主工程已有素材，路径、提交与原样文件哈希见 `web/public/brand/SOURCES.json`，不额外声明开放许可。原封面和全部 Hello Algo 署名、许可证与快照仍保留。

## v0.4 动画、图表、几何与检测

| 官方项目 | 固定包 | 许可 | 用途 |
|---|---|---|---|
| [Motion for Vue](https://github.com/motiondivision/motion-vue) | motion-v 2.8.0 | MIT | 舱门、核心、小E二维过渡 |
| [VueUse](https://github.com/vueuse/vueuse) | @vueuse/core 12.8.2 | MIT | Motion 配套依赖，显式固定 |
| [Apache ECharts](https://github.com/apache/echarts) | echarts 6.1.0 | Apache-2.0 | 全部实际频率点、理论线及 SVG 导出 |
| [Vue ECharts](https://github.com/ecomfe/vue-echarts) | vue-echarts 8.3.2 | MIT | 图表生命周期、容器缩放 |
| [Rough.js](https://github.com/rough-stuff/rough) | roughjs 4.6.6 | MIT | 固定种子的手绘几何与模板 |
| [axe-core npm](https://github.com/dequelabs/axe-core-npm) | @axe-core/playwright 4.14.0 | MPL-2.0 | 仅开发测试的自动无障碍检查 |

完整许可证及转移依赖声明位于 `licenses/dependencies/`；新场景使用本项目 CSS/SVG 几何与既有品牌素材，没有引入付费动画或外链 CDN。
# 第 12 章示范新增说明（2026-10-29）

本章能源模块、信号查找、连接树与能源环 SVG 是 PLEX 原创教学示意素材；原 Hello Algo 图解及源码继续保留原许可与来源。`@codemirror/language` 6.13.1（MIT）由已有传递依赖提升为精确直接依赖，用于折叠源码头信息，许可证随静态资源提供。未引入外站视频、额外模型服务或收费素材。
## 翻页输入资源（2026-10-30 增补）

小艺正面机器人 `web/public/brand/little-e-front.png` 基于项目提供的 `little-e.png` 背面图，通过 imagegen 生成。保留原有角色设计，来源与 SHA-256 记录于 `web/public/brand/SOURCES.json`，不宣称其为第三方开源角色素材。角色待机与交互动作由本项目 CSS 实现。

MediaPipe Tasks Vision 0.10.32、Google hand_landmarker float16 v1、vosk-browser 0.0.8、Vosk 中文小模型 vosk-model-small-cn-0.22 使用 Apache-2.0；许可文本见 `licenses/dependencies/input-models-Apache-2.0.txt`，资源来源、版本与校验值见 `content/input-models/manifest.json`。Vosk 模型仅改变归档格式和目录权限，模型权重不变。测试手部图片来源及合成语音说明见 `tests/fixtures/input/README.md`。上述许可不替代《Hello 算法》教材本身的 CC BY-NC-SA 4.0。

## 银河阅读升级（2026-11-02）

- TresJS / @tresjs/core 5.10.0：https://github.com/Tresjs/tres ，MIT。
- Three.js 0.187.0：https://github.com/mrdoob/three.js ，MIT。
- @pmndrs/pointer-events 与 radashi 为 TresJS 的运行依赖，精确解析版本见 package-lock.json；许可副本由 assets 脚本收集。
- 银河粒子、静态星球、实体书结构和 RobotRig 分层机器人为本项目程序绘制，未导入外站纹理或付费素材。角色延续已有小艺机器人外形语言；原 PNG 仍保留。
- 教学场景为本项目编写的确定性算法模型，原教材文本、图解及署名继续按原来源许可保留。

## 漫画银河首页（2026-11-02）

银河尘埃聚类与底图着色器改编自 [Galaxy Explorer](https://github.com/zjoooooo/galaxy-explorer)，固定提交 `2df71512c45e6de15a50f5e36dfd5dbe5e462ecd`，Copyright (c) 2026 Justin Zhang Jun，MIT。完整许可保存在 `licenses/galaxy-explorer-MIT.txt`，构建时随静态资源提供。

复用范围为 `index.html` 的 `buildDust` 与 `buildPaintedGalaxy` 中的程序化噪声、沿旋臂卷积与尘埃分布。适配现代 Three.js，缩放坐标、使用固定随机种子、调整青紫配色、减少烘焙步数并修正逆序 smoothstep；未复制其旧版 Three、音乐、NASA/第三方摄影、太阳系或外部数据接口。相机使用当前 Three.js 的 OrbitControls，本项目实现书籍导航转场。

星球着色、完整实体书几何、书籍封底、漫画控件和睁眼遮罩由本项目制作；封面仍为已有项目素材。三张视觉提案由 imagegen 生成，只保存在设计文档中，不作为可交互场景或阅读正文。
