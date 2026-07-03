import path from 'node:path'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import type { Context } from 'koishi'
import type { Config } from '../config'

export const SYNTAX_PLUGIN_ASSET_NAME = 'quote-debug-msg-json-image'
export const SYNTAX_ASSET_PARTS = ['data', 'assets', SYNTAX_PLUGIN_ASSET_NAME, 'syntaxes'] as const

export const SYNTAX_FILES = {
  JSON: 'json.sublime-syntax.yml',
  YAML: 'yaml.sublime-syntax.yml',
  TOML: 'toml.sublime-syntax.yml',
} as const

export type SyntaxFileName = typeof SYNTAX_FILES[keyof typeof SYNTAX_FILES]

function normalizePath(value: string): string {
  return path.normalize(value).toLowerCase()
}

function normalizeSyntaxAssetParts(parts: string[] | readonly string[] | undefined): string[] {
  const normalized = (parts || [])
    .map(part => String(part).trim())
    .filter(Boolean)
  return normalized.length ? normalized : [...SYNTAX_ASSET_PARTS]
}

function normalizeSyntaxFilename(value: string | undefined, fallback: SyntaxFileName): string {
  const normalized = (value || '').trim()
  if (!normalized) return fallback
  return path.basename(normalized)
}

function getBundledSyntaxDir(): string {
  return path.resolve(__dirname, '../syntaxes')
}

function getBundledSyntaxPath(fileName: SyntaxFileName): string {
  return path.join(getBundledSyntaxDir(), fileName)
}

export function getSyntaxWorkspaceByBaseDir(baseDir: string, assetParts?: string[] | readonly string[]): string {
  return path.dirname(getSyntaxAssetsDirByBaseDir(baseDir, assetParts))
}

export function getSyntaxAssetsDirByBaseDir(baseDir: string, assetParts?: string[] | readonly string[]): string {
  return path.join(baseDir, ...normalizeSyntaxAssetParts(assetParts))
}

export function getManagedSyntaxPathByBaseDir(
  baseDir: string,
  assetParts: string[] | readonly string[] | undefined,
  fileName: string | undefined,
  fallback: SyntaxFileName,
): string {
  return path.join(getSyntaxAssetsDirByBaseDir(baseDir, assetParts), normalizeSyntaxFilename(fileName, fallback))
}

export function resolveConfiguredSyntaxFilePath(
  ctx: Context,
  cfg: Config,
  configuredFilename: string | undefined,
  fallback: SyntaxFileName,
): string {
  const runtimeDefault = getManagedSyntaxPathByBaseDir(ctx.baseDir, cfg.dumpSyntaxAssetFolderRelativePath, configuredFilename, fallback)
  const legacySchemaDefault = getManagedSyntaxPathByBaseDir(process.cwd(), SYNTAX_ASSET_PARTS, fallback, fallback)
  const legacyBundledPath = getBundledSyntaxPath(fallback)
  const value = (configuredFilename || '').trim()

  if (
    !value ||
    normalizePath(value) === normalizePath(legacySchemaDefault) ||
    normalizePath(value) === normalizePath(legacyBundledPath)
  ) {
    return runtimeDefault
  }

  return getManagedSyntaxPathByBaseDir(ctx.baseDir, cfg.dumpSyntaxAssetFolderRelativePath, value, fallback)
}

async function copySyntaxFileIfNeeded(sourcePath: string, targetPath: string): Promise<boolean> {
  const sourceData = await readFile(sourcePath)

  if (existsSync(targetPath)) {
    const targetData = await readFile(targetPath)
    if (targetData.equals(sourceData)) return false
  }

  await mkdir(path.dirname(targetPath), { recursive: true })
  await writeFile(targetPath, sourceData)
  return true
}

export async function ensureSyntaxAssets(ctx: Context, pluginName: string, cfg: Config): Promise<void> {
  const logger = ctx.logger(pluginName)
  const targets: Array<{ label: string; sourceFileName: SyntaxFileName; configuredFilename: string | undefined }> = [
    { label: 'JSON', sourceFileName: SYNTAX_FILES.JSON, configuredFilename: cfg.dumpJsonSyntaxFilename },
    { label: 'YAML', sourceFileName: SYNTAX_FILES.YAML, configuredFilename: cfg.dumpYamlSyntaxFilename },
    { label: 'TOML', sourceFileName: SYNTAX_FILES.TOML, configuredFilename: cfg.dumpTomlSyntaxFilename },
  ]

  for (const target of targets) {
    const sourcePath = getBundledSyntaxPath(target.sourceFileName)
    const targetPath = resolveConfiguredSyntaxFilePath(ctx, cfg, target.configuredFilename, target.sourceFileName)
    const copied = await copySyntaxFileIfNeeded(sourcePath, targetPath)

    if (copied) {
      logger.info(`[${pluginName}] 已复制 ${target.label} 语法文件: ${targetPath}`)
    } else if (cfg.verboseConsoleLog) {
      logger.info(`[${pluginName}] ${target.label} 语法文件已就绪: ${targetPath}`)
    }
  }
}
