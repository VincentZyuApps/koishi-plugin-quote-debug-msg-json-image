import { Context, h } from 'koishi'
import { readFile } from 'fs/promises'
import path from 'path'
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

type ForwardRenderStyle = 'source' | 'lxgw'

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
      const replyId = element.data.id || '?'
      return `<span class="msg-reply">↩️ 回复 #${replyId}</span>`
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
    const avatarUrl = `https://q1.qlogo.cn/g?b=qq&nk=${item.sender.user_id}&s=640`
    
    // 解析消息内容（传递深度参数）
    const contentHtml = item.message
      .map(el => parseMessageElement(el, currentDepth, maxDepth))
      .join('')

    return `
      <div class="nested-message-item">
        <div class="nested-message-avatar">
          <img src="${avatarUrl}" alt="avatar" />
        </div>
        <div class="nested-message-main">
          <div class="nested-message-header">
            <span class="nested-sender-name">${escapeHtml(senderName)}</span>
            <span class="nested-message-time">${timeStr}</span>
          </div>
          <div class="nested-message-content">
            ${contentHtml}
          </div>
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
  const avatarUrl = `https://q1.qlogo.cn/g?b=qq&nk=${item.sender.user_id}&s=640`
  
  // 解析消息内容（从深度1开始，因为顶层是深度0）
  const contentHtml = item.message
    .map(el => parseMessageElement(el, 1, maxDepth))
    .join('')

  return `
    <div class="message-item">
      <div class="message-avatar">
        <img src="${avatarUrl}" alt="avatar" />
      </div>
      <div class="message-main">
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
    </div>
  `
}

/**
 * 生成完整的HTML模板（支持嵌套）
 */
function getForwardRenderStyleFromIndex(index: number | undefined, fallback: ForwardRenderStyle): ForwardRenderStyle {
  if (index === 0) return 'source'
  if (index === 1) return 'lxgw'
  return fallback
}

function generateForwardHtmlTemplate(
  content: ForwardContentItem[],
  forwardId: string,
  maxDepth: number,
  style: ForwardRenderStyle,
  fontFaceCss: string,
  backgroundImageUrl: string | null,
  maxImageSize: number
): string {
  // lxgw 样式使用的颜色配置
  const lxgwColors = {
    bg: '#eef2f7',
    cardBg: '#ffffff',
    mainText: '#2b2f36',
    subText: '#6b7280',
    titleColor: '#1f4b99',
    messageBorder: 'rgba(255,255,255,0.8)',
    senderColor: '#1f2937',
    timeColor: '#9aa4b2',
    atColor: '#2563eb',
    faceColor: '#f97316',
    imageLabel: '#64748b',
  }

  const messagesHtml = content.map((item, index) => generateMessageItemHtml(item, index, maxDepth)).join('')
  const timestamp = new Date().toLocaleString('zh-CN')

  // 基础 CSS（通用结构样式）
  const baseCss = `
    *{box-sizing:border-box;margin:0;padding:0;}
    body{margin:0;padding:0;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;}
    #content-wrapper{display:flex;justify-content:center;}
    .card{width:920px;border-radius:32px;position:relative;z-index:2;display:flex;flex-direction:column;overflow:hidden;}
    .header{padding:28px 40px;display:flex;flex-direction:column;gap:14px;text-align:center;border-radius:32px 32px 0 0;}
    .title{font-size:36px;font-weight:800;letter-spacing:.5px;}
    .header-info{display:inline-flex;flex-direction:column;align-items:center;gap:8px;padding:14px 28px;border-radius:20px;}
    .subtitle{font-size:16px;font-weight:700;}
    .forward-id{font-size:13px;font-family:'Consolas','Monaco',monospace;padding:6px 14px;border-radius:10px;}
    .stats{display:flex;justify-content:center;gap:24px;padding:12px 20px;font-size:13px;font-weight:600;}
    .messages-container{padding:20px 28px;display:flex;flex-direction:column;gap:15px;}
    .message-item{border-radius:10px;padding:7px 9px;display:flex;gap:14px;transition:all .3s cubic-bezier(.25,.8,.25,1);}
    .message-avatar{width:60px;height:60px;border-radius:50%;overflow:hidden;flex-shrink:0;}
    .message-avatar img{width:100%;height:100%;object-fit:cover;display:block;}
    .message-main{flex:1;min-width:0;}
    .message-header{display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap;}
    .message-index{padding:4px 12px;border-radius:999px;font-size:13px;font-weight:700;}
    .sender-name{font-weight:800;font-size:16px;}
    .sender-id{font-size:13px;font-weight:600;}
    .message-time{font-size:13px;margin-left:auto;font-weight:500;}
    .message-content{font-size:16px;line-height:1.4;word-wrap:break-word;font-weight:bold;}
    .msg-image{margin:10px 0;}
    .msg-image img{max-width:${maxImageSize}px;max-height:${maxImageSize}px;border-radius:12px;display:block;box-shadow:0 8px 20px rgba(0,0,0,.2);object-fit:contain;}
    .msg-image .img-label{display:block;font-size:13px;margin-top:6px;}
    .msg-at{font-weight:700;}
    .msg-face{font-weight:600;}
    .msg-reply{display:inline-block;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:600;margin-bottom:4px;}
    .msg-forward,.msg-unknown{font-style:italic;}
    .msg-forward-collapsed{font-style:italic;padding:6px 12px;border-radius:10px;display:inline-block;}
    .nested-forward{margin:12px 0;border-radius:12px;overflow:hidden;border:1px solid;}
    .nested-forward-header{padding:10px 16px;font-size:13px;font-weight:700;}
    .nested-forward-content{padding:12px;display:flex;flex-direction:column;gap:10px;}
    .nested-message-item{border-radius:10px;padding:10px 14px;display:flex;gap:12px;}
    .nested-message-avatar{width:40px;height:40px;border-radius:50%;overflow:hidden;flex-shrink:0;}
    .nested-message-avatar img{width:100%;height:100%;object-fit:cover;display:block;}
    .nested-message-main{flex:1;min-width:0;}
    .nested-message-header{display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap;}
    .nested-sender-name{font-weight:700;font-size:13px;}
    .nested-message-time{font-size:12px;margin-left:auto;}
    .nested-message-content{font-size:14px;line-height:1.5;}
    .footer{text-align:center;padding:18px;font-size:13px;border-radius:0 0 32px 32px;}
    .timestamp-watermark{position:fixed;top:1.3px;left:1.3px;font-size:13px;color:rgba(128,128,128,.6);font-family:'Courier New',monospace;z-index:9999;pointer-events:none;text-shadow:0 0 2px rgba(255,255,255,.8);}
  `

  // Source 样式 - 完全仿照 renderUserInfo.ts 的毛玻璃效果
  const sourceCss = `
    body{
      font-family:'RenderForwardFont','Source Han Serif SC','Noto Serif SC','Songti SC','STSong',-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol";
      ${backgroundImageUrl ? `background-image:url('${backgroundImageUrl}');` : 'background-color:#f0f2f5;'}
      background-size:cover;
      background-position:center center;
      background-repeat:no-repeat;
    }
    #content-wrapper{
      padding:28px 28px 28px 28px;
    }
    .card{
      background:rgba(255,255,255,.13);
      backdrop-filter:blur(13px) saturate(130%);
      -webkit-backdrop-filter:blur(13px) saturate(130%);
      border-radius:32px;
      box-shadow:0 16px 48px rgba(0,0,0,.3),0 0 0 1px rgba(255,255,255,.25),inset 0 2px 0 rgba(255,255,255,.4);
      padding:0;
      border:1px solid rgba(255,255,255,.3);
      color:#212121;
    }
    .header{
      background:rgba(255,255,255,.25);
      border-bottom:1px solid rgba(255,255,255,.3);
    }
    .title{
      color:#111;
      text-shadow:0 3px 6px rgba(255,255,255,.7);
      background:rgba(255,255,255,.25);
      padding:14px 28px;
      border-radius:20px;
      border:1px solid rgba(255,255,255,.5);
      display:inline-block;
    }
    .header-info{
      background:rgba(255,255,255,.4);
      border:1px solid rgba(255,255,255,.6);
    }
    .subtitle{
      color:#333;
      text-shadow:0 1px 3px rgba(255,255,255,.9);
    }
    .forward-id{
      background:rgba(255,255,255,.6);
      color:#555;
      border:1px solid rgba(255,255,255,.6);
      font-weight:600;
      text-shadow:0 1px 2px rgba(255,255,255,.8);
    }
    .stats{
      background:rgba(255,255,255,.2);
      color:#555;
      border-bottom:1px solid rgba(255,255,255,.3);
      text-shadow:0 1px 2px rgba(255,255,255,.8);
    }
    .message-item{
      background:rgba(255,255,255,.5);
      border:1px solid rgba(255,255,255,.8);
      box-shadow:3px 3px 9px rgba(0,0,0,0.3);
    }
    .message-avatar{
      border:2px solid rgba(255,255,255,.7);
      box-shadow:0 6px 16px rgba(0,0,0,.25);
    }
    .message-index{
      background:rgba(255,255,255,.55);
      color:#111;
      border:1px solid rgba(255,255,255,.7);
      text-shadow:0 1px 2px rgba(255,255,255,.8);
    }
    .sender-name{
      color:#111;
      text-shadow:0 1px 2px rgba(255,255,255,.8);
    }
    .sender-id{
      color:#555;
      background:rgba(255,255,255,.4);
      padding:4px 10px;
      border-radius:8px;
      border:1px solid rgba(255,255,255,.6);
      text-shadow:0 1px 2px rgba(255,255,255,.8);
    }
    .message-time{
      color:#555;
      text-shadow:0 1px 2px rgba(255,255,255,.8);
    }
    .message-content{
      color:#212121;
      text-shadow:0 1px 2px rgba(255,255,255,.8);
    }
    .msg-at{color:#007bff;}
    .msg-face{color:#ff7043;}
    .msg-reply{background:rgba(255,255,255,.4);color:#555;border:1px solid rgba(255,255,255,.6);border-left:3px solid #007bff;}
    .msg-forward,.msg-unknown{color:#777;}
    .msg-forward-collapsed{
      color:#333;
      background:rgba(255,255,255,.5);
      border:1px solid rgba(255,255,255,.6);
    }
    .msg-image .img-label{color:#666;text-shadow:0 1px 2px rgba(255,255,255,.8);}
    .nested-forward{
      border-color:rgba(255,255,255,.6);
      background:rgba(255,255,255,.2);
      box-shadow:inset 0 2px 8px rgba(0,0,0,.1);
    }
    .nested-forward-header{
      background:rgba(255,255,255,.4);
      color:#111;
      border-bottom:1px solid rgba(255,255,255,.5);
      text-shadow:0 1px 2px rgba(255,255,255,.8);
    }
    .nested-message-item{
      background:rgba(255,255,255,.5);
      border:1px solid rgba(255,255,255,.7);
      box-shadow:2px 2px 6px rgba(0,0,0,.2);
    }
    .nested-message-avatar{
      border:3px solid rgba(255,255,255,.7);
      box-shadow:0 6px 16px rgba(0,0,0,.2);
    }
    .nested-sender-name{
      color:#111;
      text-shadow:0 1px 2px rgba(255,255,255,.8);
    }
    .nested-message-time{
      color:#666;
      text-shadow:0 1px 2px rgba(255,255,255,.8);
    }
    .nested-message-content{
      color:#212121;
      text-shadow:0 1px 2px rgba(255,255,255,.8);
    }
    .footer{
      color:#666;
      border-top:1px solid rgba(255,255,255,.3);
      background:rgba(255,255,255,.2);
      text-shadow:0 1px 2px rgba(255,255,255,.8);
    }
  `

  const lxgwCss = `
    body {
      font-family: 'RenderForwardFont','LXGW WenKai','LXGW WenKai Screen','LXGW WenKai Mono','Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif;
      background: ${lxgwColors.bg};
    }
    #content-wrapper{
      padding:28px;
    }
    .card {
      background: ${lxgwColors.cardBg};
      border: 1px solid ${lxgwColors.messageBorder};
      box-shadow: 0 12px 32px rgba(15,23,42,0.12);
    }
    .header {
      color: ${lxgwColors.titleColor};
      background: linear-gradient(180deg, rgba(37,99,235,0.08), rgba(37,99,235,0.02));
    }
    .header-info {
      background: rgba(255,255,255,0.8);
      border: 1px solid ${lxgwColors.messageBorder};
      color: ${lxgwColors.subText};
    }
    .forward-id { background: rgba(148,163,184,0.15); color: ${lxgwColors.subText}; }
    .stats { background: #f8fafc; color: ${lxgwColors.subText}; border-top: 1px solid ${lxgwColors.messageBorder}; border-bottom: 1px solid ${lxgwColors.messageBorder}; }
    .message-item {
      background: #ffffff;
      border: 1px solid ${lxgwColors.messageBorder};
    }
    .message-index { background: rgba(37,99,235,0.12); color: ${lxgwColors.titleColor}; }
    .sender-name { color: ${lxgwColors.senderColor}; }
    .sender-id { color: ${lxgwColors.subText}; }
    .message-time { color: ${lxgwColors.timeColor}; }
    .message-content { color: ${lxgwColors.mainText}; }
    .msg-at { color: ${lxgwColors.atColor}; }
    .msg-face { color: ${lxgwColors.faceColor}; }
    .msg-reply { background: rgba(37,99,235,0.08); color: ${lxgwColors.titleColor}; border: 1px solid rgba(37,99,235,0.2); border-left: 3px solid ${lxgwColors.atColor}; }
    .msg-forward, .msg-unknown { color: ${lxgwColors.subText}; }
    .msg-forward-collapsed { color: ${lxgwColors.titleColor}; background: rgba(37,99,235,0.08); }
    .msg-image .img-label { color: ${lxgwColors.imageLabel}; }
    .nested-forward { border-color: ${lxgwColors.messageBorder}; background: rgba(248,250,252,0.9); }
    .nested-forward-header { background: rgba(37,99,235,0.12); color: ${lxgwColors.titleColor}; }
    .nested-message-item { background: #fff; }
    .nested-sender-name { color: ${lxgwColors.senderColor}; }
    .nested-message-time { color: ${lxgwColors.timeColor}; }
    .nested-message-content { color: ${lxgwColors.mainText}; }
    .footer { color: ${lxgwColors.subText}; border-top: 1px solid ${lxgwColors.messageBorder}; }
  `

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        ${fontFaceCss}
        ${baseCss}
        ${style === 'source' ? sourceCss : lxgwCss}
      </style>
    </head>
    <body>
      <div id="content-wrapper">
        <div class="card">
          <div class="header">
            <div class="title">📨 合并转发消息</div>
            <div class="header-info">
              <div class="subtitle">共 ${content.length} 条消息</div>
              <div class="forward-id">ID: ${escapeHtml(forwardId)}</div>
            </div>
          </div>
          <div class="stats">
            <span>📅 渲染时间: ${timestamp}</span>
            <span>🔄 最大嵌套: ${maxDepth}层</span>
          </div>
          <div class="messages-container">
            ${messagesHtml}
          </div>
          <div class="footer">
            Generated by koishi-plugin-quote-debug-msg-json-image
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

function getFontCssMeta(filePath: string): { mime: string; format: string } {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.otf') return { mime: 'font/otf', format: 'opentype' }
  return { mime: 'font/ttf', format: 'truetype' }
}

async function loadFontFaceCss(filePath: string, fontFamily: string): Promise<string> {
  if (!filePath) return ''
  try {
    const fileBuffer = await readFile(filePath)
    const base64 = fileBuffer.toString('base64')
    const meta = getFontCssMeta(filePath)
    return `@font-face{font-family:'${fontFamily}';src:url('data:${meta.mime};base64,${base64}') format('${meta.format}');font-weight:normal;font-style:normal;font-display:swap;}`
  } catch {
    return ''
  }
}

function getForwardAvatarUrl(content: ForwardContentItem[]): string | null {
  const first = content?.[0]
  if (!first?.sender?.user_id) return null
  const uid = String(first.sender.user_id)
  return `https://q1.qlogo.cn/g?b=qq&nk=${uid}&s=640`
}

export function registerRenderForwardCommand(ctx: Context, cfg: Config) {
  const commandName = cfg.renderForwardCommandName || 'render-forward'
  ctx.command(commandName, "渲染合并转发消息为图片")
    .option('index', '-i, --index <index:number> 图片样式索引 (0: Source Han Serif, 1: LXGW WenKai)')
    .action(async ({ session, options }) => {

      if (!session.quote) {
        const hint = '请回复一条合并转发消息来使用此命令'
        await session.send(cfg.enableQuote ? [h.quote(session.messageId), hint] : hint)
        return
      }

      try {
        // 获取被引用的消息
        const msgObj = session.platform === 'onebot' && cfg.useNapcatGetMsgInsteadOnOnebot
          ? await session.bot.internal._request('get_msg', { message_id: session.quote.messageId })
          : await session.bot.getMessage(session.channelId, session.quote.messageId)

        // 检查是否为合并转发消息
        if (!isForwardMessage(msgObj)) {
          const hint = '该消息不是合并转发消息，无法渲染。\n提示：合并转发消息的 message 数组中应有且仅有一个 type 为 "forward" 的元素。'
          await session.send(cfg.enableQuote ? [h.quote(session.messageId), hint] : hint)
          return
        }

        // 获取转发内容
        const forwardContent = getForwardContent(msgObj)
        if (!forwardContent || forwardContent.length === 0) {
          const hint = '无法获取合并转发消息的内容，可能是消息格式不支持。'
          await session.send(cfg.enableQuote ? [h.quote(session.messageId), hint] : hint)
          return
        }

        // 获取转发消息ID
        const message = msgObj?.data?.message || msgObj?.message
        const forwardId = message[0]?.data?.id || 'unknown'

        // 获取最大嵌套深度配置
        const maxDepth = cfg.maxForwardNestDepth ?? 3

        const defaultStyle = cfg.renderForwardDefaultStyle ?? 'source'
        const styleIndex = typeof options.index === 'number' ? options.index : Number(options.index)
        const renderStyle = getForwardRenderStyleFromIndex(
          Number.isFinite(styleIndex) ? styleIndex : undefined,
          defaultStyle
        )

        const fontFamily = 'RenderForwardFont'
        const fontPath = renderStyle === 'source'
          ? cfg.renderForwardSourceFontPath
          : cfg.renderForwardLxgwFontPath
        const fontFaceCss = await loadFontFaceCss(fontPath, fontFamily)
        const backgroundImageUrl = renderStyle === 'source' ? getForwardAvatarUrl(forwardContent) : null

        // 检查 puppeteer 服务
        if (!ctx.puppeteer) {
          const hint = 'Puppeteer 服务不可用。请确保已安装 koishi-plugin-puppeteer 插件。'
          await session.send(cfg.enableQuote ? [h.quote(session.messageId), hint] : hint)
          return
        }

        // 发送提示消息
        const loadingHint = `正在渲染合并转发消息（共 ${forwardContent.length} 条，最大嵌套 ${maxDepth} 层），请稍候...`
        const hintMsgIds = await session.send(cfg.enableQuote ? [h.quote(session.messageId), loadingHint] : loadingHint)

        // 使用 puppeteer 渲染
        const page = await ctx.puppeteer.page()
        try {
          const maxImageSize = cfg.renderForwardMaxImageSize ?? 50
          const htmlContent = generateForwardHtmlTemplate(
            forwardContent,
            forwardId,
            maxDepth,
            renderStyle,
            fontFaceCss,
            backgroundImageUrl,
            maxImageSize
          )

          await page.setViewport({ width: 980, height: 9999 })
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

          const wrapper = await page.$('#content-wrapper') || await page.$('.card') || await page.$('body')
          if (!wrapper) throw new Error('无法获取渲染容器')

          const screenshot = await wrapper.screenshot({
            type: 'png',
            encoding: 'base64'
          })

          // 删除提示消息
          try {
            await session.bot.deleteMessage(session.channelId, hintMsgIds[0])
          } catch (e) {
            // 忽略删除失败
          }

          // 发送渲染结果
          const resultElements = [
            h.text(`合并转发消息渲染完成（共 ${forwardContent.length} 条消息，样式: ${renderStyle}）：\n`),
            h.image(`data:image/png;base64,${screenshot}`)
          ]
          await session.send(cfg.enableQuote ? [h.quote(session.messageId), ...resultElements] : resultElements)

        } finally {
          await page.close()
        }

      } catch (err) {
        const errmsg = `[render_forward] 渲染合并转发消息失败：${err}`
        ctx.logger.error(errmsg)
        await session.send(cfg.enableQuote ? [h.quote(session.messageId), errmsg] : errmsg)
      }

    })
}
