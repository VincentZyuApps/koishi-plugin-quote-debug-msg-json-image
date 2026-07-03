import path from 'node:path'
import fs from 'node:fs'
import { Context, h } from 'koishi'
import yaml from 'js-yaml'
import TOML from '@iarna/toml'
import { } from 'koishi-plugin-markdown-to-image-service'
import { } from 'koishi-plugin-puppeteer'
import type { Config } from './config'
import { Config as ConfigSchema } from './config'
import { createUsage } from './usage'
import { renderMarkdownImage, FormatType } from './dump-markdown'
import * as dumpTypst from './dump-typst'
import { registerRenderForwardCommand } from './render-forward'
import { checkAndDownloadFonts } from './font-utils'
import { registerQQQuoteCacheMiddleware, resolveQQQuotedMessageObject } from './qq-quote'

const pkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8')
)

export const name = 'quote-debug-msg-json-image'

export const inject = {
  required: ['markdownToImage', 'puppeteer'],
}

export const usage = createUsage(pkg.version)

export { ConfigSchema as Config }

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

function trimForwardMessages(msgObj: any, depth: number = 0): boolean {
  let trimmed = false
  const messageArray = msgObj?.data?.message || msgObj?.message
  if (!Array.isArray(messageArray)) return false
  for (let i = 0; i < messageArray.length; i++) {
    const element = messageArray[i]
    if (element?.type === 'forward' && element?.data?.content) {
      const content = element.data.content
      if (Array.isArray(content) && content.length > 1) {
        const omittedCount = content.length - 1
        let omittedChars = 0
        try {
          const omittedContent = content.slice(1)
          omittedChars = JSON.stringify(omittedContent).length
        } catch (e) {
          omittedChars = 0
        }
        element.data.content = [content[0], {
          "......": `已省略 ${omittedCount} 条消息（约 ${omittedChars} 字符）`,
          "_omitted_count": omittedCount,
          "_omitted_chars": omittedChars,
          "_note": "为避免消息过长导致渲染卡顿，合并转发消息已被自动裁剪"
        }]
        trimmed = true
        if (content[0]) {
          const nestedTrimmed = trimForwardMessages(content[0], depth + 1)
          if (nestedTrimmed) trimmed = true
        }
      } else if (Array.isArray(content) && content.length === 1) {
        const nestedTrimmed = trimForwardMessages(content[0], depth + 1)
        if (nestedTrimmed) trimmed = true
      }
    }
  }
  return trimmed
}

async function resolveDumpMessageObject(
  ctx: Context,
  cfg: Config,
  session: any,
  self: boolean,
): Promise<any | null> {
  if (self) {
    if (session.platform === 'onebot' && cfg.useNapcatGetMsgInsteadOnOnebot) {
      return session.bot.internal._request('get_msg', { message_id: session.messageId })
    }
    return session.bot.getMessage(session.channelId, session.messageId)
  }

  if (session.platform === 'qq') {
    const qqResolved = await resolveQQQuotedMessageObject(ctx, session, cfg.verboseConsoleLog)
    if (qqResolved) return qqResolved
  }

  if (!session.quote) return null

  const targetMessageId = session.quote.messageId
  if (session.platform === 'onebot' && cfg.useNapcatGetMsgInsteadOnOnebot) {
    return session.bot.internal._request('get_msg', { message_id: targetMessageId })
  }
  return session.bot.getMessage(session.channelId, targetMessageId)
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

  addMessageBlock(`📝 ${formatName}数据`, dataPreview)

  addMessageBlock('📈 数据统计', [
    `━━━━━━━━━━━━━━━━━━━━━`,
    `📏 ${formatName}总长度: ${formattedData.length} 字符`,
    `📄 显示长度: ${Math.min(formattedData.length, maxTextLength)} 字符`,
    `✂️ 是否截断: ${formattedData.length > maxTextLength ? '是' : '否'}`,
    `🎨 渲染方式: ${renderLabel}`
  ].join('\n'))

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
        try {
          const msgObj = await resolveDumpMessageObject(ctx, cfg, session, !!options?.self)
          if (!msgObj) {
            const hint = '请回复一条消息来使用此命令，或使用 -s 参数解析当前消息'
            await session.send(cfg.enableQuote ? [h.quote(session.messageId), hint] : hint)
            return
          }

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

export async function apply(ctx: Context, cfg: Config) {
  await checkAndDownloadFonts(ctx, name, cfg).catch(err => {
    ctx.logger.warn(`[${name}] 字体下载失败，部分功能可能异常: ${err}`)
  })
  registerQQQuoteCacheMiddleware(ctx)
  registerAllDumpCommands(ctx, cfg)
  registerRenderForwardCommand(ctx, cfg)
}
