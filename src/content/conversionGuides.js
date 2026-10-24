export const CONVERSION_GUIDES = [
    {
        path: '/guides/chain-proxy',
        previousPaths: ['/guides/clash-to-singbox'],
        updatedAt: '2026-10-24',
        title: '链式代理使用教程：用机场节点连接 SOCKS5 / HTTP 落地节点',
        description: '使用本站配置链式代理：输入机场订阅，开启链式代理，添加 SOCKS5 / HTTP 落地节点，生成 Clash / Stash 订阅。附界面示例、前置代理选择、出口 IP 验证和常见问题排查。',
        summary: '机场订阅作前置，SOCKS5 / HTTP 节点作落地，按图生成 Clash / Stash 链式代理配置。',
        intro: '有一个使用原生家庭住宅 IP 的 SOCKS5 / HTTP 节点，想用作上网出口，却需要先经过机场节点才能连接？在本站，上方“输入源”填写机场订阅或节点，下方“链式代理 SOCKS5 / HTTP 节点”填写落地节点，即可生成 Clash / Stash 链式代理配置。导入客户端后，再分别选好前置节点和落地节点。',
        overview: {
            title: '先看懂连接顺序：机场负责中转，落地负责出口',
            text: '前置节点是第一跳，用来连接落地服务器；落地节点是最后一跳，目标网站通常看到的是它的出口 IP。这适合已有可用机场线路、又想使用指定落地出口的场景。只有被规则分配到落地节点的流量才会走这条链路，直连规则仍然直连。',
            flow: '你的设备 → 前置节点（机场） → 落地节点（SOCKS5 / HTTP） → 目标网站'
        },
        steps: [
            { title: '在“输入源”填写机场订阅或前置节点', text: '打开本站首页，在上方大输入框粘贴可用的机场订阅地址，也可以每行填写一个 SS、VMess、VLESS、Trojan 等受支持的节点分享链接。先确认这些节点能在客户端正常使用。这里填写的是前置来源，不是 SOCKS5 / HTTP 落地节点。' },
            { title: '在“高级选项”开启链式代理', text: '点击“高级选项”，在通用设置中打开“链式代理（仅 Clash Meta / Stash）”。如果站点为通用设置启用了密码保护，需要先解锁。开启后，上方输入源区域会出现单独的“链式代理 SOCKS5 / HTTP 节点”输入框。' },
            { title: '在新增输入框填写落地节点', text: '把落地服务商提供的 socks://、socks5:// 或 http:// 节点链接粘贴到下方输入框，每行一个；HTTPS 代理也可使用 https:// 链接。节点可以包含明文或 Base64 编码的用户名和密码。这里只填写节点分享链接，不填写订阅地址；多个落地节点是供选择的不同出口，不会按行串成多跳。' },
            { title: '点击“转换”，导入 Clash / Stash 订阅', text: '按需要选择分流规则，再点击“转换”。复制结果中的 Clash / Stash 链接，在使用 Mihomo（Clash Meta）内核的客户端或 Stash 中添加为远程订阅，更新并启用配置。Stash 用户应让 Stash 自行拉取该链接，本站会根据客户端请求适配配置。Sing-Box、Surge 和 Xray/V2Ray 输出不应用此链式代理设置。' },
            { title: '在客户端分别选择前置和落地', text: '先在“🗺️ 前置代理”策略组里选一个可用的机场节点，再在“🚀 节点选择”或目标网站命中的业务策略组里，选下方输入框添加的落地节点。例如落地链接以 #SOCKS5-Exit 结尾，就选择 SOCKS5-Exit。仅选择前置节点不会启用落地出口；请确认业务策略最终指向落地节点。' },
            { title: '检查目标流量的出口 IP', text: '让 IP 查询网站的流量也走选定的落地节点，然后查看出口是否为落地服务商提供的 IP；使用动态出口时，以服务商实际分配结果为准。同时查看客户端连接记录，确认目标请求命中了预期策略。转换生成链接只表示参数已准备好，不代表链路已连通。' }
        ],
        image: {
            src: '/images/guides/chain-proxy-input.png',
            width: 1599,
            height: 834,
            alt: '本站链式代理填写示例：上方输入 SS 前置节点，下方输入 SOCKS5 落地节点，底部为转换与高级选项按钮',
            caption: '填写位置如图：上方是前置节点，下方是落地节点。截图中的服务器地址和凭据已替换为示例；需先在“高级选项”开启链式代理，下方输入框才会显示。点击图片可查看大图。'
        },
        example: {
            title: '填写示例：一份前置订阅，两个可选落地出口',
            text: '下面分为两个输入框，说明文字不要粘贴进去。example.com 域名、192.0.2.10 地址和账号密码均为演示值，需替换为自己的有效信息。# 后的名称用于在客户端识别落地节点；只用一个出口时填写一行即可。',
            code: '【上方：输入源】\nhttps://subscription.example.com/your-subscription\n\n【下方：链式代理 SOCKS5 / HTTP 节点】\nsocks5://demo-user:demo-pass@192.0.2.10:1080#SOCKS5-Exit\nhttp://demo-user:demo-pass@exit.example.com:8080#HTTP-Exit'
        },
        sections: [
            { title: '为什么要把前置和落地分开填写？', text: '本站会给下方输入的落地节点设置 dialer-proxy，指向“🗺️ 前置代理”策略组。上方来源中的普通节点仍保留原有用途。若把落地节点只放进上方来源，不能假定它会自动经过前置组；需要链式连接的 SOCKS5 / HTTP 节点应填在专用输入框里。' },
            { title: '“🗺️ 前置代理”里没有可选节点怎么办？', text: '本站会从前置候选中排除 SOCKS5 / HTTP 类型以及名称以“直连”开头的节点，避免落地节点被选为自己的前置。请在上方提供有效的 SS、VLESS、Trojan 等其它受支持的节点，并更新订阅。如果使用的是自定义分组配置，还要确认业务策略组中可以选到落地节点。' },
            { title: '能连接机场，但落地节点超时怎么办？', text: '先单独验证机场节点，再核对落地服务器地址、端口、账号、密码与服务状态。随后更换“🗺️ 前置代理”中的节点，确认该线路能够访问落地端口。若落地服务使用 IP 白名单，应按服务商要求放行前置节点的实际出口 IP。UDP 是否可用还取决于整条链路和客户端支持，不能只凭网页能打开来判断。' },
            { title: '出口 IP 没变化，或仍显示机场 IP？', text: '检查目标网站命中的业务策略是否选中了落地节点，而不是机场节点或自动选择组。测试时也要让 IP 查询网站走同一落地策略；如果它命中直连规则，看到的是本地出口。修改选择后重新建立连接，并在客户端连接记录中核对实际命中的规则和策略。' },
            { title: '账号密码里有特殊字符怎么填？', text: '明文链接中的用户名、密码若含 @、#、/ 等保留字符，应先做 URL 编码，例如 @ 写成 %40、# 写成 %23。也可以将 user:password 整段做 Base64 编码，写成 socks://dXNlcjpwYXNzd29yZA==@192.0.2.10:1080#SOCKS5-Exit。Base64 只是编码，不会保护密码。' },
            { title: '更新订阅或更换落地账号后要做什么？', text: '上方填写订阅地址时，更新生成的配置会重新获取上游，或由客户端刷新远程节点源；直接粘贴的节点不会自动变化。落地地址、账号或密码改变后，需要回到本站修改下方输入框，重新转换并替换客户端订阅链接。生成的链接和二维码可能包含访问凭据，请仅分享给获授权的使用者。' }
        ],
        references: [
            { title: 'Mihomo dialer-proxy 文档：通过订阅节点连接落地', url: 'https://wiki.metacubex.one/config/proxies/dialer-proxy/' }
        ]
    },
    {
        path: '/guides/merge-subscriptions',
        updatedAt: '2026-10-06',
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
