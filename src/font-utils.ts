import path from 'node:path'
import { createHash } from 'node:crypto'
import { readFile, writeFile, mkdir, rm, rename } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import type { Context } from 'koishi'
import type { Config } from './config'

export const FONT_FILES = {
  LXGW: 'LXGWWenKaiMono-Medium.ttf',
  SOURCE_HAN: 'SourceHanSerifSC-Medium.otf',
  NOTO_EMOJI: 'NotoColorEmoji.ttf',
  NOTO_LICENSE: 'LICENSE',
} as const

export type ManagedFontKey = keyof typeof FONT_FILES

type DownloadConfigKey =
  | 'lxgwFontReleaseUrl'
  | 'sourceHanFontReleaseUrl'
  | 'notoEmojiFontReleaseUrl'

interface ManagedFontMeta {
  key: ManagedFontKey
  name: string
  size: number
  sha256: string
  configUrlKey?: DownloadConfigKey
  urls: string[]
}

const GITEE_RELEASE_BASE = 'https://gitee.com/vincent-zyu/koishi-plugin-quote-debug-msg-json-image/releases/download/fonts'
const GITHUB_RELEASE_BASE = 'https://github.com/VincentZyuApps/koishi-plugin-quote-debug-msg-json-image/releases/download/fonts'

export const DEFAULT_FONT_RELEASE_URLS = {
  LXGW: `${GITEE_RELEASE_BASE}/${FONT_FILES.LXGW}`,
  SOURCE_HAN: `${GITEE_RELEASE_BASE}/${FONT_FILES.SOURCE_HAN}`,
  NOTO_EMOJI: `${GITEE_RELEASE_BASE}/${FONT_FILES.NOTO_EMOJI}`,
} as const

const MANAGED_FONT_META: Record<ManagedFontKey, ManagedFontMeta> = {
  LXGW: {
    key: 'LXGW',
    name: FONT_FILES.LXGW,
    size: 24292472,
    sha256: 'BA4C68AD8420EBDDCDCB3328AAC6585681BEB0D5E14BC51EAF2F84D461719EB4',
    configUrlKey: 'lxgwFontReleaseUrl',
    urls: [
      `${GITEE_RELEASE_BASE}/${FONT_FILES.LXGW}`,
      `${GITHUB_RELEASE_BASE}/${FONT_FILES.LXGW}`,
    ],
  },
  SOURCE_HAN: {
    key: 'SOURCE_HAN',
    name: FONT_FILES.SOURCE_HAN,
    size: 24805580,
    sha256: '1D4DC4B757C07034E2412D6EDF48F54F94EC7172D4DEB3B90A3E4FC9DCB94F5D',
    configUrlKey: 'sourceHanFontReleaseUrl',
    urls: [
      `${GITEE_RELEASE_BASE}/${FONT_FILES.SOURCE_HAN}`,
      `${GITHUB_RELEASE_BASE}/${FONT_FILES.SOURCE_HAN}`,
    ],
  },
  NOTO_EMOJI: {
    key: 'NOTO_EMOJI',
    name: FONT_FILES.NOTO_EMOJI,
    size: 10673480,
    sha256: '72A635CB3D2F3524C51620CDDE406B217204E8A6A06C6A096FF8ED4B5FD6E27B',
    configUrlKey: 'notoEmojiFontReleaseUrl',
    urls: [
      `${GITEE_RELEASE_BASE}/${FONT_FILES.NOTO_EMOJI}`,
      `${GITHUB_RELEASE_BASE}/${FONT_FILES.NOTO_EMOJI}`,
    ],
  },
  NOTO_LICENSE: {
    key: 'NOTO_LICENSE',
    name: FONT_FILES.NOTO_LICENSE,
    size: 4393,
    sha256: '88F117575237307BDD86A17EF15E21790FC9A662FE4DFB103CA1CA077F0D9982',
    urls: [
      `${GITEE_RELEASE_BASE}/${FONT_FILES.NOTO_LICENSE}`,
      `${GITHUB_RELEASE_BASE}/${FONT_FILES.NOTO_LICENSE}`,
    ],
  },
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

function normalizePath(value: string): string {
  return path.normalize(value).toLowerCase()
}

function isLegacyAssetsPath(value: string, key: ManagedFontKey): boolean {
  return normalizePath(value).endsWith(normalizePath(path.join('assets', FONT_FILES[key])))
}

function sha256(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex').toUpperCase()
}

function getFontsDirByBaseDir(baseDir: string): string {
  return path.join(baseDir, 'data', 'fonts')
}

export function getManagedFontPathByBaseDir(
  baseDir: string,
  key: ManagedFontKey,
  _pluginName?: string,
): string {
  return path.join(getFontsDirByBaseDir(baseDir), FONT_FILES[key])
}

export function getSchemaFontPath(key: ManagedFontKey, _pluginName?: string): string {
  return getManagedFontPathByBaseDir(process.cwd(), key)
}

export function resolveConfiguredFontPath(
  ctx: Context,
  configuredPath: string | undefined,
  key: ManagedFontKey,
  _pluginName?: string,
): string {
  const schemaDefault = getSchemaFontPath(key)
  const runtimeDefault = getManagedFontPathByBaseDir(ctx.baseDir, key)
  const value = (configuredPath || '').trim()

  if (!value || normalizePath(value) === normalizePath(schemaDefault) || isLegacyAssetsPath(value, key)) {
    return runtimeDefault
  }

  return path.isAbsolute(value) ? value : path.join(ctx.baseDir, value)
}

function getDownloadUrls(meta: ManagedFontMeta, cfg: Config): string[] {
  const configured = meta.configUrlKey ? String(cfg[meta.configUrlKey] || '').trim() : ''
  return unique([configured, ...meta.urls])
}

async function validateFile(filePath: string, meta: ManagedFontMeta): Promise<boolean> {
  if (!existsSync(filePath)) return false
  try {
    const data = await readFile(filePath)
    return data.length === meta.size && sha256(data) === meta.sha256
  } catch {
    return false
  }
}

function validateBuffer(data: Buffer, meta: ManagedFontMeta): string | null {
  if (data.length !== meta.size) {
    return `大小不匹配，期望 ${meta.size} bytes，实际 ${data.length} bytes`
  }

  const hash = sha256(data)
  if (hash !== meta.sha256) {
    return `SHA256 不匹配，期望 ${meta.sha256}，实际 ${hash}`
  }

  return null
}

async function downloadManagedFont(
  ctx: Context,
  pluginName: string,
  cfg: Config,
  meta: ManagedFontMeta,
  filePath: string,
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true })

  for (const url of getDownloadUrls(meta, cfg)) {
    ctx.logger.info(`[${pluginName}] 下载字体资源: ${meta.name} <- ${url}`)
    try {
      const response = await ctx.http.get(url, {
        responseType: 'arraybuffer',
        timeout: 120000,
      })
      const data = Buffer.from(response as ArrayBuffer)
      const invalidReason = validateBuffer(data, meta)
      if (invalidReason) {
        ctx.logger.warn(`[${pluginName}] 下载结果校验失败: ${meta.name}, ${invalidReason}`)
        continue
      }

      const tempPath = `${filePath}.tmp`
      await writeFile(tempPath, data)
      await rm(filePath, { force: true })
      await rename(tempPath, filePath)
      ctx.logger.info(`[${pluginName}] 字体资源已就绪: ${meta.name}`)
      return
    } catch (error) {
      ctx.logger.warn(`[${pluginName}] 下载失败: ${meta.name}, ${error}`)
    }
  }

  throw new Error(`无法下载并校验字体资源: ${meta.name}`)
}

function getDownloadTargets(ctx: Context, cfg: Config, pluginName: string): Array<{ meta: ManagedFontMeta; path: string }> {
  const targets = [
    {
      meta: MANAGED_FONT_META.LXGW,
      path: resolveConfiguredFontPath(ctx, cfg.dumpTypstFontPath, 'LXGW', pluginName),
    },
    {
      meta: MANAGED_FONT_META.LXGW,
      path: resolveConfiguredFontPath(ctx, cfg.renderForwardLxgwFontPath, 'LXGW', pluginName),
    },
    {
      meta: MANAGED_FONT_META.SOURCE_HAN,
      path: resolveConfiguredFontPath(ctx, cfg.renderForwardSourceFontPath, 'SOURCE_HAN', pluginName),
    },
    {
      meta: MANAGED_FONT_META.NOTO_EMOJI,
      path: getManagedFontPathByBaseDir(ctx.baseDir, 'NOTO_EMOJI'),
    },
    {
      meta: MANAGED_FONT_META.NOTO_LICENSE,
      path: getManagedFontPathByBaseDir(ctx.baseDir, 'NOTO_LICENSE'),
    },
  ]

  const seen = new Set<string>()
  return targets.filter(target => {
    const id = `${target.meta.key}:${normalizePath(target.path)}`
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

export async function checkAndDownloadFonts(ctx: Context, pluginName: string, cfg: Config): Promise<void> {
  if (!cfg.downloadFontsFromRelease) {
    ctx.logger.info(`[${pluginName}] 已关闭 Release 字体下载，跳过字体下载检查`)
    return
  }

  const targets = getDownloadTargets(ctx, cfg, pluginName)
  for (const target of targets) {
    if (await validateFile(target.path, target.meta)) {
      ctx.logger.info(`[${pluginName}] 字体资源校验通过: ${target.meta.name}`)
      continue
    }

    if (existsSync(target.path)) {
      ctx.logger.warn(`[${pluginName}] 字体资源存在但校验失败，将重新下载: ${target.path}`)
    }
    await downloadManagedFont(ctx, pluginName, cfg, target.meta, target.path)
  }
}

export function getTypstFontPaths(ctx: Context, cfg: Config, pluginName?: string): string[] {
  return unique([
    resolveConfiguredFontPath(ctx, cfg.dumpTypstFontPath, 'LXGW', pluginName),
    getManagedFontPathByBaseDir(ctx.baseDir, 'NOTO_EMOJI'),
    resolveConfiguredFontPath(ctx, cfg.renderForwardSourceFontPath, 'SOURCE_HAN', pluginName),
  ]).filter(p => existsSync(p))
}
