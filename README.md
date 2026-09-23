<div align="center">
  <a href="https://dy.524028.xyz/">
    <img src="public/favicon.svg" alt="clash订阅转换 Logo" width="120" height="120"/>
  </a>

  <h1>clash订阅转换</h1>
  <p><b>合并订阅与节点链接，在线生成客户端订阅</b></p>

  <p>聚合订阅链接与节点，生成 Clash、Sing-Box、Xray/V2Ray、Surge 配置。<br>支持 Cloudflare Workers、Vercel、Node.js 和 Docker 部署。</p>

  <p>
    <a href="https://dy.524028.xyz/"><b>在线使用</b></a> ·
    <a href="https://github.com/xjxnx/sublink-worker">GitHub 仓库</a> ·
    <a href="https://github.com/xjxnx/sublink-worker/issues">问题反馈</a>
  </p>

  <a href="https://deploy.workers.cloudflare.com/?url=https://github.com/xjxnx/sublink-worker">
    <img src="https://deploy.workers.cloudflare.com/button" alt="部署到 Cloudflare Workers" height="32"/>
  </a>
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/xjxnx/sublink-worker&amp;env=KV_REST_API_URL,KV_REST_API_TOKEN&amp;envDescription=Vercel%20KV%20credentials%20for%20data%20storage&amp;envLink=https://vercel.com/docs/storage/vercel-kv">
    <img src="https://vercel.com/button" alt="部署到 Vercel" height="32"/>
  </a>
</div>

## 功能

- **订阅聚合**：导入多个订阅链接或节点，统一生成客户端配置。
- **协议支持**：Shadowsocks、VMess、VLESS、Hysteria2、Trojan、TUIC、AnyTLS；具体可用性取决于目标客户端。
- **输入格式**：节点链接、Base64 订阅、HTTP/HTTPS 订阅，以及 Sing-Box JSON、Clash YAML、Surge INI 完整配置。
- **输出格式**：Clash、Sing-Box、Xray/V2Ray、Surge。
- **分流配置**：预设规则集、自定义策略组和国家分组。
- **订阅分享**：基于 KV 存储生成固定或随机短链接。
- **界面体验**：浅色 / 深色主题，支持中文、英文、波斯语和俄语。
- **多平台运行**：同一份代码可运行在 Cloudflare Workers、Vercel、Node.js 和 Docker 上。

## 本地运行

安装项目依赖（仓库使用 pnpm 10.11.1）：

```sh
git clone https://github.com/xjxnx/sublink-worker.git
cd sublink-worker
pnpm install
```

启动 Node.js 本地服务：

```sh
npm run dev:node
```

默认访问 [http://localhost:8787](http://localhost:8787)，可通过 `PORT` 环境变量修改端口。未配置 Redis 或 Upstash 时使用内存存储，重启后数据会清空。

使用 Cloudflare Workers 本地环境：

```sh
npm run dev
```

## 部署

- **Cloudflare Workers**：点击顶部部署按钮，或在本地完成 Cloudflare 授权后运行 `npm run deploy`。
- **Vercel**：点击顶部部署按钮，或运行 `vercel deploy`，并配置 `KV_REST_API_URL` 和 `KV_REST_API_TOKEN`。
- **Node.js**：运行 `npm run build:node`，然后执行 `node dist/node-server.cjs`；生产环境建议配置 Redis 或 Upstash 保存数据。
- **Docker Compose**：运行 `docker compose up -d`，会同时启动服务与 Redis。仓库现有 Compose 默认使用上游镜像 `ghcr.io/7sageer/sublink-worker:latest`，不包含本仓库的界面定制；使用本仓库版本时，需将 `SUBLINK_WORKER_IMAGE` 指向从本仓库构建的镜像。

## 搜索引擎与公开网址

中文首页固定使用 `/`，英文、波斯文和俄文分别使用 `/?lang=en-US`、`/?lang=fa` 和 `/?lang=ru`。旧的 `/?lang=zh-CN` 会永久跳转到 `/`，语言别名会跳转到对应的规范网址。首页语言只由网址决定，不随浏览器语言变化；订阅接口仍支持原有语言参数与请求头。

Cloudflare Workers 和 Vercel 默认将首页、`/robots.txt`、`/sitemap.xml` 的 HTTP 请求以 `308` 跳转到 HTTPS。localhost 和回环地址保留 HTTP，便于本地开发。Node.js / Docker 在反向代理提供 HTTPS 后设置 `FORCE_HTTPS=true` 启用相同行为，并让反向代理正确传递 `X-Forwarded-Proto`。需要通过局域网 HTTP 调试云端入口时，可设置 `FORCE_HTTPS=false`。

这项跳转只处理公开页面；订阅和管理接口的既有地址、签名不会被改写。静态资源的全站 HTTPS 跳转可由 Cloudflare 或反向代理统一配置。

部署后，在 Google Search Console 提交 `https://你的域名/sitemap.xml`。地图包含中文首页与三个语言版本，网址与页面 canonical、hreflang、导航链接一致。如果仍显示“无法抓取”，检查具体抓取错误和 Cloudflare 安全事件；本地或普通浏览器访问成功不等于 Google 抓取成功。站点地图可帮助发现页面，不保证收录或排名。

## 通用设置密码保护

设置环境变量 `GENERAL_SETTINGS_PASSWORD` 后，用户需要输入密码才能调整通用设置中的国家分组、自动选择分组、无效节点过滤、Clash API 和多端口监听。未解锁时仍可按默认设置转换。未配置该变量时保持原有开放行为。

- **Cloudflare Workers**：在控制台的变量与机密中添加同名 Secret，或运行 `npx wrangler secret put GENERAL_SETTINGS_PASSWORD`；本地开发可放在不提交的 `.dev.vars` 中。
- **Node.js / Vercel**：设置同名环境变量后重启服务或重新部署。
- **Docker Compose**：在本地 `.env` 中设置该变量，并使用从本仓库构建的镜像。

建议使用至少 16 位随机密码，并通过 HTTPS 访问。密码仅提交给解锁接口，不写入订阅链接或浏览器本地存储；解锁会话有效期为 12 小时。转换接口也会校验授权，直接添加通用设置参数无法绕过。

已授权的订阅和短链接可供客户端持续更新；授权绑定订阅源和参数，修改后需重新解锁生成。持有链接的人可以使用该订阅，但不能用它解锁设置。重新锁定只结束当前浏览器会话，不撤销已生成链接；更换密码会撤销已有会话和链接授权。启用保护后，含非默认通用设置的旧链接需要重新生成。基础配置和导入的完整配置不在此密码保护范围内。

## 参考文档与致谢

本项目基于 [7Sageer/sublink-worker](https://github.com/7Sageer/sublink-worker) 定制，感谢原作者与社区贡献者。当前站点以「clash订阅转换」为名称，使用与前端一致的蓝色盾牌 S 标志。

以下为上游 Sublink Worker 的参考文档，定制部分以本仓库实现为准：

- [中文文档](https://sublink.works/) · [English Documentation](https://sublink.works/en/)
- [快速开始](https://sublink.works/guide/quick-start/) · [API 参考](https://sublink.works/api/) · [常见问题](https://sublink.works/guide/faq/)

欢迎通过 [Issues](https://github.com/xjxnx/sublink-worker/issues) 和 [Pull Requests](https://github.com/xjxnx/sublink-worker/pulls) 反馈问题、参与改进。

## 许可证

本项目采用 [MIT License](LICENSE)，保留上游版权声明。

## 免责声明

本项目仅供学习与交流，请遵守所在地法律法规。使用本项目产生的后果由使用者自行承担。
