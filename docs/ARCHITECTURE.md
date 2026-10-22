# 架构与维护

## 数据管线

`download-source.py` 按固定 SHA 保存原始字节 → `import_book.py` 解析上游 MkDocs 导航和 Markdown → 清单、各节 JSON、搜索块索引、Python 文件映射及 VitePress 路由 → `audit_content.py` 检查来源哈希、118 页覆盖、内部路由和锚点、代码和图解资源。

代码引用按文件、类、函数解析，处理各语言命名差异。Python 用 AST，Ruby 按声明缩进边界，其余语言屏蔽注释/字符串后平衡括号，并限定所属类或 Go receiver。C / Go / Rust 中跨类型与方法的整类展示明确标为 `file-implementation`，不是未解析回退。找不到请求符号直接中止导入。

原创附页与练习独立保存，导入器不写入它们。`npm run assets` 校验固定 H5P 文件哈希并准备本地播放器、Python runtime、封面和许可。直接依赖与传递依赖由锁文件固定。

## 阅读界面

- `BookManifest` 固定顺序、稳定小节 ID、路由、来源和活动关联。
- `ReadingLocator` 为 `sectionId + blockId + offset`；URL 使用 `/read/<id>#<block>@<offset>`。搜索、书签、继续阅读和窗口重排共享定位模型。
- 获取当前小节并预取相邻小节，字体与图像就绪后测量。仅将当前小节书页交给 StPageFlip，不向首屏装入整本书。
- `pagination.ts` 保持文字顺序，拆分段落与列表、保留行内标记，将标题带到后续内容所在页。图像与图注为一个块；无法容纳的原子块有完整阅读入口。
- StPageFlip 管理纯 HTML 节点，页内控件通过事件委托。代码、图像、展开阅读与 H5P 位于独立弹层，避免翻页库克隆有状态组件。
- ≥1024 px 双页，其余单页。重排从内容锚点恢复，页码仅表示当前视口。页边按钮与键盘翻页，文字选择和代码操作不会触发拖拽翻页。

## Python 与 H5P

Python 模块 Worker 延迟加载站内 Pyodide，挂载原作所有 Python 文件，添加全局及当前文件目录到 `sys.path`，每次执行设置真实 `__file__` 和 `__name__='__main__'`。超时或用户停止会终止 Worker，下一次运行重建。输出限制 50,000 字符。

H5P 外层 Vue iframe 加载 `h5p-player.html`；Standalone 创建内层 iframe，实际实例和 xAPI dispatcher 在内层。宿主在初始化后监听得分并定时保存 `getCurrentState()`。初始化时以 `contentUserData[0].state` 传回状态，并设置非零 `saveFreq` 满足 H5P core 恢复条件；没有用户和服务端地址，不调用成绩服务器。关闭面板前同步保存。

`ActivityRecord` 保存内容 ID、版本、状态、得分、满分和完成标志。内容版本变化时应更换本地 key，避免新题与旧答案不匹配。官方 MultiChoice 保存答案，不保留反馈面板展开状态；恢复后可重新「检查答案」。

## 验证与边界

`npm run check` 验证类型、来源与导入；`npm run test:e2e` 在 Chromium 下验证核心流程、73 个独立 Python 示例，以及全部 127 个非封面/非特殊目录小节在三种尺寸下的文字守恒、图片、公式、标题与高度。封面与目录单独验证。

会话缓存与 localStorage 均在本机，没有账号、成绩服务、编辑后台或公开部署。依赖现代浏览器的 WebAssembly、模块 Worker、字体和 DOM 测量能力；未声称完成所有浏览器兼容性认证。
