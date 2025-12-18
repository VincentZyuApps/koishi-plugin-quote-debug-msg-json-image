import { Context, h } from 'koishi'
import { } from 'koishi-plugin-markdown-to-image-service'
import type { Config } from './index'
import yaml from 'js-yaml'
import TOML from '@iarna/toml'

type FormatType = 'json' | 'yaml' | 'toml'

/**
 * 将数据格式化为指定格式的字符串
 */
function formatData(data: any, format: FormatType): string {
  switch (format) {
    case 'json':
      return JSON.stringify(data, null, 2)
    case 'yaml':
      return yaml.dump(data, { indent: 2, lineWidth: -1 })
    case 'toml':
      // TOML 要求顶层必须是对象，如果不是则包装一下
      const tomlData = typeof data === 'object' && data !== null && !Array.isArray(data)
        ? data
        : { data }
      return TOML.stringify(tomlData as any)
    default:
      return JSON.stringify(data, null, 2)
  }
}

/**
 * 获取格式的显示名称
 */
function getFormatDisplayName(format: FormatType): string {
  return format.toUpperCase()
}

/**
 * 获取代码块语言标识
 */
function getCodeBlockLang(format: FormatType): string {
  return format
}

/**
 * 生成合并转发消息
 */
function generateForwardMessage(
  formattedData: string, 
  imageBuffer: Buffer, 
  maxTextLength: number,
  format: FormatType
): string {
  let messages = ''
  const formatName = getFormatDisplayName(format)

  const addMessageBlock = (authorName: string, content: string) => {
    messages += `
      <message>
        <author name="${authorName}"/>
        ${content}
      </message>`
  }

  // 第一条消息：说明
  addMessageBlock(
    `📋 消息${formatName}调试`,
    [
      `⏰ 查询时间: ${new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `📊 以下是消息的${formatName}数据（前${maxTextLength}字符）`
    ].join('\n')
  )

  // 第二条消息：数据内容（前maxTextLength字符）
  const dataPreview = formattedData.length > maxTextLength
    ? formattedData.substring(0, maxTextLength) + '\n...\n(内容过长，已截断)'
    : formattedData

  addMessageBlock(
    `📝 ${formatName}数据`,
    dataPreview
  )

  // 第三条消息：统计信息
  addMessageBlock(
    '📈 数据统计',
    [
      `━━━━━━━━━━━━━━━━━━━━━`,
      `📏 ${formatName}总长度: ${formattedData.length} 字符`,
      `📄 显示长度: ${Math.min(formattedData.length, maxTextLength)} 字符`,
      `✂️ 是否截断: ${formattedData.length > maxTextLength ? '是' : '否'}`
    ].join('\n')
  )

  // 第四条消息：完整数据图片
  addMessageBlock(
    `🖼️ 完整${formatName}图片`,
    h.image(imageBuffer, 'image/png').toString()
  )

  return `<message forward>\n${messages}\n</message>`
}

/**
 * 注册单个 dump 指令
 */
function registerDumpCommand(
  ctx: Context, 
  cfg: Config, 
  commandName: string, 
  format: FormatType,
  description: string
) {
  ctx.command(commandName, description)
    .action(async ({ session }) => {

      if (!session.quote) {
        await session.send('请回复一条消息来使用此命令')
        return
      }

      try {
        const msgObj = session.platform === 'onebot' && cfg.useNapcatGetMsgInsteadOnOnebot
          ? await session.bot.internal._request('get_msg', { message_id: session.quote.messageId })
          : await session.bot.getMessage(session.channelId, session.quote.messageId)

        // 格式化数据
        const formattedData = formatData(msgObj, format)
        const formatName = getFormatDisplayName(format)
        const codeLang = getCodeBlockLang(format)

        // 打印到日志
        ctx.logger.info(`[${commandName}] quote.message = ${formattedData}`)

        // 生成完整的图片版本（注意：markdown 代码块标记必须顶格，不能有缩进）
        const markdown = `<style>
pre code {
  font-size: 18px !important;
  line-height: 1.3 !important;
}
</style>

# Quote Message Debug (${formatName})

\`\`\`${codeLang}
${formattedData}
\`\`\``
        const imageBuffer = await ctx.markdownToImage.convertToImage(markdown)

        // 生成合并转发消息（包含图片）
        const forwardMessage = generateForwardMessage(
          formattedData, 
          imageBuffer, 
          cfg.maxJsonTextLength ?? 2000,
          format
        )
        // 发送合并转发消息
        await session.send(forwardMessage)

      } catch (err) {
        const errmsg = `[${commandName}] 获取消息或生成图片失败：${err}`
        ctx.logger.error(errmsg)
        await session.send(errmsg)
      }

    })
}

/**
 * 注册所有 dump 指令 (dump-json, dump-yaml, dump-toml)
 */
export function registerDumpJsonCommand(ctx: Context, cfg: Config) {
  // 注册 dump-json
  registerDumpCommand(
    ctx, cfg,
    cfg.dumpJsonCommandName || 'dump-json',
    'json',
    '输出被引用消息的JSON数据'
  )

  // 注册 dump-yaml
  registerDumpCommand(
    ctx, cfg,
    cfg.dumpYamlCommandName || 'dump-yaml',
    'yaml',
    '输出被引用消息的YAML数据'
  )

  // 注册 dump-toml
  registerDumpCommand(
    ctx, cfg,
    cfg.dumpTomlCommandName || 'dump-toml',
    'toml',
    '输出被引用消息的TOML数据'
  )
}
