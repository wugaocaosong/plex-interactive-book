# 创作工具升级验收记录

日期：2026-10-30。分支：`codex/ch12-learning-demo`。操作说明见 [CREATIVE_TOOLS_UPGRADE.md](CREATIVE_TOOLS_UPGRADE.md)。

## 已完成检查

- `npm run check`：类型、教材资源、输入模型 SHA-256、教学内容检查通过；28 项 Node 测试、7 项 Python 测试通过。
- `npm run build`：静态构建通过。仍有原有大块资源体积提示，未引入新依赖或 CDN。
- 内容审计：118 个上游教材页、143 个书籍小节、136 个代码引用、250 张图片、292 帧图解保持完整；27 道练习的 130 个参考用例通过。
- 生产预览回归：40/40 通过，报告在本机 `output/creative-tools-regression.json`。包含新工具、翻页控制、学习记录、三门课程与 H5P 自测，使用系统 Chrome，独立 5194 端口，未与开发热更新混用。
- 全屏映射与旧板书备份恢复另外各连续执行 3 次，6/6 通过。全屏恢复检查等待明确的“控制设置已保存”；立即刷新可能中断尚未完成的浏览器保存事务。
- 最后调整气泡上下定位后重新构建，390/820/1440px 三项检查全部通过（`output/creative-tools-bubble.json`），增加断言确认默认气泡不遮住角色。

## 新功能证据

| 范围 | 验证内容 |
| --- | --- |
| 翻页笔 | 拒绝翻页键冲突，录入 KeyF，实际进入和退出 DOM 全屏，保持阅读地址，刷新恢复映射。测试使用键盘事件，不冒充真实 USB 校准。 |
| 小黑板 | 390/820/1440px 窗口可用、键盘移动/缩放、画板命名/切换、十块上限、删除恢复；文字拖动/撤销、18 单位笔粗、本地图片、PNG 文件导出。 |
| 数据 | 旧单板转换为多板，图片数据随备份恢复；账号分离；配额失败时保留窗口和文字，恢复存储后重试成功。导入到空账号验证恢复，已有不同版本仍按原备份机制保留冲突副本。 |
| 角色与聊天 | 拖动不误开气泡、访客提示登录、当前小节上下文、服务器提示与模型来源区分、取消后的迟到答复丢弃。聊天接口由独立模拟响应验证，没有冒充真实模型联调。 |
| 离线听写 | 实际本地 Vosk 模型处理中文 WAV 音频；“下一页”填入草稿、不自动发消息、不触发翻页；阻断外网后仍运行，关闭气泡后音频轨道结束。该用例注入音频流，不是人声麦克风真机验收。 |
| 可访问性 | 新画板和聊天气泡三种宽度的 axe 自动检测通过；可见焦点、键盘窗口操作与编辑输入保护。 |
| 既有能力 | 第 12—16 章两种模式控制、旧书签/批注/备份、三门故事/真实 Python 批量模拟/四题 H5P 评分及恢复通过。 |

生产预览回归命令（PowerShell）：

```powershell
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE='C:/Program Files/Google/Chrome/Application/chrome.exe'
$env:PLEX_TEST_PORT='5194'
$env:PLEX_TEST_PREVIEW='1'
$env:PLEX_TEST_REUSE='0'
$env:PLAYWRIGHT_JSON_OUTPUT_FILE='output/creative-tools-regression.json'
npx playwright test tests/browser/creative-tools.spec.ts tests/browser/creative-data.spec.ts tests/browser/input-controls.spec.ts tests/browser/learning-data.spec.ts tests/browser/monty.spec.ts tests/browser/lesson-v04.spec.ts --reporter=line,json
```

## 待人工验收与范围说明

- 当前 USB 翻页笔真实按键、系统/浏览器保留键的设备差异。
- 实际麦克风、环境噪声与用户说话方式；听写默认使用系统麦克风。
- 当前 PLEX 学生账号登录后的真实模型回复。已核对现行 `/api/v1/student/messenger/chat` 源码契约，尚未发送真实在线聊天。
- 屏幕阅读器人工验收、触笔压感、触屏真机。画笔粗细目前手动调节，不提供压感。
- 本轮未重新逐个执行全部 73 个旧 Python 示例，未生成新发布版本/ZIP，也未公开部署；原始代码资源未改动。
- 小艺是生成的正面 PNG 加轻量 CSS 动作，不是骨骼或口型动画；画板是基本绘画工具，详细边界见操作说明。

本机验收服务保持在 `http://127.0.0.1:5190`。旧教材宣传 PDF 的两个本地删除状态属于本轮开始前已有改动，本轮未修改、恢复或纳入工具升级。
