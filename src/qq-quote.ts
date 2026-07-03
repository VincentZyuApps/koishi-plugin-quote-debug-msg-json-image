import type { Context, Session } from 'koishi'

const QQ_MSG_TYPE_QUOTE = 103
const MAX_CACHE_SIZE = 300

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
