# 星舰分治验收记录

日期：2026-11-05。Windows、Node 24.14.1、Python 3.14.3、Chrome，生产静态预览端口 5198；开发预览端口 5196。测试使用隔离浏览器上下文与后端测试数据库，不操作线上学习数据。

| 检查 | 结果 |
|---|---|
| `npm run check` | 通过：类型、内容、模型资源、学习内容、36 项 Node 测试、9 项 Python 导入测试 |
| `npm run build` | 通过，16.62 秒；保留大 chunk 警告 |
| 后端针对性 pytest | 11 项通过；包含新 QA、视觉请求、旧代码上下文和原评论回归 |
| 生产浏览器全量选择集 | 85 项通过，12.1 分钟 |
| 重复导入 | 159 个教材／增强／注册表文件 SHA-256 对比无变化 |
| 最后修正的针对性回归 | 最新生产构建 13 项通过，1.9 分钟；含实际图片／公式像素裁切测试 |

## 覆盖范围

- 390、820、1440px，两种阅读模式中的原第 12 章入口、新实验和即时题、移动窗口、记录恢复。新实验组件 axe 检查无报告违规。
- 147 个可分页小节：390px 检查 4073 页、820px 检查 2188 页、1440px 检查 3014 页；逐块核对内容与页面边界。保留 118 个上游教材页面及队友六页实验。
- 原 73 个完整 Python 示例在真实 Pyodide 执行；既有五个章节任务参考代码、H5P、书签批注、智能搜索、银河、小E、画板、队友实验和学习备份回归。
- 五站状态模型覆盖重复值、未命中、空树、不一致遍历、Hanoi 最少步数及快速幂 0–64 指数。20 题答案／干扰项逻辑及浏览器实际答题流程通过。
- 真实 Python 运行、错误、超时，历史恢复及撤销；50 条上限、备份冲突保留、首答／最近作答及账号隔离。
- 框选预览不会自动请求模型；确认发送后才附带图文，并与代码上下文互斥。桌面图片和桌面／手机公式框选检查实际像素及原始 LaTeX。
- QA 离线发布保留草稿；后端两个学生与管理员验证共享、回复主题限制、权限、幂等、分页、JWT 失效及旧接口隔离；SQLite 升降级保留原记录。

## 回归中修正

1. 首次导入截图依赖时开发服务器优化重载影响测试；生产构建回归避免该干扰。
2. 人工截图检查发现 SVG 选区预览可能透明：foreignObject 改为固定原文尺寸后再裁切，并检测完全透明结果；透明截图进入失败提示。预览补纸面背景，深色面板中仍可阅读黑色公式。
3. 历史保存失败暂留窗口内存，可重试或导出；查看历史不会丢掉待保存记录。
4. 刷新 QA 重置回复分页；观看演示终点不冒充自主实验完成；历史测试结果不冒充修改后的代码已经通过。

## 待验收与实际限制

- 未配置真实视觉模型及密钥，供应商 HTTP 请求测试使用模拟传输；没有宣称真实读图联调通过。
- QA API 使用隔离数据库真实用户记录验证；尚未部署配套迁移、进行在线双账号浏览器联调或真实 MySQL 升降级。
- 人工课堂试用、屏幕阅读器、触屏实体设备、硬件控制验收未新增执行。自动无障碍检测不替代人工读屏验收。
- 管理员可持既有 PLEX 管理员 JWT 删除 QA；未新建管理员 UI。
- 本轮没有改 main、没有部署，也没有把截图持久化到后端或学习备份。

## 复测命令

```powershell
npm run check
npm run build
$env:PLEX_TEST_PORT='5198'
$env:PLEX_TEST_PREVIEW='1'
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE='C:/Program Files/Google/Chrome/Application/chrome.exe'
npx playwright test tests/browser/starship.spec.ts tests/browser/starship-data.spec.ts --reporter=line
```

完整 85 项选择集：starship、starship-data、teammate-labs、teammate-navigation、chapter12、reader、pagination、smart-search、stellar-library、galaxy-home、creative-tools、creative-data、learning-data。
