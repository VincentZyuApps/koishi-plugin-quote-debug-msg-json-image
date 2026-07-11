import type { Context, Session } from 'koishi'

const QQ_MSG_TYPE_QUOTE = 103
const MAX_CACHE_SIZE = 300
const QQ_PASSIVE_MESSAGE_TIMEOUT = 5 * 60 * 1000 - 2000
const QQ_MARKDOWN_RENDER_HINT = '> 如果你看到这行变灰色，说明markdown格式生效'

const qqMsgCache = new Map<string, any>()
const qqMsgIdToRefIdxCache = new Map<string, string>()
const qqRefIdxToMsgIdCache = new Map<string, string>()

function getQQRawEvent(session: Session): any | null {
  return (session as any).qq?.d ?? null
}

function parseQQMessageIndices(d: any): { msgIdx?: string; refMsgIdx?: string } {
  let msgIdx: string | undefined
  let refMsgIdx: string | undefined

  if (Array.isArray(d?.message_scene?.ext)) {
    for (const ext of d.message_scene.ext) {
      if (typeof ext !== 'string') continue
      if (ext.startsWith('msg_idx=')) msgIdx = ext.slice('msg_idx='.length)
      if (ext.startsWith('ref_msg_idx=')) refMsgIdx = ext.slice('ref_msg_idx='.length)
    }
  }

  if (d?.message_type === QQ_MSG_TYPE_QUOTE && d?.msg_elements?.[0]?.msg_idx) {
    refMsgIdx = d.msg_elements[0].msg_idx
  }

  return { msgIdx, refMsgIdx }
}

function getQQQuoteObject(session: Session): any | null {
  return (session as any).quote || session.event?.message?.quote || null
}

function getQQGuildId(session: Session, d: any): string {
  return d?.group_id || d?.group_openid || session.guildId || session.channelId || ''
}

function isRefIdx(value: string | undefined): boolean {
  return !!value?.startsWith('REFIDX_')
}

function rememberLimited<K, V>(map: Map<K, V>, key: K, value: V) {
  map.set(key, value)
  if (map.size > MAX_CACHE_SIZE) map.delete(map.keys().next().value)
}

function normalizeCachedRaw(d: any, session: Session): any {
  return {
    id: d?.id || session.messageId || '',
    platform: session.platform,
    channelId: session.channelId,
    guildId: session.guildId,
    raw: d,
  }
}

function buildDebugObject(source: string, payload: object): object {
  return {
    _quote_debug_source: source,
    ...payload,
  }
}

function createMarkdownFence(content: string): string {
  let longestRun = 0
  let currentRun = 0
  for (const char of content) {
    if (char === '`') {
      currentRun += 1
      longestRun = Math.max(longestRun, currentRun)
    } else {
      currentRun = 0
    }
  }
  return '`'.repeat(Math.max(3, longestRun + 1))
}

function resolveQQReplyReferenceId(session: Session): string | undefined {
  const d = getQQRawEvent(session)
  const messageId = d?.id || session.messageId || ''
  const { msgIdx } = parseQQMessageIndices(d)
  return msgIdx || qqMsgIdToRefIdxCache.get(messageId) || messageId || undefined
}

export function buildQQDumpMarkdown(
  formattedData: string,
  format: 'json' | 'yaml' | 'toml',
): string {
  const fence = createMarkdownFence(formattedData)
  const closingPrefix = formattedData.endsWith('\n') ? '' : '\n'
  return [
    QQ_MARKDOWN_RENDER_HINT,
    '',
    `# Quote Message Debug (${format.toUpperCase()})`,
    '',
    `${fence}${format}`,
    `${formattedData}${closingPrefix}${fence}`,
  ].join('\n')
}

export async function sendQQDumpMarkdown(
  session: Session,
  markdown: string,
  includeMessageReference: boolean,
): Promise<void> {
  if (session.platform !== 'qq') {
    throw new Error('QQ 原生 Markdown 仅能通过 QQ 平台发送')
  }

  const internal = (session.bot as any).internal
  const payload: any = {
    msg_type: 2,
    markdown: { content: markdown },
  }

  const timestamp = session.timestamp
  const isRecent = typeof timestamp === 'number'
    && Date.now() - timestamp < QQ_PASSIVE_MESSAGE_TIMEOUT

  if (session.messageId && isRecent) {
    const state = session as any
    state.seq ||= 0
    payload.msg_id = session.messageId
    payload.msg_seq = ++state.seq
  } else {
    const eventId = (session as any).qq?.id
    if (eventId && isRecent) payload.event_id = eventId
  }

  if (includeMessageReference) {
    const referenceId = resolveQQReplyReferenceId(session)
    if (referenceId) {
      payload.message_reference = {
        message_id: referenceId,
        ignore_get_message_error: true,
      }
    }
  }

  if (session.isDirect) {
    if (typeof internal?.sendPrivateMessage !== 'function') {
      throw new Error('当前 QQ 适配器未提供 internal.sendPrivateMessage()')
    }
    const userId = session.userId || session.channelId.replace(/^private:/, '')
    if (!userId) throw new Error('无法确定 QQ 私聊目标用户')
    await internal.sendPrivateMessage(userId, payload)
    return
  }

  if (typeof internal?.sendMessage !== 'function') {
    throw new Error('当前 QQ 适配器未提供 internal.sendMessage()')
  }
  await internal.sendMessage(session.channelId, payload)
}

export function registerQQQuoteCacheMiddleware(ctx: Context) {
  ctx.middleware(async (session, next) => {
    if (session.platform !== 'qq') return next()

    const d = getQQRawEvent(session)
    if (!d) return next()

    const { msgIdx } = parseQQMessageIndices(d)
    const messageId = d?.id || session.messageId || ''

    if (messageId && msgIdx) {
      rememberLimited(qqMsgIdToRefIdxCache, messageId, msgIdx)
      rememberLimited(qqRefIdxToMsgIdCache, msgIdx, messageId)
    }

    if (msgIdx) {
      rememberLimited(qqMsgCache, msgIdx, normalizeCachedRaw(d, session))
    }

    return next()
  }, true)
}

export async function resolveQQQuotedMessageObject(
  ctx: Context,
  session: Session,
  verbose = false,
): Promise<any | null> {
  if (session.platform !== 'qq') return null

  const d = getQQRawEvent(session)
  if (!d) return null

  const quote = getQQQuoteObject(session)
  const { refMsgIdx } = parseQQMessageIndices(d)
  const guildId = getQQGuildId(session, d)
  const quoteMessageIds = Array.from(new Set([
    quote?.id,
    quote?.messageId,
    d?.message_reference?.message_id,
    refMsgIdx && !isRefIdx(refMsgIdx) ? refMsgIdx : undefined,
    refMsgIdx ? qqRefIdxToMsgIdCache.get(refMsgIdx) : undefined,
  ].filter(Boolean))) as string[]

  if (verbose) {
    ctx.logger.info(`[QQ Quote] quoteMessageIds=${quoteMessageIds.join(', ') || '(empty)'}, refMsgIdx=${refMsgIdx || '(empty)'}`)
  }

  const bot = session.bot as any
  if (bot.internal?.getMessage && guildId) {
    for (const quoteMessageId of quoteMessageIds) {
      try {
        const response = await bot.internal.getMessage(guildId, quoteMessageId)
        if (response) {
          return buildDebugObject('qq.bot.internal.getMessage', {
            request: { guildId, messageId: quoteMessageId },
            response,
          })
        }
      } catch (error: any) {
        if (verbose) {
          ctx.logger.warn(`[QQ Quote] bot.internal.getMessage 失败: guildId=${guildId}, messageId=${quoteMessageId}, error=${error?.message || error}`)
        }
      }
    }
  }

  if (quote?.content || quote?.id || quote?.messageId) {
    return buildDebugObject('qq.session.quote', {
      quote,
    })
  }

  if (refMsgIdx) {
    const cached = qqMsgCache.get(refMsgIdx)
    if (cached) {
      return buildDebugObject('qq.msg_idx.memory_cache', {
        refMsgIdx,
        cached,
      })
    }

    if (d.message_type === QQ_MSG_TYPE_QUOTE && d.msg_elements?.[0]) {
      return buildDebugObject('qq.raw.msg_elements[0]', {
        refMsgIdx,
        referencedElement: d.msg_elements[0],
        currentMessage: {
          id: d?.id || session.messageId || '',
          message_scene: d?.message_scene,
          message_reference: d?.message_reference,
        },
      })
    }
  }

  if (verbose) {
    ctx.logger.warn(`[QQ Quote] 未能解析 QQ 引用: ${JSON.stringify({
      messageId: d?.id || session.messageId || '',
      message_type: d?.message_type,
      message_scene: d?.message_scene,
      message_reference: d?.message_reference,
      hasSessionQuote: !!quote,
      refMsgIdx,
    })}`)
  }

  return null
}
