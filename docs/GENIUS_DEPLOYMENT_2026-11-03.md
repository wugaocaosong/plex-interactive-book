# Genius 星轨编程 · 阿里云部署

日期：2026-11-03。用户授权新建 genius.wuyeni.cn 访问入口。本轮只部署电子书静态站点，不改 PLEX / LINK 后端，也不发布其他五个产品的工作区改动。

## 线上配置

- URL：https://genius.wuyeni.cn/
- 阿里云主机：47.102.108.137（沿用 wuyeni.cn 系列站点所在主机）。
- DNS：genius 的 A 记录指向上述地址；未修改其他域名记录。
- 静态根目录：/www/wwwroot/genius.wuyeni.cn
- Nginx：/www/server/panel/vhost/nginx/genius.wuyeni.cn.conf
- 发布档案：/www/server/genius-releases
- HTTPS：Let's Encrypt，HTTP 自动跳转 HTTPS；证书有效期至 2027-02-01。
- 已启动原本 enabled 但 inactive 的 certbot-renew.timer；genius 专项续期 dry-run 成功。沿用现有 Nginx reload deploy hook。
- 独立小节地址通过 try_files 支持无 .html 路径；mjs 和 WASM 使用正确 MIME。

## 发布文件

构建文件 2603 个，约 166.6 MB，包含字体、教材、Python、H5P 及离线输入模型。

最终归档：output/genius-site-20261103-final.tar.gz
SHA-256：7fdcf8c454bd750d8a37b4f9dc599f7bcd4ef7abd1728b46b11e9f45ac657962

部署使用 deploy/publish-genius.py，先验证 SHA-256、拒绝路径越界和符号链接，再保存解包版本。更新每个文件先写 .next 再替换，HTML 入口最后更新。首个线上版本及最终版本的归档均保留。

再次部署：
1. npm ci；npm run build。
2. 将 web/.vitepress/dist 打包为 tar.gz，计算 SHA-256，上传到上述发布档案目录。
3. 在服务器执行 python3 publish-genius.py <归档绝对路径> <SHA-256>。
4. 核验 HTTPS 首页、章节、静态资源和“更多 → 谱联产品”。
5. Nginx 配置有变时先 nginx -t，再 reload。

首次域名准备脚本为 deploy/genius-dns.py，使用外置私有凭据，不将凭据写进代码或产物。脚本只增补不存在的 genius 记录，发现不一致记录时停止。

## 运行边界

- 本轮采用基础网址跳转；新站 /api/ 明确返回 503，未擅自代理登录或聊天到另一服务器。在线小E与账号接口在这个新域名上未接通，本地阅读、图解、练习和运行资源可用。
- 浏览器学习数据按站点隔离。127.0.0.1 上的记录不会自动搬到新域名，已有用户可用电子书 JSON 备份／恢复迁移。
- 不携带账号、令牌或邀请码跳到其他产品。海绵伴链接是公开首页。
- 这是网站上线，不是新的 GitHub release 或 main 合并；所有源代码仍保留在原工作区。

## 验证记录

- HTTPS 首页、/read/chapter_divide_and_conquer/index、Python .mjs 与 .wasm：200，MIME 正确。
- 浏览器实际走通银河 → 实体书 → 开书 → 扉页 → 更多 → 谱联产品。
- 产品菜单显示五个外部地址，关闭可返回阅读。
- PLEX、LINK 给定正式地址 HTTP 检查均返回 200。
- 电子书生产构建、类型检查、118 页内容审计、27 题 / 130 参考用例通过。
- Nginx 配置检查通过；保留原服务器其他站点已有的 listen/http2 警告，未修改那些站点。
- 证书专项模拟续期成功，定时器已列出下一次运行时间。
- 未重复进行整套硬件、真实模型和 Android 验收。

截图：output/products/genius-products.png。
