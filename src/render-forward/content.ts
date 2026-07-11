import { getAvatarUrl } from './assets'
import type { AvatarMap, ForwardContentItem, ForwardMessageElement } from './model'

/** 转义HTML特殊字符 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

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

function parseMessageElement(
  element: ForwardMessageElement,
  currentDepth: number,
  maxDepth: number,
  avatarMap: AvatarMap | null = null,
): string {
  switch (element.type) {
    case 'text':
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
      if (currentDepth >= maxDepth) {
        const nestedCount = element.data.content?.length || '?'
        return `<span class="msg-forward-collapsed">[合并转发: ${nestedCount}条消息，已达最大嵌套深度]</span>`
      }
      const nestedContent = element.data.content as ForwardContentItem[] | undefined
      if (nestedContent && nestedContent.length > 0) {
        return generateNestedForwardHtml(nestedContent, currentDepth + 1, maxDepth, avatarMap)
      }
      return '<span class="msg-forward">[合并转发]</span>'
    default:
      return `<span class="msg-unknown">[${element.type}]</span>`
  }
}

function generateNestedForwardHtml(
  content: ForwardContentItem[],
  currentDepth: number,
  maxDepth: number,
  avatarMap: AvatarMap | null,
): string {
  const nestedMessagesHtml = content.map((item) => {
    const senderName = item.sender.card || item.sender.nickname || String(item.sender.user_id)
    const timeStr = formatTimestamp(item.time)
    const avatarUrl = getAvatarUrl(item.sender.user_id, avatarMap)

    const contentHtml = item.message
      .map(el => parseMessageElement(el, currentDepth, maxDepth, avatarMap))
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

/** 生成单条消息的HTML（支持嵌套） */
export function generateMessageItemHtml(
  item: ForwardContentItem,
  index: number,
  maxDepth: number,
  avatarMap: AvatarMap | null,
): string {
  const senderName = item.sender.card || item.sender.nickname || String(item.sender.user_id)
  const timeStr = formatTimestamp(item.time)
  const avatarUrl = getAvatarUrl(item.sender.user_id, avatarMap)

  const contentHtml = item.message
    .map(el => parseMessageElement(el, 1, maxDepth, avatarMap))
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
