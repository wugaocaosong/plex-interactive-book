# 星航驿站 · 配送规划（原创教学内容）

来源：队友 bingsober 的 `bingsober/ui-restore` 分支，固定提交 `8858dba45cd0124629b432895dd7345e61f57bd2`（2026-11-02，Restore classic reading UI and interactive labs）。仓库：https://github.com/yeniwu46-max/plex-interactive-book 。本次为同一私有项目的贡献整合，沿用仓库许可与来源声明，不改称 Hello 算法原文。

六个 JSON 是从该快照提取并确立的原创内容源，保留 HTML、稳定块 ID、旧别名；此后修改这些文件，通过 `npm run import:book` 生成阅读页、目录、全文搜索、代码与运行资源。无需访问队友分支，也不依赖其未提交的 `build_lab_pages.py`。

`route_planner.py` 原先置于上游快照目录，现移到此处。`scripts/route_lab.py` 负责：

- 保持 `/read/unit/lab/{index,graph,traversal,sort-search,dispatch,report}` 地址及原块 ID。
- 将原 15 个 textarea 实验台转换为代码预览、操作入口和运行状态，使用现有 CodeMirror 固定浮窗；不把编辑器放进翻页克隆节点。
- 在独立运行的综合调度片段前补齐建图、BFS 辅助函数，并显式打印结果。
- 为每个代码卡保留 `draft:lab-editor:<原 key>` 作为只读迁移来源，生成新的按示例、语言、版本保存的草稿标识。
- 生成 `web/public/learning/route-lab/*.py`，标注 `sourceOrigin: authored`，纳入内容审计和 Python 辅助文件包。

基础档为可运行参考演示；进阶和挑战档包含待完成模板，可能报错或暂时没有输出，这属于题意而非已完成代码。原有 27 道计分练习与此单元分开；“运行完成”只说明 Python 正常返回，不表示任务通过或知识掌握。

`glossary-supplements.json` 提取队友的 118 项首次出现位置／白话解释等补充，合入现有术语表。未实现的 Ctrl+S 保存、Ctrl+Enter 运行提示已去除；不覆盖第 12 章的专用术语浮注。
