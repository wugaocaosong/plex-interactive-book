# 谱联产品基础跳转 · 2026-11-03

本轮仅增加产品网址导航：不合并登录、不共享学习记录、不附带令牌、用户编号、课表或聊天内容。链接在新窗口打开，保留当前工作；当前产品不重复列出。海绵伴入口使用公开首页，不自动加入特定分享小组。

## 操作入口

| 产品 | 入口 | 本轮发布状态 |
| --- | --- | --- |
| PLEX | 右上角个人菜单 → 谱联产品 | 本地源码与构建完成，未覆盖线上版本 |
| LINK | 右上角账户选项 → 谱联产品 | 本地源码与构建完成，未覆盖线上版本 |
| 星轨编程 | 阅读页底部更多 → 谱联产品 | 已部署 genius.wuyeni.cn |
| 课桌伴 | 设置 → 谱联产品 | 本地源码与构建完成，未发布 Web / APK |
| Open Resource × AI | 顶栏 → 谱联产品 | 本地源码完成，需由原 WorkBuddy 项目发布 |
| 海绵伴 | 账号与设置 → 谱联产品；登录页底部也有入口 | 本地源码完成，需由原 WorkBuddy 项目发布 |

## 地址

- PLEX：http://106.15.77.40/
- LINK：https://106.15.77.40:8443/
- PLEX 星轨编程 / Genius 算法：https://genius.wuyeni.cn/
- Open Resource × AI：https://path-integral.app.workbuddy.host/
- 海绵伴：https://sponge-buddy.app.workbuddy.host/
- 课桌伴：https://timeable.wuyeni.cn/

Vue / React 项目的组件旁有 pulian-products.json，修改后重新构建。两个静态网站的地址在 pulian-products.js 中；发布时必须同时带上 pulian-products.js 与 pulian-products.css。

没有引入依赖、后台接口或数据迁移。各工程已有的未提交修改保留，未自动提交、推送或整包发布其他成员的工作。

## 验证

- PLEX：生产文案检查、vue-tsc、Vite 构建、产物检查通过。
- LINK、课桌伴：生产构建通过。
- 星轨编程：类型检查、构建、118 个上游页面审计、27 道练习的 130 个参考用例通过。
- 两个静态站点：新增脚本语法检查通过；Open Resource 本地弹窗已浏览器验证。
- 线上星轨编程：银河、实体书、开书到扉页、更多菜单、五个外链显示已验证。章节深链接、Python mjs / WASM 返回 200 且 MIME 正确。
- 保留现有项目的包体积警告；Open Resource 原有 Store is not defined 云端清单错误不属于本轮改动，产品目录独立工作。
- 未以模拟验证冒充账号内真机或 Android 验收。其他产品线上菜单要在各自正式发布后才可见。
