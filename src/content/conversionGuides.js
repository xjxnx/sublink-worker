export const CONVERSION_GUIDES = [
    {
        path: '/guides/clash-to-singbox',
        title: 'Clash 订阅转 Sing-Box：在线转换与导入教程',
        description: '将 Clash 订阅链接或 YAML 配置转换为 Sing-Box JSON。查看在线转换步骤、客户端导入方法、版本选择，以及节点和分流规则的兼容限制。',
        summary: '将 Clash 订阅链接或 YAML 配置转换为 Sing-Box JSON，了解导入步骤和兼容限制。',
        intro: 'Clash 订阅可以转换为 Sing-Box 配置。把订阅地址或 Clash YAML 内容粘贴到在线订阅转换工具，点击“转换”，再复制 Sing-Box 订阅链接。工具会读取支持的代理节点并生成目标配置；两种客户端的规则和专用字段需要分别检查。',
        steps: [
            { title: '准备 Clash 订阅链接或 YAML', text: '使用可访问的 HTTP/HTTPS 订阅地址，或复制完整的 Clash YAML 配置。配置中的 proxies 应包含有效节点。直接粘贴配置时，一次输入一份完整文档。' },
            { title: '粘贴到首页并选择分流规则', text: '在首页“输入源”中粘贴订阅或配置。需要调整分流时，展开“高级选项”选择预设规则或添加自定义规则。首次转换可保留默认设置。' },
            { title: '生成并复制 Sing-Box 链接', text: '点击“转换”，在结果中复制 Sing-Box 订阅链接。需要查看 JSON 内容时，可打开生成的链接。确认节点、代理组和规则符合你的使用需求。' },
            { title: '导入支持 Sing-Box 配置的客户端', text: '在客户端的远程配置或订阅管理中添加生成的链接，并更新配置。不同客户端的入口名称不同；只有客户端支持远程配置管理时才能直接添加链接，否则需下载 JSON 后按客户端说明导入。' }
        ],
        example: {
            title: '示例：一份可用于转换的 Clash YAML',
            text: '下面的节点使用虚构域名和密码，仅演示输入格式。完整配置可包含更多节点；转换后在 Sing-Box 的 outbounds 中检查对应节点。',
            code: 'proxies:\n  - name: Demo\n    type: ss\n    server: node.example.com\n    port: 8388\n    cipher: aes-128-gcm\n    password: demo-password'
        },
        sections: [
            { title: 'Clash 转 Sing-Box 会保留哪些内容？', text: '工具解析能够识别的节点协议、服务器、端口和凭据，再构建 Sing-Box 配置。分组和分流由目标配置构建流程处理。Clash 的 proxy-providers、脚本和客户端专用设置不能假定会逐项迁移，转换后应检查生成的 JSON。' },
            { title: 'Sing-Box 版本不匹配怎么办？', text: 'Sing-Box 不同核心版本的配置字段存在差异。转换接口支持 singbox_version 参数，例如在生成的 /singbox 链接中添加 &singbox_version=1.11 使用旧版配置模板，或添加 &singbox_version=1.12 使用新版模板。以客户端实际使用的核心版本和官方文档为准。' },
            { title: '转换后的订阅会自动跟随源订阅更新吗？', text: '输入为订阅地址时，客户端再次请求生成的订阅会重新获取上游内容。如果输入的是粘贴的 YAML，保存的是当时的内容；上游变化后需要重新粘贴并生成链接。客户端何时刷新由它的订阅更新设置决定。' },
            { title: '转换成功，但节点无法连接怎么办？', text: '先检查原订阅是否有效、节点凭据是否正确，再检查客户端的协议和传输方式支持。配置转换不会测试节点连通性，也不能增加客户端本身不具备的协议支持。' }
        ],
        references: [
            { title: 'Sing-Box 配置文档', url: 'https://sing-box.sagernet.org/configuration/' },
            { title: 'Mihomo 代理配置文档', url: 'https://wiki.metacubex.one/config/proxies/' }
        ]
    },
    {
        path: '/guides/merge-subscriptions',
        title: '合并多个订阅链接：Clash、Sing-Box 在线订阅转换教程',
        description: '多个订阅怎么合并？每行输入一个订阅地址或节点链接，在线生成 Clash、Sing-Box、Surge 或 Xray/V2Ray 订阅。了解更新方式和失效来源的排查方法。',
        summary: '每行输入一个订阅地址，合并多个来源并生成对应客户端的订阅链接。',
        intro: '合并多个订阅时，在首页每行粘贴一个 HTTP/HTTPS 订阅地址或节点分享链接，点击“转换”，再复制所需客户端的输出链接。工具会处理多个来源，并生成 Clash、Sing-Box、Surge 或 Xray/V2Ray 订阅。',
        steps: [
            { title: '准备有效的订阅来源', text: '确认每个订阅地址能正常访问，并且尚未过期。也可以使用 Shadowsocks、VMess、VLESS、Trojan、Hysteria2、TUIC 或 AnyTLS 节点分享链接；目标客户端需要支持对应协议。' },
            { title: '每行粘贴一个链接', text: '把多个订阅地址放进同一个“输入源”，使用换行分隔。节点分享链接也可以按行加入。合并链接时不要把多份完整 YAML 或 JSON 文档直接拼接在一起。' },
            { title: '选择规则并生成输出', text: '按需要在“高级选项”选择分流规则，再点击“转换”。复制 Clash、Sing-Box、Surge 或 Xray/V2Ray 结果中的对应链接，避免把一种客户端的配置导入另一种客户端。' },
            { title: '导入客户端并检查节点', text: '在客户端添加生成的订阅或远程配置，执行更新，并核对各来源的节点是否存在。如果某个来源没有出现在结果中，把该来源单独转换以排查问题。' }
        ],
        example: {
            title: '示例：输入两个订阅地址',
            text: '下面使用保留的示例域名演示换行格式，地址不提供真实节点。实际使用时替换为你自己的有效订阅地址。',
            code: 'https://subscription-a.example.com/subscription\nhttps://subscription-b.example.com/subscription'
        },
        sections: [
            { title: '合并后的订阅如何更新？', text: '使用订阅地址作为来源时，客户端请求生成的链接会重新获取上游内容；部分兼容格式可能作为远程 provider 交由客户端刷新。实际更新时间还取决于客户端的订阅或 provider 更新设置。直接粘贴的节点和配置不会自动获得上游变更。' },
            { title: '某个订阅失效会影响合并结果吗？', text: '某些远程来源获取或解析失败后，结果可能只包含其它有效来源。转换得到链接并不代表所有输入都成功导入。请对照来源核查节点，并逐个转换定位过期地址、获取失败或格式不兼容的问题。' },
            { title: '合并后会自动删除重复节点吗？', text: '不要把合并理解为保证按服务器、端口和凭据自动去重。同一个节点出现在多个来源中时，转换后应检查是否有重复条目。需要避免重复时，先整理输入来源或在客户端中处理。' },
            { title: 'Clash、Sing-Box 和 Xray/V2Ray 输出有什么区别？', text: 'Clash 输出 YAML，Sing-Box 输出 JSON，Surge 输出 INI 风格配置。Xray/V2Ray 输出 Base64 编码的节点分享链接列表，适合 v2rayN 等客户端订阅导入；该输出不是完整的 Xray JSON 配置。' },
            { title: '订阅链接可以公开分享吗？', text: '源订阅和生成的链接可能包含或关联访问凭据。短链接便于复制，但不等于加密或访问授权。请使用你信任的转换站点，并仅向你授权的使用者分享链接。' }
        ],
        references: [
            { title: 'Mihomo proxy-providers 文档', url: 'https://wiki.metacubex.one/config/proxy-providers/' },
            { title: 'Sing-Box 配置文档', url: 'https://sing-box.sagernet.org/configuration/' }
        ]
    }
];
