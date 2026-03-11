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
import fs from 'node:fs'

// 读取 package.json 获取版本号
const pkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8')
)

export const name = 'quote-debug-msg-json-image'

export const inject = {
  required: ['markdownToImage', 'toImageService', 'node', 'puppeteer'],
}

export const usage = `
<h1>📋 Koishi 插件：quote-debug-msg-json-image</h1>
<h2>🎯 插件版本：v${pkg.version}</h2>

<p>回复一条消息，将其渲染为精美的 JSON/YAML/TOML 格式图片。还支持渲染 OneBot 的合并转发消息为图片。</p>

<p><del>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>259248174</b>   🎉（这个群G了</del> </p> 
<p>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>1085190201</b> 🎉</p>
<p>💡 在群里直接艾特我，回复的更快哦~ ✨</p>


<p><b>💡 提示：</b> <a href="https://gitee.com/vincent-zyu/koishi-plugin-quote-debug-msg-json-image" target="_blank">前往 Gitee README 获得更佳观感 → <i>https://gitee.com/vincent-zyu/koishi-plugin-quote-debug-msg-json-image</i></a></p>

<hr>

<h2 style="color: #f44336;">⚠️ 前置依赖（必须安装）</h2>

<table>
<thead>
<tr><th>依赖插件</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td><b>to-image-service</b> + <b>w-node</b></td><td>Typst 图片渲染（dump 指令）</td></tr>
<tr><td><b>puppeteer</b></td><td>Puppeteer 图片渲染（render-forward 指令）</td></tr>
<tr><td><b>markdown-to-image-service</b></td><td>Markdown 渲染备选方案</td></tr>
</tbody>
</table>

<p style="color: #f44336;"><b>🔴 请确保以上插件已安装并启用，否则本插件无法正常工作！</b></p>

<hr>

<h2>✨ 功能特性</h2>
<ul>
<li>📋 <b>dump 指令</b>：将消息对象序列化为 JSON/YAML/TOML 格式，渲染成图片</li>
<li>📨 <b>render-forward 指令</b>：将合并转发消息渲染成精美的图片</li>
<li>🎨 <b>双渲染引擎</b>：支持 Typst（推荐）和 Markdown 两种渲染模式</li>
<li>🌈 <b>代码语法高亮</b>：JSON/YAML/TOML 自动语法着色</li>
<li>🧵 <b>嵌套转发支持</b>：智能处理多层嵌套的合并转发消息</li>
</ul>

<hr>

<h2>📖 使用方法</h2>

<h3>dump 指令</h3>
<p>回复一条消息并发送指令：</p>
<pre><code>
dump-json          # 渲染为 JSON 格式图片
</code></pre>
<pre><code>
dump-yaml          # 渲染为 YAML 格式图片
</code></pre>
<pre><code>
dump-toml          # 渲染为 TOML 格式图片
</code></pre>

<p><b>可用选项：</b></p>
<ul>
<li><code>-r, --reply-mode &lt;typst|markdown&gt;</code> - 选择渲染引擎</li>
<li><code>-m, --message-mode &lt;forward|image&gt;</code> - 回复模式（合并转发/仅图片）</li>
<li><code>-s, --self</code> - 解析当前消息而非被引用的消息</li>
</ul>

<h3>render-forward 指令</h3>
<p>回复一条合并转发消息并发送：</p>
<pre><code>render-forward     # 渲染合并转发为图片</code></pre>

<p><b>可用选项：</b></p>
<ul>
<li><code>-i, --index &lt;0|1&gt;</code> - 样式选择（0=Source Han Serif 毛玻璃风格, 1=LXGW WenKai 简约风格）</li>
</ul>

<hr>

<p><b>📦 仓库地址：</b> <a href="https://gitee.com/vincent-zyu/koishi-plugin-quote-debug-msg-json-image" target="_blank">Gitee</a></p>
`

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
  // 📨 render-forward 指令设置
  maxForwardNestDepth: number
  renderForwardCommandName: string
  renderForwardDefaultStyle: 'source' | 'lxgw'
  renderForwardSourceFontPath: string
  renderForwardLxgwFontPath: string
  renderForwardMaxImageSize: number
  renderForwardPrefetchAvatar: boolean
  // 🛠️ 调试选项
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
      .description('🤖 如果是 onebot 平台，msgObj 使用 Napcat 的 get_msg 接口获取，而不是 koishi 的 await session.bot.getMessage(')
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
    dumpTypstFontPath: Schema.string()
      .default('/home/bawuyinguo/Fonts/LXGWWenKai/LXGWWenKaiMono-Medium.ttf')
      .role('textarea', { rows: [2, 5] })
      .description('🔤 Typst 渲染字体绝对路径（ttf/otf 格式）'),
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
      .role('textarea', { rows: [2, 5] })
      .description('🔤 render-forward Source 风格字体绝对路径'),
    renderForwardLxgwFontPath: Schema.string()
      .default('/home/bawuyinguo/Fonts/LXGWWenKai/LXGWWenKaiMono-Medium.ttf')
      .role('textarea', { rows: [2, 5] })
      .description('🔤 render-forward LXGW 风格字体绝对路径'),
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
      .default(false)
      .description('🐛 启用详细调试日志（显示 Typst 编译过程、语法文件加载等信息）'),
    verboseSessionLog: Schema.boolean()
      .default(false)
      .description('💬 在发送到聊天平台的消息中包含调试信息（仅当 verboseConsoleLog 开启时生效）'),
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

/**
 * 递归处理消息对象，将合并转发消息只保留第一条
 * @param msgObj 消息对象
 * @param depth 当前递归深度
 * @returns 是否进行了裁剪
 */
function trimForwardMessages(msgObj: any, depth: number = 0): boolean {
  let trimmed = false
  
  // 处理 msgObj.data.message 或 msgObj.message
  const messageArray = msgObj?.data?.message || msgObj?.message
  
  if (!Array.isArray(messageArray)) return false
  
  for (let i = 0; i < messageArray.length; i++) {
    const element = messageArray[i]
    
    // 如果是 forward 类型
    if (element?.type === 'forward' && element?.data?.content) {
      const content = element.data.content
      
      if (Array.isArray(content) && content.length > 1) {
        // 计算被省略的消息数
        const omittedCount = content.length - 1
        
        // 计算被省略的字符数（粗略估算）
        let omittedChars = 0
        try {
          const omittedContent = content.slice(1)
          omittedChars = JSON.stringify(omittedContent).length
        } catch (e) {
          omittedChars = 0
        }
        
        // 只保留第一条，并添加占位符
        const placeholder = {
          "......": `已省略 ${omittedCount} 条消息（约 ${omittedChars} 字符）`,
          "_omitted_count": omittedCount,
          "_omitted_chars": omittedChars,
          "_note": "为避免消息过长导致渲染卡顿，合并转发消息已被自动裁剪"
        }
        
        element.data.content = [content[0], placeholder]
        trimmed = true
        
        // 递归处理第一条消息
        if (content[0]) {
          const nestedTrimmed = trimForwardMessages(content[0], depth + 1)
          if (nestedTrimmed) trimmed = true
        }
      } else if (Array.isArray(content) && content.length === 1) {
        // 只有一条，但也需要递归检查
        const nestedTrimmed = trimForwardMessages(content[0], depth + 1)
        if (nestedTrimmed) trimmed = true
      }
    }
  }
  
  return trimmed
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

          // 检测并裁剪合并转发消息
          const wasTrimmed = trimForwardMessages(msgObj)
          if (wasTrimmed) {
            ctx.logger.warn(`[${cmd.name}] 检测到尝试dump合并转发，已自动裁剪，只保留第一条消息（递归处理）`)
          }

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
