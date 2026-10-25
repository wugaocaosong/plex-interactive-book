# PLEX 接入与增量题库导入

本教材独立运行。在线能力连接已有 PLEX 主工程，离线阅读、故事、Python、本机判题、自测与板书不依赖 PLEX。当前适配提交为 `536ac132f35dfff88f97bc85f1515a77d405b153`；逐文件来源校验与接口清单见 `integration/plex-manifest.json`。

## 服务地址

开发、构建预览和 ZIP 自带 Node 预览服务默认将 `/api` 代理至 `http://127.0.0.1:5100`。如后端位于其他端口，在启动进程前设置固定 origin：

```powershell
$env:PLEX_API_TARGET = 'http://127.0.0.1:5100'
npm run dev
# 完整 ZIP 无需 npm 安装：
node scripts/serve-dist.mjs
```

```sh
PLEX_API_TARGET=http://127.0.0.1:5100 npm run dev
# 或
PLEX_API_TARGET=http://127.0.0.1:5100 node scripts/serve-dist.mjs
```

设置为 `off` 可关闭在线代理。不要把模型 API 密钥放入教材前端；模型凭据由 PLEX 后端管理。生产托管需要配置自己的 `/api` 反向代理。本项目不会自动公开部署。

## 注册三道题

在已经初始化的当前 PLEX 后端 Python 环境中执行，`--plex-root` 指向含 `backend/` 的工程根目录：

```sh
python integration/import_monty.py --plex-root /path/to/zhongruan
python integration/import_monty.py --plex-root /path/to/zhongruan --apply
```

第一条为回滚预览，第二条才写入。只新增／更新归属 `plex_ebook` 且来源引用一致的三道题，不迁移数据库、不触发开发账号初始化、不覆盖其他题目。重复执行无内容变更时不更新题目版本。知识节点必须已存在；编号被其他来源占用会停止。

| 稳定引用 | 本机练习 | PLEX 知识节点 | 用例 |
|---|---|---|---:|
| MH030001 | monty-frequency：获奖与频率 | lang-var | 4 |
| MH030002 | monty-host：主持人开门条件 | branch-nested | 9 |
| MH030003 | monty-strategy：换门与计数 | loop-for | 5 |

引用长度遵循现有 MySQL `problem_no` 的 8 字符限制。`bank-<id>` 由安装环境决定，不应硬编码。题目版本由服务端生成，前端不能指定成绩、题目身份或可信版本。

在线判题仍需要 PLEX 自身已配置的隔离执行环境（Docker 沙箱或 Judge0）；本教材不提供宿主 Python 执行回退，也不在 ZIP 中嵌入 PLEX 数据库、学生数据、模型凭据或 Docker 镜像。安装 PLEX 的后端依赖和执行服务应遵循对应主工程说明。

## 实际调用

`/api/v1/auth/login`、`/refresh`、`/logout` 使用现有学生账号；独立 sessionStorage 保存会话。画像读取 `/student/profile`。本机自评是可跳过的自我报告，不写成服务端能力结论。

`/student/tutor/context` 核对任务与版本；`/student/practice-submissions/<ref>` 使用 UUID 保持重复提交幂等。报错解释绑定 `/code/submit` 产生的服务器自测运行编号，并可带正式作答编号；自测与正式判题明确区分。

`/student/tutor/ask` 支持四种辅导模式，`/student/tutor/turns/<id>` 恢复，`/<id>/cancel` 取消。409 提示重新核对版本，429 保留限额原因，401 尝试刷新一次，失败清除令牌与画像／对话视图并提示重新登录。离线失败保留学习数据。

## 独立联调

验证脚本在系统临时目录创建独立 SQLite，绝不调用开发环境数据库重置。默认契约检查使用模拟执行；真实调用需明确开关：

```sh
python integration/verify_plex.py --plex-root /path/to/zhongruan
python integration/verify_plex.py --plex-root /path/to/zhongruan --real-execution --real-model
```

`--real-execution` 使用已安装的 `plex-python-sandbox:1` Docker 镜像，脚本不下载镜像；`--real-model` 使用主工程现有服务端模型配置，仅发送脚本中的合成题目与代码。报告分别写入 `output/plex-contract-integration.json`、`output/plex-real-integration.json`，不输出令牌。

浏览器真实 HTTP 验证：

1. 运行上述命令并加 `--serve`，启动临时 5103 后端；测试凭据只写入被 Git 忽略的 `output/plex-test-session.json`。
2. 构建教材，以 `PLEX_API_TARGET=http://127.0.0.1:5103 node scripts/serve-dist.mjs --port 5193` 启动教材。
3. 执行 `node integration/browser-real.mjs`（可通过 `PLAYWRIGHT_CHROMIUM_EXECUTABLE` 指定 Chromium），结果写入 `output/plex-browser-real.json`。
4. 停止临时服务。测试数据库、凭据与浏览器数据不打入 ZIP。
