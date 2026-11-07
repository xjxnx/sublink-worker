import { APP_NAME, APP_VERSION, GITHUB_REPO } from '../constants.js';
import { homeGuideTranslations } from '../i18n/homeGuide.js';
import { CONVERSION_GUIDES } from './conversionGuides.js';

export const guideMarkdownPath = (guide) => `${guide.path}.md`;

const markdownTable = ({ headers, rows }) => {
    const row = (cells) => `| ${cells.map(cell => cell.replace(/\|/g, '\\|')).join(' | ')} |`;
    return [row(headers), row(headers.map(() => '---')), ...rows.map(row)].join('\n');
};

export function buildGuideMarkdown(guide, origin) {
    return [
        `# ${guide.title}`,
        `原文：${origin}${guide.path}\n\n内容更新：${guide.updatedAt}`,
        guide.intro,
        ...(guide.overview ? [`## ${guide.overview.title}`, guide.overview.text, guide.overview.flow] : []),
        ...(guide.comparison ? [`## ${guide.comparison.title}`, markdownTable(guide.comparison)] : []),
        '## 操作步骤',
        guide.steps.map((step, index) => `${index + 1}. **${step.title}**\n\n   ${step.text}`).join('\n\n'),
        ...(guide.image ? [`![${guide.image.alt}](${origin}${guide.image.src})`, guide.image.caption] : []),
        `## ${guide.example.title}`,
        guide.example.text,
        `\`\`\`text\n${guide.example.code}\n\`\`\``,
        ...guide.sections.flatMap(section => [`## ${section.title}`, section.text]),
        '## 官方配置参考',
        guide.references.map(reference => `- [${reference.title}](${reference.url})`).join('\n'),
        '## 相关教程',
        CONVERSION_GUIDES.filter(item => item.path !== guide.path)
            .map(item => `- [${item.title}](${origin}${item.path}): ${item.summary}`).join('\n'),
        `[打开订阅转换工具](${origin}/#input)`,
        ''
    ].join('\n\n');
}

export function buildLlmsText(origin) {
    const guide = homeGuideTranslations['zh-CN'];
    return [
        `# ${APP_NAME}（Sublink Worker）`,
        `> ${guide.intro}`,
        `本站为 Sublink Worker 的定制版本，项目源码为 ${GITHUB_REPO}。当前软件版本：${APP_VERSION}。上游文档与本站定制功能可能不同，本站行为以本仓库源码和教程为准。`,
        guide.inputText,
        guide.compatibility,
        '## 输出格式',
        ...guide.outputs.map(output => `### ${output.name}\n\n${output.text}`),
        '## 使用教程',
        `- [在线订阅转换工具](${origin}/): 输入已有订阅，选择客户端格式；页面包含操作步骤、示例与常见问题。`,
        ...CONVERSION_GUIDES.map(item => `- [${item.title}](${origin}${item.path}): ${item.summary} 内容更新：${item.updatedAt}。\n- [${item.title}（Markdown）](${origin}${guideMarkdownPath(item)}): 与教程 HTML 共用内容来源，便于读取和引用。`),
        '## 常见问题',
        ...guide.faqs.map(faq => `### ${faq.question}\n\n${faq.answer}`),
        '## 项目与来源',
        `- [本站项目源码](${GITHUB_REPO}): 定制版本实现和问题反馈。`,
        '- [上游项目源码](https://github.com/7Sageer/sublink-worker): 原始 Sublink Worker 项目。',
        '- [上游文档](https://sublink.works/): 上游使用与部署参考，不代表本站所有定制行为。',
        ''
    ].join('\n\n');
}
