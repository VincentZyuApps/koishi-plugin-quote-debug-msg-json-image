import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Context } from 'koishi'
import type { AvatarMap, ForwardContentItem } from './model'

/** 获取头像URL（优先使用预获取的base64，否则使用原始URL） */
export function getAvatarUrl(userId: number, avatarMap: AvatarMap | null): string {
  if (avatarMap && avatarMap.has(userId)) {
    return avatarMap.get(userId)!
  }
  return `https://q1.qlogo.cn/g?b=qq&nk=${userId}&s=640`
}

/** 预获取所有头像并转为base64（带去重） */
export async function prefetchAvatars(ctx: Context, userIds: Set<number>): Promise<AvatarMap> {
  const avatarMap: AvatarMap = new Map()

  const fetchPromises = Array.from(userIds).map(async (userId) => {
    const url = `https://q1.qlogo.cn/g?b=qq&nk=${userId}&s=640`
    try {
      const response = await ctx.http.get(url, { responseType: 'arraybuffer' })
      const buffer = Buffer.from(response)
      const base64 = `data:image/jpeg;base64,${buffer.toString('base64')}`
      avatarMap.set(userId, base64)
    } catch (err) {
      ctx.logger.warn(`[render-forward] 预获取头像失败 (userId=${userId}): ${err}`)
      // 失败时不添加到map，后续会使用原始URL
    }
  })

  await Promise.all(fetchPromises)
  return avatarMap
}

function getFontCssMeta(filePath: string): { mime: string; format: string } {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.otf') return { mime: 'font/otf', format: 'opentype' }
  return { mime: 'font/ttf', format: 'truetype' }
}

export async function loadFontFaceCss(filePath: string, fontFamily: string): Promise<string> {
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

export function getForwardAvatarUrl(content: ForwardContentItem[]): string | null {
  const first = content?.[0]
  if (!first?.sender?.user_id) return null
  const uid = String(first.sender.user_id)
  return `https://q1.qlogo.cn/g?b=qq&nk=${uid}&s=640`
}
