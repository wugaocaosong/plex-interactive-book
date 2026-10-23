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
