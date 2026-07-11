/** QQ用户ID到头像base64的映射 */
export type AvatarMap = Map<number, string>

export interface ForwardMessageElement {
  type: string
  data: Record<string, any>
}

/** 合并转发消息的内容项类型 */
export interface ForwardContentItem {
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
  message: ForwardMessageElement[]
  message_format: string
  post_type: string
  group_id: number
  group_name: string
}

export type ForwardRenderStyle = 'source' | 'lxgw'

export function getForwardMessageElements(msgObj: any): any {
  return msgObj?.data?.message || msgObj?.message
}

/** 检查消息是否为合并转发消息 */
export function isForwardMessage(msgObj: any): boolean {
  const message = getForwardMessageElements(msgObj)
  if (!Array.isArray(message)) return false
  if (message.length !== 1) return false
  return message[0]?.type === 'forward'
}

/** 获取合并转发消息的内容 */
export function getForwardContent(msgObj: any): ForwardContentItem[] | null {
  const message = getForwardMessageElements(msgObj)
  if (!isForwardMessage(msgObj)) return null
  return message[0]?.data?.content || null
}

/** 递归收集所有用户ID（用于去重预获取头像） */
export function collectAllUserIds(
  content: ForwardContentItem[],
  maxDepth: number,
  currentDepth: number = 1,
): Set<number> {
  const userIds = new Set<number>()

  for (const item of content) {
    if (item.sender?.user_id) {
      userIds.add(item.sender.user_id)
    }

    if (currentDepth < maxDepth) {
      for (const el of item.message) {
        if (el.type === 'forward' && el.data?.content) {
          const nestedIds = collectAllUserIds(el.data.content, maxDepth, currentDepth + 1)
          nestedIds.forEach(id => userIds.add(id))
        }
      }
    }
  }

  return userIds
}
