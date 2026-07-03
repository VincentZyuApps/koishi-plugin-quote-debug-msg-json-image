import { Schema } from 'koishi'
import path from 'node:path'
import { DEFAULT_FONT_RELEASE_URLS, getSchemaFontPath } from './font-utils'

export interface Config {
  enableQuote: boolean
  useNapcatGetMsgInsteadOnOnebot: boolean
  maxJsonTextLength: number
  dumpJsonCommandName: string
  dumpYamlCommandName: string
  dumpTomlCommandName: string
  dumpRenderMode: 'typst' | 'markdown'
  dumpMessageMode: 'forward' | 'image'
  downloadFontsFromRelease: boolean
  notoEmojiFontReleaseUrl: string
  lxgwFontReleaseUrl: string
  sourceHanFontReleaseUrl: string
  dumpTypstFontPath: string
  dumpTypstRenderScale: number
  dumpTypstPageBgColor: string
  dumpTypstTextColor: string
  dumpTypstHeaderFillColor: string
  dumpTypstHeaderStrokeColor: string
  dumpTypstHeaderTextColor: string
  dumpTypstPanelFillColor: string
  dumpTypstPanelStrokeColor: string
  dumpTypstSectionTitleColor: string
  dumpTypstCodeBlockFillColor: string
  dumpTypstCodeBlockStrokeColor: string
  dumpTypstStatsTextColor: string
  dumpJsonSyntaxPath: string
  dumpYamlSyntaxPath: string
  dumpTomlSyntaxPath: string
  maxForwardNestDepth: number
  renderForwardCommandName: string
  renderForwardDefaultStyle: 'source' | 'lxgw'
  renderForwardSourceFontPath: string
  renderForwardLxgwFontPath: string
  renderForwardMaxImageSize: number
  renderForwardPrefetchAvatar: boolean
  verboseConsoleLog: boolean
  verboseSessionLog: boolean
}

export const Config: Schema<Config> = Schema.intersect([

  Schema.object({
    enableQuote: Schema.boolean()
      .default(true)
      .description('💬 是否在 bot 响应消息时引用触发消息（forward 合并转发除外，因为 onebot 的 合并转发消息 不支持和quote消息段出现在同一个消息内）'),
    useNapcatGetMsgInsteadOnOnebot: Schema.boolean()
      .default(true)
      .description('🤖 如果是 onebot 平台，msgObj 使用 Napcat 的 `get_msg` 接口获取，而不是 koishi 的 `await session.bot.getMessage(` ')
  }).description('⚙️ 基础设置'),

  Schema.object({
    maxJsonTextLength: Schema.number()
      .default(2222)
      .min(50).max(10000).step(1)
      .description('📏 JSON/YAML/TOML 文本最大显示长度，超过将截断'),
    dumpJsonCommandName: Schema.string()
      .default('dump-json')
      .description('🧾 dump-json 指令名称，可自定义'),
    dumpYamlCommandName: Schema.string()
      .default('dump-yaml')
      .description('🧾 dump-yaml 指令名称，可自定义'),
    dumpTomlCommandName: Schema.string()
      .default('dump-toml')
      .description('🧾 dump-toml 指令名称，可自定义'),
    dumpRenderMode: Schema.union([
      Schema.const('typst').description('Typst 渲染（推荐）- 精美排版，速度快'),
      Schema.const('markdown').description('Markdown 渲染 - 简单快速，使用 markdown-to-image-service'),
    ])
      .role('radio')
      .default('typst')
      .description('🎨 dump 指令默认渲染方式（作为 option 的默认值）'),
    dumpMessageMode: Schema.union([
      Schema.const('forward').description('📦 合并转发模式'),
      Schema.const('image').description('🖼️ 仅发送图片'),
    ])
      .role('radio')
      .default('forward')
      .description('💬 dump 指令回复模式（作为 option 的默认值）'),
    dumpTypstRenderScale: Schema.number()
      .default(2.33)
      .min(1).max(100).step(0.01)
      .description('🔍 Typst 渲染缩放倍率（调整输出图片分辨率）'),
    dumpTypstPageBgColor: Schema.string()
      .role('color')
      .default('#f9efe2')
      .description('🧁 Typst 背景色'),
    dumpTypstTextColor: Schema.string()
      .role('color')
      .default('#2f2f35')
      .description('🖋️ Typst 正文文本颜色'),
    dumpTypstHeaderFillColor: Schema.string()
      .role('color')
      .default('#fab8ba')
      .description('🎀 Typst 标题栏填充色'),
    dumpTypstHeaderStrokeColor: Schema.string()
      .role('color')
      .default('#f9b7a0')
      .description('🪄 Typst 标题栏描边色'),
    dumpTypstHeaderTextColor: Schema.string()
      .role('color')
      .default('#ffffff')
      .description('✨ Typst 标题栏文字颜色'),
    dumpTypstPanelFillColor: Schema.string()
      .role('color')
      .default('#fffbf8')
      .description('📦 Typst 内容面板填充色'),
    dumpTypstPanelStrokeColor: Schema.string()
      .role('color')
      .default('#f3efe5')
      .description('🧷 Typst 内容面板描边色'),
    dumpTypstSectionTitleColor: Schema.string()
      .role('color')
      .default('#d0908c')
      .description('🧭 Typst 小节标题颜色'),
    dumpTypstCodeBlockFillColor: Schema.string()
      .role('color')
      .default('#ffffff')
      .description('🧩 Typst 代码块填充色'),
    dumpTypstCodeBlockStrokeColor: Schema.string()
      .role('color')
      .default('#edd6d0')
      .description('📐 Typst 代码块描边色'),
    dumpTypstStatsTextColor: Schema.string()
      .role('color')
      .default('#8788a5')
      .description('📊 Typst 统计信息文字颜色'),
    dumpJsonSyntaxPath: Schema.string()
      .default(path.resolve(__dirname, '../syntaxes/json.sublime-syntax.yml'))
      .role('textarea', { rows: [2, 5] })
      .description('📄 JSON 语法高亮文件路径（sublime-syntax 格式）'),
    dumpYamlSyntaxPath: Schema.string()
      .default(path.resolve(__dirname, '../syntaxes/yaml.sublime-syntax.yml'))
      .role('textarea', { rows: [2, 5] })
      .description('📄 YAML 语法高亮文件路径（sublime-syntax 格式）'),
    dumpTomlSyntaxPath: Schema.string()
      .default(path.resolve(__dirname, '../syntaxes/toml.sublime-syntax.yml'))
      .role('textarea', { rows: [2, 5] })
      .description('📄 TOML 语法高亮文件路径（sublime-syntax 格式）'),
  }).description('🧾 dump 指令设置'),

  Schema.object({
    downloadFontsFromRelease: Schema.boolean()
      .default(true)
      .description('📥 是否从 Release 自动下载字体。开启后会下载并校验下方字体到对应路径；如需完全使用自有字体，可关闭此项'),
    notoEmojiFontReleaseUrl: Schema.string()
      .default(DEFAULT_FONT_RELEASE_URLS.NOTO_EMOJI)
      .role('textarea', { rows: [2, 5] })
      .description('😀 Noto Color Emoji 字体 Release 下载地址。默认先用 Gitee，失败后自动尝试 GitHub'),
    lxgwFontReleaseUrl: Schema.string()
      .default(DEFAULT_FONT_RELEASE_URLS.LXGW)
      .role('textarea', { rows: [2, 5] })
      .description('🔤 LXGW WenKai Mono 字体 Release 下载地址。对应 dumpTypstFontPath 与 renderForwardLxgwFontPath'),
    sourceHanFontReleaseUrl: Schema.string()
      .default(DEFAULT_FONT_RELEASE_URLS.SOURCE_HAN)
      .role('textarea', { rows: [2, 5] })
      .description('🔤 Source Han Serif SC 字体 Release 下载地址。对应 renderForwardSourceFontPath'),
    dumpTypstFontPath: Schema.string()
      .default(getSchemaFontPath('LXGW'))
      .role('textarea', { rows: [2, 5] })
      .description('🔤 Typst 主字体路径。默认展示 process.cwd()/data/fonts 路径，运行时映射到 ctx.baseDir/data/fonts'),
    renderForwardSourceFontPath: Schema.string()
      .default(getSchemaFontPath('SOURCE_HAN'))
      .role('textarea', { rows: [2, 5] })
      .description('🔤 render-forward Source 风格字体路径。默认展示 process.cwd()/data/fonts 路径，运行时映射到 ctx.baseDir/data/fonts'),
    renderForwardLxgwFontPath: Schema.string()
      .default(getSchemaFontPath('LXGW'))
      .role('textarea', { rows: [2, 5] })
      .description('🔤 render-forward LXGW 风格字体路径。默认展示 process.cwd()/data/fonts 路径，运行时映射到 ctx.baseDir/data/fonts'),
  }).description('🔤 字体设置'),

  Schema.object({
    maxForwardNestDepth: Schema.number()
      .default(3)
      .min(1).max(10).step(1)
      .description('🧵 转发消息最大嵌套深度，超过将省略，仅显示 [合并转发]'),
    renderForwardCommandName: Schema.string()
      .default('render-forward')
      .description('🪄 render-forward 指令名称，可自定义'),
    renderForwardDefaultStyle: Schema.union([
      Schema.const('source').description('Source Han Serif 风格 (index=0)'),
      Schema.const('lxgw').description('LXGW WenKai 风格 (index=1)'),
    ])
      .role('radio')
      .default('source')
      .description('🎨 render-forward 默认样式 (可被 --index/-i 覆盖)'),
    renderForwardMaxImageSize: Schema.number()
      .default(50)
      .min(10).max(1000).step(1)
      .description('🖼️ render-forward 图片长边最大长度 (px)'),
    renderForwardPrefetchAvatar: Schema.boolean()
      .default(true)
      .description('🖼️ 预获取QQ头像并转为base64（解决puppeteer无法加载QQ头像的问题）')
  }).description('📨 render-forward 指令设置'),

  Schema.object({
    verboseConsoleLog: Schema.boolean()
      .default(true)
      .description('🐛 启用详细调试日志（显示 Typst 编译过程、语法文件加载等信息）'),
    verboseSessionLog: Schema.boolean()
      .default(false)
      .description('💬 在发送到聊天平台的消息中包含调试信息（仅当 verboseConsoleLog 开启时生效）'),
  }).description('🛠️ 调试选项'),

])
