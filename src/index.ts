import { Context, Schema, h } from 'koishi'
import { } from 'koishi-plugin-markdown-to-image-service'
import { } from 'koishi-plugin-puppeteer'
import { } from 'koishi-plugin-to-image-service'
import { } from 'koishi-plugin-w-node'
import { renderMarkdownImage, FormatType } from './dump-markdown'
import * as dumpTypst from './dump-typst'
import yaml from 'js-yaml'
import TOML from '@iarna/toml'
import { registerRenderForwardCommand } from './render-forward'
import path from 'node:path'

export const name = 'quote-debug-msg-json-image'

export const inject = {
  required: ['markdownToImage', 'toImageService', 'node', 'puppeteer'],
}

export interface Config {
  // ⚙️ 基础设置
  enableQuote: boolean
  useNapcatGetMsgInsteadOnOnebot: boolean
  // 🧾 dump 指令设置
  maxJsonTextLength: number
  dumpJsonCommandName: string
  dumpYamlCommandName: string
  dumpTomlCommandName: string
  dumpRenderMode: 'typst' | 'markdown'
  dumpMessageMode: 'forward' | 'image'
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
  // 📨 render-forward 指令设置
  maxForwardNestDepth: number
  renderForwardCommandName: string
  renderForwardDefaultStyle: 'source' | 'lxgw'
  renderForwardSourceFontPath: string
  renderForwardLxgwFontPath: string
  renderForwardMaxImageSize: number
  // 🛠️ 调试选项
  verboseConsoleLog: boolean
}

export const Config: Schema<Config> = Schema.intersect([

  Schema.object({
    enableQuote: Schema.boolean()
      .default(true)
      .description('💬 是否在 bot 响应消息时引用触发消息（forward 合并转发除外，因为 onebot 不支持）'),
    useNapcatGetMsgInsteadOnOnebot: Schema.boolean()
      .default(true)
      .description('🤖 如果是 onebot 平台，msgObj 使用 Napcat 的 get_msg 接口获取，而不是 koishi 的 await session.bot.getMessage(')
  }).description('⚙️ 基础设置'),

  Schema.object({
    maxJsonTextLength: Schema.number()
      .default(2233)
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
      .default(path.resolve(__dirname, '../syntaxes/json.sublime-syntax'))
      .description('📄 JSON 语法高亮文件路径（sublime-syntax 格式）'),
    dumpYamlSyntaxPath: Schema.string()
      .default(path.resolve(__dirname, '../syntaxes/yaml.sublime-syntax'))
      .description('📄 YAML 语法高亮文件路径（sublime-syntax 格式）'),
    dumpTomlSyntaxPath: Schema.string()
      .default(path.resolve(__dirname, '../syntaxes/toml.sublime-syntax'))
      .description('📄 TOML 语法高亮文件路径（sublime-syntax 格式）'),
  }).description('🧾 dump 指令设置'),

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
    renderForwardSourceFontPath: Schema.string()
      .default('/home/bawuyinguo/Fonts/SourceHanSerifSC/SourceHanSerifSC-Medium.otf')
      .description('🔤 render-forward Source 风格字体绝对路径'),
    renderForwardLxgwFontPath: Schema.string()
      .default('/home/bawuyinguo/Fonts/LXGWWenKai/LXGWWenKaiMono-Medium.ttf')
      .description('🔤 render-forward LXGW 风格字体绝对路径'),
    renderForwardMaxImageSize: Schema.number()
      .default(50)
      .min(10).max(1000).step(1)
      .description('🖼️ render-forward 图片长边最大长度 (px)')
  }).description('📨 render-forward 指令设置'),

  Schema.object({
    verboseConsoleLog: Schema.boolean()
      .default(false)
      .description('🐛 启用详细调试日志（显示 Typst 编译过程、语法文件加载等信息）'),
  }).description('🛠️ 调试选项'),

])

function formatData(data: any, format: FormatType): string {
  switch (format) {
    case 'json':
      return JSON.stringify(data, null, 2)
    case 'yaml':
      return yaml.dump(data, { indent: 2, lineWidth: -1 })
    case 'toml': {
      const tomlData = typeof data === 'object' && data !== null && !Array.isArray(data)
        ? data
        : { data }
      return TOML.stringify(tomlData)
    }
    default:
      return JSON.stringify(data, null, 2)
  }
}

function getFormatDisplayName(format: FormatType): string {
  return format.toUpperCase()
}

function resolveReplyMode(cfg: Config, raw?: string): 'typst' | 'markdown' {
  const normalized = (raw || '').trim().toLowerCase()
  if (normalized === 'typst' || normalized === 'typ') return 'typst'
  if (normalized === 'markdown' || normalized === 'md') return 'markdown'
  return cfg.dumpRenderMode === 'markdown' ? 'markdown' : 'typst'
}

function resolveMessageMode(cfg: Config, raw: string | undefined, platform: string): 'forward' | 'image' {
  const normalized = (raw || '').trim().toLowerCase()
  const mode = normalized === 'forward' || normalized === 'image'
    ? normalized
    : (cfg.dumpMessageMode === 'image' ? 'image' : 'forward')
  if (mode === 'forward' && platform !== 'onebot') return 'image'
  return mode
}

async function renderTypstImageSafe(
  ctx: Context,
  cfg: Config,
  formattedData: string,
  format: FormatType,
  messageMode: 'forward' | 'image',
): Promise<Buffer> {
  const fn = (dumpTypst as any).renderTypstImage as
    | ((ctx: Context, cfg: Config, formattedData: string, format: FormatType, messageMode: 'forward' | 'image') => Promise<Buffer>)
    | undefined
  if (!fn) throw new Error('renderTypstImage 未导出或加载失败')
  return fn(ctx, cfg, formattedData, format, messageMode)
}

function buildForwardMessage(
  formattedData: string,
  imageBuffer: Buffer,
  maxTextLength: number,
  format: FormatType,
  renderLabel: string,
): string {
  const formatName = getFormatDisplayName(format)
  let messages = ''

  const addMessageBlock = (authorName: string, content: string) => {
    messages += `
      <message>
        <author name="${authorName}"/>
        ${content}
      </message>`
  }

  addMessageBlock(
    `📋 消息${formatName}调试`,
    [
      `⏰ 查询时间: ${new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `📊 以下是消息的${formatName}数据（前${maxTextLength}字符）`
    ].join('\n')
  )

  const dataPreview = formattedData.length > maxTextLength
    ? formattedData.substring(0, maxTextLength) + '\n...\n(内容过长，已截断)'
    : formattedData

  addMessageBlock(
    `📝 ${formatName}数据`,
    dataPreview
  )

  addMessageBlock(
    '📈 数据统计',
    [
      `━━━━━━━━━━━━━━━━━━━━━`,
      `📏 ${formatName}总长度: ${formattedData.length} 字符`,
      `📄 显示长度: ${Math.min(formattedData.length, maxTextLength)} 字符`,
      `✂️ 是否截断: ${formattedData.length > maxTextLength ? '是' : '否'}`,
      `🎨 渲染方式: ${renderLabel}`
    ].join('\n')
  )

  addMessageBlock(
    `🖼️ 完整${formatName}图片 (${renderLabel})`,
    h.image(imageBuffer, 'image/png').toString()
  )

  return `<message forward>\n${messages}\n</message>`
}

function registerAllDumpCommands(ctx: Context, cfg: Config) {
  const dumpCommands: Array<{ format: FormatType; name: string; desc: string }> = [
    { format: 'json', name: cfg.dumpJsonCommandName || 'dump-json', desc: '输出被引用消息的JSON数据' },
    { format: 'yaml', name: cfg.dumpYamlCommandName || 'dump-yaml', desc: '输出被引用消息的YAML数据' },
    { format: 'toml', name: cfg.dumpTomlCommandName || 'dump-toml', desc: '输出被引用消息的TOML数据' },
  ]

  for (const cmd of dumpCommands) {
    ctx.command(cmd.name, cmd.desc)
      .option('replyMode', '-r, --reply-mode <mode:string> 回复渲染模式 (typ/typst 或 md/markdown)')
      .option('messageMode', '-m, --message-mode <mode:string> 回复消息模式 (forward 或 image，非 onebot 会自动回退为 image)')
      .option('self', '-s, --self 解析当前消息本身而不是引用的消息')
      .action(async ({ session, options }) => {

        // 如果没有 --self 且没有引用消息，提示用户
        if (!options?.self && !session.quote) {
          const hint = '请回复一条消息来使用此命令，或使用 -s 参数解析当前消息'
          await session.send(cfg.enableQuote ? [h.quote(session.messageId), hint] : hint)
          return
        }

        try {
          // 根据 --self 参数决定获取哪条消息
          const targetMessageId = options?.self ? session.messageId : session.quote.messageId
          const msgObj = session.platform === 'onebot' && cfg.useNapcatGetMsgInsteadOnOnebot
            ? await session.bot.internal._request('get_msg', { message_id: targetMessageId })
            : await session.bot.getMessage(session.channelId, targetMessageId)

          const formattedData = formatData(msgObj, cmd.format)
          ctx.logger.info(`[${cmd.name}] quote.message = ${formattedData}`)

          const replyMode = resolveReplyMode(cfg, options?.replyMode)
          const messageMode = resolveMessageMode(cfg, options?.messageMode, session.platform)

          const imageBuffer = replyMode === 'markdown'
            ? await renderMarkdownImage(ctx, formattedData, cmd.format, messageMode)
            : await renderTypstImageSafe(ctx, cfg, formattedData, cmd.format, messageMode)

          if (messageMode === 'image') {
            const imgEl = h.image(imageBuffer, 'image/png')
            await session.send(cfg.enableQuote ? [h.quote(session.messageId), imgEl] : imgEl)
          } else {
            const forwardMessage = buildForwardMessage(
              formattedData,
              imageBuffer,
              cfg.maxJsonTextLength ?? 2000,
              cmd.format,
              replyMode === 'markdown' ? 'Markdown' : 'Typst'
            )
            await session.send(forwardMessage)
          }

        } catch (err) {
          const errmsg = `[${cmd.name}] 获取消息或生成图片失败：${err}`
          ctx.logger.error(errmsg)
          await session.send(cfg.enableQuote ? [h.quote(session.messageId), errmsg] : errmsg)
        }
      })
  }
}

export function apply(ctx: Context, cfg: Config) {
  // 注册 dump 指令（支持 option 覆盖回复模式与渲染模式）
  registerAllDumpCommands(ctx, cfg)

  // 注册 render_forward 指令（仅支持 puppeteer）
  registerRenderForwardCommand(ctx, cfg)
}
