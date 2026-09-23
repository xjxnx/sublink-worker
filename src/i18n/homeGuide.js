export const homeGuideTranslations = {
    'zh-CN': {
        toggleLabel: '使用说明',
        closeLabel: '收起说明',
        title: '把已有订阅转换成客户端需要的格式',
        intro: '将多个订阅地址、节点分享链接或完整配置放到同一个输入框，生成 Clash、Sing-Box、Surge 或 Xray/V2Ray 订阅链接。转换时可以选择分流规则，减少切换客户端时手动整理配置的工作。',
        stepsTitle: '订阅转换怎么用',
        steps: [
            { title: '粘贴订阅或配置', text: '订阅地址和节点链接可以每行一个，支持一次输入多个来源。导入完整配置时，直接粘贴一份 Clash YAML、Sing-Box JSON 或 Surge INI。' },
            { title: '选择需要的规则', text: '展开高级选项，选择预设规则集或添加自定义分流规则。首次使用可以保留默认设置；通用设置是否需要密码由站点管理员配置。' },
            { title: '转换并导入客户端', text: '点击“转换”，复制对应客户端的订阅链接，在客户端的订阅或远程配置中添加并更新。也可以生成短链接，方便复制和扫码。' }
        ],
        formatsTitle: '支持哪些输入和输出',
        inputTitle: '可导入的内容',
        inputText: 'HTTP/HTTPS 订阅、Base64 节点列表，以及 Clash YAML、Sing-Box JSON、Surge INI 配置。可解析 Shadowsocks、VMess、VLESS、Trojan、Hysteria2、TUIC 和 AnyTLS 节点链接。',
        outputTitle: '按客户端选择结果',
        outputs: [
            { name: 'Clash / Mihomo', text: '生成 YAML 配置，供支持 Clash 配置格式的客户端导入。' },
            { name: 'Sing-Box', text: '生成 JSON 配置；不同核心版本的字段有差异，请使用与客户端版本匹配的配置。' },
            { name: 'Surge', text: '生成包含代理与规则的 Surge 配置，协议支持以实际客户端版本为准。' },
            { name: 'Xray / V2Ray', text: '生成 Base64 编码的节点分享链接列表，供 v2rayN 等客户端作为订阅导入，不是完整的 Xray JSON 配置。' }
        ],
        compatibility: '转换会保留能映射到目标格式的节点信息。不同客户端支持的协议、传输方式和规则语法并不完全相同，转换不能让客户端支持它原本不支持的协议。',
        exampleTitle: '示例：把 Shadowsocks 链接转换成 Clash 节点',
        exampleIntro: '下面使用虚构域名和密码演示格式。把节点链接粘贴到输入框并转换后，Clash 输出中的 proxies 部分会包含这样的节点；实际完整配置还会带有代理组和规则。',
        exampleInput: '节点分享链接',
        exampleOutput: 'Clash 节点片段',
        exampleNote: '示例只用于理解格式，不能作为可用代理连接。',
        faqTitle: '常见问题',
        faqs: [
            { question: 'Clash 配置可以转换成 Sing-Box 吗？', answer: '可以。在输入框中粘贴 Clash YAML 内容或可访问的配置订阅地址，转换后选择 Sing-Box 链接。工具会解析支持的节点并构建目标配置，Clash 专用字段不一定能逐项转换。' },
            { question: '多个订阅能合并吗？', answer: '可以。把多个订阅地址或节点分享链接按行粘贴到输入框。每个来源都需要有效；如果转换失败，可以逐个输入，定位失效或格式不兼容的来源。' },
            { question: '订阅链接和配置内容有什么区别？', answer: '使用订阅地址作为输入时，客户端更新生成的订阅会重新获取上游内容。直接粘贴配置或节点时，保存的是当时的内容；上游变化后，需要重新粘贴并生成链接。' },
            { question: '为什么转换成功后仍然无法连接？', answer: '转换只处理配置格式，不验证节点能否联网。请检查原订阅是否过期、节点地址与凭据是否正确，以及目标客户端是否支持该协议和传输方式。' },
            { question: '这里会提供免费节点吗？', answer: '本工具只转换你已有的订阅和节点，不提供节点服务。订阅地址和生成的链接可能包含访问凭据，请只交给你信任的服务和使用者。' }
        ],
        backToTool: '返回输入框开始转换'
    },
    'en-US': {
        toggleLabel: 'User guide',
        closeLabel: 'Close guide',
        title: 'Convert existing subscriptions for your client',
        intro: 'Combine subscription URLs, node share links or an existing configuration and generate a subscription for Clash, Sing-Box, Surge or Xray/V2Ray. Choose routing rules during conversion to reduce manual setup when switching clients.',
        stepsTitle: 'How to convert a subscription',
        steps: [
            { title: 'Paste your sources', text: 'Enter one subscription URL or node link per line to combine sources. To import a full configuration, paste one Clash YAML, Sing-Box JSON or Surge INI document.' },
            { title: 'Choose routing rules', text: 'Open Advanced Options to select a rule preset or add custom rules. You can start with the defaults. The site administrator may require a password to change general settings.' },
            { title: 'Convert and import', text: 'Select Convert, copy the link for your client, then add and update it as a subscription or remote configuration. Short links are available for copying and QR codes.' }
        ],
        formatsTitle: 'Supported inputs and outputs',
        inputTitle: 'What you can import',
        inputText: 'HTTP/HTTPS subscriptions, Base64 node lists, Clash YAML, Sing-Box JSON and Surge INI configurations. Supported share links include Shadowsocks, VMess, VLESS, Trojan, Hysteria2, TUIC and AnyTLS.',
        outputTitle: 'Choose the output for your client',
        outputs: [
            { name: 'Clash / Mihomo', text: 'YAML configurations for clients that accept the Clash configuration format.' },
            { name: 'Sing-Box', text: 'JSON configurations. Fields differ between core versions, so use a configuration that matches your client version.' },
            { name: 'Surge', text: 'Surge configurations with proxies and routing rules. Protocol support depends on your client version.' },
            { name: 'Xray / V2Ray', text: 'A Base64-encoded list of node share links for subscription import in clients such as v2rayN, rather than a full Xray JSON configuration.' }
        ],
        compatibility: 'Conversion preserves node settings that can be represented in the target format. Clients differ in supported protocols, transports and rule syntax. Converting a configuration does not add protocol support to a client.',
        exampleTitle: 'Example: a Shadowsocks link as a Clash node',
        exampleIntro: 'This example uses a fictional hostname and password. Paste the link and convert it to see this node in the proxies section of the Clash output. The full generated configuration also includes proxy groups and rules.',
        exampleInput: 'Node share link',
        exampleOutput: 'Clash node excerpt',
        exampleNote: 'This example illustrates the format and is not a working proxy.',
        faqTitle: 'Frequently asked questions',
        faqs: [
            { question: 'Can I convert Clash to Sing-Box?', answer: 'Yes. Paste the Clash YAML or an accessible subscription URL, convert it and choose the Sing-Box link. The tool parses supported nodes and builds the target configuration. Clash-specific fields may not have a direct equivalent.' },
            { question: 'Can I merge subscriptions?', answer: 'Yes. Put each subscription URL or node share link on a separate line. Each source must be valid. If conversion fails, try sources individually to identify an expired URL or unsupported format.' },
            { question: 'Will the converted subscription update?', answer: 'When the input is a subscription URL, client updates fetch the upstream content again. Pasted configurations and nodes are snapshots. Paste the new content and generate a new link when that source changes.' },
            { question: 'Why can a converted node fail to connect?', answer: 'Conversion changes the configuration format and does not test connectivity. Check subscription expiry, the node address and credentials, and whether your client supports its protocol and transport.' },
            { question: 'Does this tool provide free nodes?', answer: 'It converts subscriptions and nodes you already have and does not supply a proxy service. Source and generated links can contain access credentials. Share them only with services and people you trust.' }
        ],
        backToTool: 'Return to the converter'
    },
    'fa': {
        toggleLabel: 'راهنمای استفاده',
        closeLabel: 'بستن راهنما',
        title: 'تبدیل اشتراک موجود برای کلاینت شما',
        intro: 'آدرس‌های اشتراک، لینک‌های نود یا یک پیکربندی موجود را وارد کنید و برای Clash، Sing-Box، Surge یا Xray/V2Ray لینک اشتراک بسازید. هنگام تبدیل می‌توانید قوانین مسیریابی را انتخاب کنید تا تنظیم دستی کلاینت کمتر شود.',
        stepsTitle: 'روش تبدیل اشتراک',
        steps: [
            { title: 'وارد کردن منابع', text: 'هر آدرس اشتراک یا لینک نود را در یک خط قرار دهید. برای وارد کردن پیکربندی کامل، محتوای یک فایل Clash YAML، Sing-Box JSON یا Surge INI را جای‌گذاری کنید.' },
            { title: 'انتخاب قوانین', text: 'در گزینه‌های پیشرفته یک مجموعه قانون انتخاب کنید یا قوانین سفارشی اضافه کنید. برای شروع، تنظیمات پیش‌فرض کافی است. تغییر تنظیمات عمومی ممکن است به رمز مدیر سایت نیاز داشته باشد.' },
            { title: 'تبدیل و وارد کردن در کلاینت', text: 'روی تبدیل کلیک کنید، لینک کلاینت خود را کپی کنید و آن را به‌عنوان اشتراک یا پیکربندی راه دور اضافه و به‌روزرسانی کنید. برای کپی یا کد QR می‌توانید لینک کوتاه بسازید.' }
        ],
        formatsTitle: 'فرمت‌های ورودی و خروجی',
        inputTitle: 'ورودی‌های قابل قبول',
        inputText: 'اشتراک HTTP/HTTPS، فهرست نود Base64 و پیکربندی‌های Clash YAML، Sing-Box JSON و Surge INI. لینک‌های Shadowsocks، VMess، VLESS، Trojan، Hysteria2، TUIC و AnyTLS قابل پردازش هستند.',
        outputTitle: 'خروجی مناسب کلاینت',
        outputs: [
            { name: 'Clash / Mihomo', text: 'پیکربندی YAML برای کلاینت‌هایی که فرمت Clash را می‌پذیرند.' },
            { name: 'Sing-Box', text: 'پیکربندی JSON. فیلدها بین نسخه‌های هسته متفاوت هستند؛ خروجی باید با نسخه کلاینت سازگار باشد.' },
            { name: 'Surge', text: 'پیکربندی Surge شامل پروکسی‌ها و قوانین مسیریابی. پشتیبانی پروتکل به نسخه کلاینت بستگی دارد.' },
            { name: 'Xray / V2Ray', text: 'فهرست لینک‌های نود با کدگذاری Base64 برای وارد کردن اشتراک در کلاینت‌هایی مانند v2rayN؛ این خروجی پیکربندی کامل Xray JSON نیست.' }
        ],
        compatibility: 'تبدیل، تنظیمات نودی را حفظ می‌کند که در فرمت مقصد قابل نمایش باشند. پشتیبانی از پروتکل، انتقال و قواعد در کلاینت‌ها متفاوت است و تبدیل، پشتیبانی پروتکل جدیدی به کلاینت اضافه نمی‌کند.',
        exampleTitle: 'نمونه: تبدیل لینک Shadowsocks به نود Clash',
        exampleIntro: 'این نمونه از دامنه و رمز ساختگی استفاده می‌کند. پس از وارد کردن لینک و تبدیل، بخش proxies خروجی Clash چنین نودی خواهد داشت. پیکربندی کامل شامل گروه‌های پروکسی و قوانین نیز هست.',
        exampleInput: 'لینک اشتراک نود',
        exampleOutput: 'بخشی از نود Clash',
        exampleNote: 'این نمونه فقط برای توضیح فرمت است و پروکسی قابل استفاده‌ای نیست.',
        faqTitle: 'پرسش‌های متداول',
        faqs: [
            { question: 'آیا می‌توان Clash را به Sing-Box تبدیل کرد؟', answer: 'بله. محتوای Clash YAML یا آدرس اشتراک قابل دسترس را وارد کنید و پس از تبدیل لینک Sing-Box را انتخاب کنید. نودهای پشتیبانی‌شده پردازش می‌شوند، اما همه فیلدهای اختصاصی Clash معادل مستقیمی ندارند.' },
            { question: 'آیا چند اشتراک را می‌توان ادغام کرد؟', answer: 'بله. هر آدرس اشتراک یا لینک نود را در یک خط جدا قرار دهید. همه منابع باید معتبر باشند. در صورت خطا، منابع را جداگانه امتحان کنید تا آدرس نامعتبر یا فرمت ناسازگار مشخص شود.' },
            { question: 'آیا اشتراک تبدیل‌شده به‌روز می‌شود؟', answer: 'اگر ورودی آدرس اشتراک باشد، به‌روزرسانی در کلاینت محتوای منبع را دوباره دریافت می‌کند. پیکربندی یا نود جای‌گذاری‌شده فقط نسخه همان لحظه است و پس از تغییر باید دوباره وارد و لینک جدید ساخته شود.' },
            { question: 'چرا نود پس از تبدیل متصل نمی‌شود؟', answer: 'تبدیل فقط فرمت را تغییر می‌دهد و اتصال را آزمایش نمی‌کند. تاریخ اعتبار اشتراک، آدرس و اطلاعات ورود نود و پشتیبانی کلاینت از پروتکل و روش انتقال را بررسی کنید.' },
            { question: 'آیا نود رایگان ارائه می‌شود؟', answer: 'این ابزار فقط اشتراک‌ها و نودهای موجود شما را تبدیل می‌کند و سرویس پروکسی ارائه نمی‌دهد. لینک‌های ورودی و خروجی ممکن است حاوی اطلاعات دسترسی باشند؛ آن‌ها را فقط با افراد و سرویس‌های مورد اعتماد به اشتراک بگذارید.' }
        ],
        backToTool: 'بازگشت به ابزار تبدیل'
    },
    'ru': {
        toggleLabel: 'Инструкция',
        closeLabel: 'Свернуть инструкцию',
        title: 'Преобразуйте подписку для своего клиента',
        intro: 'Объединяйте адреса подписок, ссылки на узлы или готовую конфигурацию и создавайте подписку для Clash, Sing-Box, Surge или Xray/V2Ray. Выбирайте правила маршрутизации при конвертации, чтобы сократить ручную настройку при смене клиента.',
        stepsTitle: 'Как преобразовать подписку',
        steps: [
            { title: 'Вставьте источники', text: 'Укажите каждый адрес подписки или ссылку на узел на отдельной строке. Для полной конфигурации вставьте один документ Clash YAML, Sing-Box JSON или Surge INI.' },
            { title: 'Выберите правила', text: 'В расширенных настройках выберите набор правил или добавьте свои. Для первого запуска можно оставить значения по умолчанию. Для изменения общих настроек администратор может требовать пароль.' },
            { title: 'Преобразуйте и импортируйте', text: 'Нажмите «Преобразовать», скопируйте ссылку для своего клиента и добавьте её как подписку или удалённую конфигурацию, затем обновите. Для копирования и QR-кода можно создать короткую ссылку.' }
        ],
        formatsTitle: 'Форматы ввода и вывода',
        inputTitle: 'Что можно импортировать',
        inputText: 'Подписки HTTP/HTTPS, списки узлов Base64, конфигурации Clash YAML, Sing-Box JSON и Surge INI. Поддерживается разбор ссылок Shadowsocks, VMess, VLESS, Trojan, Hysteria2, TUIC и AnyTLS.',
        outputTitle: 'Выберите формат клиента',
        outputs: [
            { name: 'Clash / Mihomo', text: 'Конфигурации YAML для клиентов, принимающих формат Clash.' },
            { name: 'Sing-Box', text: 'Конфигурации JSON. Поля зависят от версии ядра, поэтому выбирайте конфигурацию под версию клиента.' },
            { name: 'Surge', text: 'Конфигурации Surge с прокси и правилами. Поддержка протоколов зависит от версии клиента.' },
            { name: 'Xray / V2Ray', text: 'Список ссылок на узлы в кодировке Base64 для импорта подписки, например в v2rayN. Это не полная конфигурация Xray JSON.' }
        ],
        compatibility: 'Преобразование сохраняет настройки узлов, которые можно представить в целевом формате. Поддержка протоколов, транспорта и синтаксиса правил различается. Конвертация не добавляет клиенту поддержку новых протоколов.',
        exampleTitle: 'Пример: ссылка Shadowsocks в формате Clash',
        exampleIntro: 'В примере используются вымышленные домен и пароль. После преобразования ссылки раздел proxies в конфигурации Clash содержит такой узел. Полная конфигурация также включает группы прокси и правила.',
        exampleInput: 'Ссылка на узел',
        exampleOutput: 'Фрагмент узла Clash',
        exampleNote: 'Пример объясняет формат и не является рабочим прокси.',
        faqTitle: 'Частые вопросы',
        faqs: [
            { question: 'Можно ли преобразовать Clash в Sing-Box?', answer: 'Да. Вставьте Clash YAML или доступный адрес подписки, выполните преобразование и выберите ссылку Sing-Box. Инструмент разбирает поддерживаемые узлы и строит новую конфигурацию. Не все поля Clash имеют прямой аналог.' },
            { question: 'Можно ли объединить несколько подписок?', answer: 'Да. Вставьте адреса подписок или ссылки на узлы по одной на строку. Все источники должны быть действительными. При ошибке проверьте их по отдельности, чтобы найти недоступный адрес или несовместимый формат.' },
            { question: 'Будет ли обновляться новая подписка?', answer: 'Если исходные данные — адрес подписки, при обновлении в клиенте содержимое источника запрашивается снова. Вставленная конфигурация или список узлов сохраняют состояние на момент ввода. После изменения вставьте новые данные и создайте новую ссылку.' },
            { question: 'Почему узел не подключается после конвертации?', answer: 'Конвертация меняет формат и не проверяет соединение. Проверьте срок действия подписки, адрес и учётные данные узла, а также поддержку протокола и транспорта вашим клиентом.' },
            { question: 'Есть ли здесь бесплатные узлы?', answer: 'Инструмент преобразует ваши существующие подписки и узлы, но не предоставляет прокси-сервис. Исходные и созданные ссылки могут содержать данные доступа. Передавайте их только доверенным сервисам и людям.' }
        ],
        backToTool: 'Вернуться к конвертеру'
    }
};
