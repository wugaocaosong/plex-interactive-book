# PLEX 编辑器代码上下文

`POST /api/v1/student/messenger/chat` 保持 JWT 学生权限与原消息、历史字段，增加可选 `code_context`：

```json
{
  "message": "帮我解释边界条件",
  "history": [],
  "code_context": {
    "file": "example.py",
    "reference": "ch12-search",
    "language": "python",
    "code": "def solve(...): ...",
    "selection": "",
    "version": "code-abc123",
    "output": "",
    "diagnostics": ""
  }
}
```

`code` 必须非空，最多20,000字符；超限返回400，不自动截断。`version` 必填且最多128字符；文件512、语言40、引用128、选区20,000、输出和诊断各10,000字符。代码材料以独立的用户 JSON 分析材料送入各模型供应商，不进入系统身份、成绩或运行证据，不执行。

成功回复附 `code_context_version` 和 `code_context_used`。后者仅在返回了该快照对应的有效模型分析时为 true；规则／检索兜底为 false，表示没有得到可用的代码分析，不保证之前未尝试模型调用。旧客户端不发送此字段时响应不增加上下文确认字段。旧后端不返回确认时，客户端提示尚未确认完整代码答疑。

三条供应商链路分别保留完整代码：OpenAI 兼容接口独立 user 消息、讯飞星火 user 材料、星辰 agent user 材料。普通问题原有处理不变。客户端取消会忽略迟到结果；当前同步后端请求可能继续完成，不宣称取消能够撤回已经发送到供应商的材料。

后端分支 `codex/ebook-code-context`；增量文件为 `code_context.py`、`messenger_chat.py` 和学生 messenger 路由，无数据库迁移。测试 `backend/tests/test_ebook_code_context.py` 使用模拟供应商，确认超过500字符后的尾部仍在请求中，并覆盖超限、缺少版本、规则兜底和旧调用兼容。
