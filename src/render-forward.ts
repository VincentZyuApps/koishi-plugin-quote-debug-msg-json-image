import { Context, h } from 'koishi'
import { } from 'koishi-plugin-puppeteer'
import type { Config } from './index'

/**
 * 合并转发消息的内容项类型
 */
interface ForwardContentItem {
  self_id: number
  user_id: number
  time: number
  message_id: number
  message_seq: number
  real_id: number
  real_seq: string
  message_type: string
  sender: {
    user_id: number
    nickname: string
    card: string
    role?: string
  }
  raw_message: string
  font: number
  sub_type: string
  message: Array<{
    type: string
    data: Record<string, any>
  }>
  message_format: string
  post_type: string
  group_id: number
  group_name: string
}

/**
 * 检查消息是否为合并转发消息
 */
function isForwardMessage(msgObj: any): boolean {
  const message = msgObj?.data?.message || msgObj?.message
  if (!Array.isArray(message)) return false
  if (message.length !== 1) return false
  return message[0]?.type === 'forward'
}

/**
 * 获取合并转发消息的内容
 */
function getForwardContent(msgObj: any): ForwardContentItem[] | null {
  const message = msgObj?.data?.message || msgObj?.message
  if (!isForwardMessage(msgObj)) return null
  return message[0]?.data?.content || null
}

/**
 * 解析消息元素为可显示的文本/HTML（支持嵌套转发）
 * @param element 消息元素
 * @param currentDepth 当前嵌套深度
 * @param maxDepth 最大嵌套深度
 */
function parseMessageElement(
  element: { type: string; data: Record<string, any> },
  currentDepth: number,
  maxDepth: number
): string {
  switch (element.type) {
    case 'text':
      // 转义HTML并将换行符转换为<br>
      return escapeHtml(element.data.text || '').replace(/\n/g, '<br>')
    case 'image':
      const imgUrl = element.data.url || ''
      const summary = element.data.summary || '[图片]'
      return `<div class="msg-image"><img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(summary)}" /><span class="img-label">${escapeHtml(summary)}</span></div>`
    case 'face':
      return `<span class="msg-face">[表情:${element.data.id || '?'}]</span>`
    case 'at':
      return `<span class="msg-at">@${element.data.qq || element.data.id || '?'}</span>`
    case 'reply':
      return `<span class="msg-reply">[回复]</span>`
    case 'forward':
      // 处理嵌套合并转发
      if (currentDepth >= maxDepth) {
        const nestedCount = element.data.content?.length || '?'
        return `<span class="msg-forward-collapsed">[合并转发: ${nestedCount}条消息，已达最大嵌套深度]</span>`
      }
      // 递归渲染嵌套的合并转发
      const nestedContent = element.data.content as ForwardContentItem[] | undefined
      if (nestedContent && nestedContent.length > 0) {
        return generateNestedForwardHtml(nestedContent, currentDepth + 1, maxDepth)
      }
      return `<span class="msg-forward">[合并转发]</span>`
    default:
      return `<span class="msg-unknown">[${element.type}]</span>`
  }
}

/**
 * 转义HTML特殊字符
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * 格式化时间戳
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * 生成嵌套转发的HTML
 */
function generateNestedForwardHtml(
  content: ForwardContentItem[],
  currentDepth: number,
  maxDepth: number
): string {
  const nestedMessagesHtml = content.map((item, index) => {
    const senderName = item.sender.card || item.sender.nickname || String(item.sender.user_id)
    const timeStr = formatTimestamp(item.time)
    
    // 解析消息内容（传递深度参数）
    const contentHtml = item.message
      .map(el => parseMessageElement(el, currentDepth, maxDepth))
      .join('')

    return `
      <div class="nested-message-item">
        <div class="nested-message-header">
          <span class="nested-sender-name">${escapeHtml(senderName)}</span>
          <span class="nested-message-time">${timeStr}</span>
        </div>
        <div class="nested-message-content">
          ${contentHtml}
        </div>
      </div>
    `
  }).join('')

  return `
    <div class="nested-forward" data-depth="${currentDepth}">
      <div class="nested-forward-header">
        📨 嵌套合并转发 (${content.length}条消息, 深度:${currentDepth})
      </div>
      <div class="nested-forward-content">
        ${nestedMessagesHtml}
      </div>
    </div>
  `
}

/**
 * 生成单条消息的HTML（支持嵌套）
 */
function generateMessageItemHtml(
  item: ForwardContentItem,
  index: number,
  maxDepth: number
): string {
  const senderName = item.sender.card || item.sender.nickname || String(item.sender.user_id)
  const timeStr = formatTimestamp(item.time)
  
  // 解析消息内容（从深度1开始，因为顶层是深度0）
  const contentHtml = item.message
    .map(el => parseMessageElement(el, 1, maxDepth))
    .join('')

  return `
    <div class="message-item">
      <div class="message-header">
        <span class="message-index">#${index + 1}</span>
        <span class="sender-name">${escapeHtml(senderName)}</span>
        <span class="sender-id">(${item.sender.user_id})</span>
        <span class="message-time">${timeStr}</span>
      </div>
      <div class="message-content">
        ${contentHtml}
      </div>
    </div>
  `
}

/**
 * 生成完整的HTML模板（支持嵌套）
 */
function generateForwardHtmlTemplate(
  content: ForwardContentItem[],
  forwardId: string,
  maxDepth: number,
  themeColors: Config['theme']
): string {
  // 使用配置的颜色，如果没有则使用默认值
  const colors = {
    bg: themeColors?.bg || '#ffecd2',
    cardBg: themeColors?.cardBg || '#ffffff',
    cardBorder: themeColors?.cardBorder || '#ffb6c1',
    cardShadow: themeColors?.cardShadow || '#ff6987',
    mainText: themeColors?.mainText || '#4a4a4a',
    subText: themeColors?.subText || '#888888',
    titleColor: themeColors?.titleColor || '#e91e63',
    headerBg: themeColors?.headerBg || '#f06292',
    messageBg: themeColors?.messageBg || '#fff5f8',
    messageBorder: themeColors?.messageBorder || '#fce4ec',
    senderColor: themeColors?.senderColor || '#d81b60',
    timeColor: themeColors?.timeColor || '#b0a0a8',
    atColor: themeColors?.atColor || '#ec407a',
    faceColor: themeColors?.faceColor || '#ff7043',
    imageLabel: themeColors?.imageLabel || '#ad8b9e',
    nestedBg: themeColors?.nestedBg || '#fce4ec',
    nestedBorder: themeColors?.nestedBorder || '#f8bbd9',
    nestedHeaderBg: themeColors?.nestedHeaderBg || '#f06292',
  }

  const messagesHtml = content.map((item, index) => generateMessageItemHtml(item, index, maxDepth)).join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
          margin: 0;
          padding: 20px;
          background: ${colors.bg};
          min-height: 100vh;
        }
        .card {
          max-width: 600px;
          margin: 0 auto;
          border-radius: 16px;
          overflow: hidden;
          background: ${colors.cardBg};
          border: 1px solid ${colors.cardBorder};
          box-shadow: 0 20px 40px ${colors.cardShadow};
        }
        .header {
          background: ${colors.headerBg};
          color: white;
          padding: 20px;
          text-align: center;
        }
        .title {
          font-size: 1.5em;
          font-weight: 700;
          margin-bottom: 12px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header-info {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          padding: 10px 20px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .subtitle {
          font-size: 0.95em;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        .forward-id {
          font-size: 0.7em;
          opacity: 0.85;
          font-family: 'Consolas', 'Monaco', monospace;
          background: rgba(0, 0, 0, 0.15);
          padding: 3px 10px;
          border-radius: 6px;
        }
        .messages-container {
          padding: 15px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .message-item {
          background: ${colors.messageBg};
          border: 1px solid ${colors.messageBorder};
          border-radius: 12px;
          padding: 12px 15px;
        }
        .message-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }
        .message-index {
          background: ${colors.titleColor};
          color: white;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 0.8em;
          font-weight: 600;
        }
        .sender-name {
          color: ${colors.senderColor};
          font-weight: 600;
          font-size: 0.95em;
        }
        .sender-id {
          color: ${colors.subText};
          font-size: 0.8em;
        }
        .message-time {
          color: ${colors.timeColor};
          font-size: 0.8em;
          margin-left: auto;
        }
        .message-content {
          color: ${colors.mainText};
          font-size: 0.95em;
          line-height: 1.6;
          word-wrap: break-word;
        }
        .msg-image {
          margin: 8px 0;
        }
        .msg-image img {
          max-width: 100%;
          max-height: 300px;
          border-radius: 8px;
          display: block;
        }
        .msg-image .img-label {
          display: block;
          color: ${colors.imageLabel};
          font-size: 0.8em;
          margin-top: 4px;
        }
        .msg-at {
          color: ${colors.atColor};
          font-weight: 500;
        }
        .msg-face {
          color: ${colors.faceColor};
        }
        .msg-reply, .msg-forward, .msg-unknown {
          color: ${colors.subText};
          font-style: italic;
        }
        .msg-forward-collapsed {
          color: #d81b60;
          font-style: italic;
          background: #fce4ec;
          padding: 4px 8px;
          border-radius: 4px;
          display: inline-block;
        }
        /* 嵌套转发样式 */
        .nested-forward {
          margin: 10px 0;
          border-radius: 10px;
          overflow: hidden;
          border: 2px solid ${colors.nestedBorder};
          background: ${colors.nestedBg};
        }
        .nested-forward[data-depth="2"] {
          background: #fff8e1;
          border-color: #ffcc80;
        }
        .nested-forward[data-depth="3"] {
          background: #e8f5e9;
          border-color: #a5d6a7;
        }
        .nested-forward-header {
          background: ${colors.nestedHeaderBg};
          color: white;
          padding: 8px 12px;
          font-size: 0.85em;
          font-weight: 600;
        }
        .nested-forward[data-depth="2"] .nested-forward-header {
          background: #ffb74d;
        }
        .nested-forward[data-depth="3"] .nested-forward-header {
          background: #81c784;
        }
        .nested-forward-content {
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .nested-message-item {
          background: rgba(255, 255, 255, 0.8);
          border-radius: 8px;
          padding: 8px 12px;
          border: 1px solid rgba(0, 0, 0, 0.08);
        }
        .nested-message-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 5px;
          flex-wrap: wrap;
        }
        .nested-sender-name {
          color: ${colors.senderColor};
          font-weight: 600;
          font-size: 0.85em;
        }
        .nested-message-time {
          color: ${colors.timeColor};
          font-size: 0.75em;
          margin-left: auto;
        }
        .nested-message-content {
          color: ${colors.mainText};
          font-size: 0.9em;
          line-height: 1.5;
        }
        .footer {
          text-align: center;
          padding: 15px;
          color: ${colors.subText};
          font-size: 0.8em;
          border-top: 1px solid ${colors.messageBorder};
        }
        .stats {
          display: flex;
          justify-content: center;
          gap: 20px;
          padding: 10px 15px;
          background: #f1f3f4;
          font-size: 0.85em;
          color: ${colors.subText};
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="title">📨 合并转发消息</div>
          <div class="header-info">
            <div class="subtitle">共 ${content.length} 条消息</div>
            <div class="forward-id">ID: ${escapeHtml(forwardId)}</div>
          </div>
        </div>
        <div class="stats">
          <span>📅 渲染时间: ${new Date().toLocaleString('zh-CN')}</span>
          <span>🔄 最大嵌套: ${maxDepth}层</span>
        </div>
        <div class="messages-container">
          ${messagesHtml}
        </div>
        <div class="footer">
          Generated by koishi-plugin-quote-debug-msg-json-image
        </div>
      </div>
    </body>
    </html>
  `
}

export function registerRenderForwardCommand(ctx: Context, cfg: Config) {
  const commandName = cfg.renderForwardCommandName || 'render-forward'
  ctx.command(commandName, "渲染合并转发消息为图片")
    .action(async ({ session }) => {

      if (!session.quote) {
        await session.send(`${h.quote(session.messageId)}请回复一条合并转发消息来使用此命令`)
        return
      }

      try {
        // 获取被引用的消息
        const msgObj = session.platform === 'onebot' && cfg.useNapcatGetMsgInsteadOnOnebot
          ? await session.bot.internal._request('get_msg', { message_id: session.quote.messageId })
          : await session.bot.getMessage(session.channelId, session.quote.messageId)

        // 检查是否为合并转发消息
        if (!isForwardMessage(msgObj)) {
          await session.send('该消息不是合并转发消息，无法渲染。\n提示：合并转发消息的 message 数组中应有且仅有一个 type 为 "forward" 的元素。')
          return
        }

        // 获取转发内容
        const forwardContent = getForwardContent(msgObj)
        if (!forwardContent || forwardContent.length === 0) {
          await session.send('无法获取合并转发消息的内容，可能是消息格式不支持。')
          return
        }

        // 获取转发消息ID
        const message = msgObj?.data?.message || msgObj?.message
        const forwardId = message[0]?.data?.id || 'unknown'

        // 获取最大嵌套深度配置
        const maxDepth = cfg.maxForwardNestDepth ?? 3

        // 检查 puppeteer 服务
        if (!ctx.puppeteer) {
          await session.send('Puppeteer 服务不可用。请确保已安装 koishi-plugin-puppeteer 插件。')
          return
        }

        // 发送提示消息
        const hintMsgIds = await session.send(`${h.quote(session.messageId)}正在渲染合并转发消息（共 ${forwardContent.length} 条，最大嵌套 ${maxDepth} 层），请稍候...`)

        // 使用 puppeteer 渲染
        const page = await ctx.puppeteer.page()
        try {
          const htmlContent = generateForwardHtmlTemplate(forwardContent, forwardId, maxDepth, cfg.theme)

          await page.setViewport({ width: 650, height: 1 })
          await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 30000 })

          // 等待图片加载
          await page.evaluate(() => {
            return Promise.all(
              Array.from(document.images)
                .filter(img => !img.complete)
                .map(img => new Promise(resolve => {
                  img.onload = img.onerror = resolve
                }))
            )
          })

          const cardElement = await page.$('.card')
          const boundingBox = await cardElement?.boundingBox()

          if (!boundingBox) {
            throw new Error('无法获取卡片元素的边界框')
          }

          const screenshot = await page.screenshot({
            type: 'png',
            encoding: 'base64',
            clip: {
              x: boundingBox.x,
              y: boundingBox.y,
              width: boundingBox.width,
              height: Math.min(boundingBox.height, 8000) // 限制最大高度
            }
          })

          // 删除提示消息
          try {
            await session.bot.deleteMessage(session.channelId, hintMsgIds[0])
          } catch (e) {
            // 忽略删除失败
          }

          // 发送渲染结果
          await session.send([
            h.quote(session.messageId),
            h.text(`合并转发消息渲染完成（共 ${forwardContent.length} 条消息）：\n`),
            h.image(`data:image/png;base64,${screenshot}`)
          ])

        } finally {
          await page.close()
        }

      } catch (err) {
        const errmsg = `[render_forward] 渲染合并转发消息失败：${err}`
        ctx.logger.error(errmsg)
        await session.send(errmsg)
      }

    })
}
