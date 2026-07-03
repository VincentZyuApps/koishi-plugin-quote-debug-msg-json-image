import path from 'node:path'
import fs from 'node:fs'
import { Context } from 'koishi'
import { Resvg } from '@resvg/resvg-js'
import type { NodeCompiler, NodeAddFontBlobs } from '@myriaddreamin/typst-ts-node-compiler'
import type { Config } from './config'
import { getTypstFontPaths } from './font-utils'

export type FormatType = 'json' | 'yaml' | 'toml'

interface TypstTheme {
  pageBg: string
  textColor: string
  headerFill: string
  headerStroke: string
  headerText: string
  panelFill: string
  panelStroke: string
  sectionTitle: string
  codeBlockFill: string
  codeBlockStroke: string
  statsText: string
}

function getFormatDisplayName(format: FormatType): string {
  return format.toUpperCase()
}

function getTypstCodeLang(format: FormatType): string {
  switch (format) {
    case 'json': return 'json'
    case 'yaml': return 'yaml'
    case 'toml': return 'toml'
    default: return format
  }
}

function escapeTypstText(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/#/g, '\\#')
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/</g, '\\<')
    .replace(/>/g, '\\>')
    .replace(/@/g, '\\@')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
}

function toTypstColor(value: string | undefined, fallback: string): string {
  const v = (value || '').trim()
  if (!v) return `rgb("${fallback}")`
  if (v.startsWith('#')) return `rgb("${v}")`
  const rgbMatch = v.match(/^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i)
  if (rgbMatch) return `rgb(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]})`
  const rgbaMatch = v.match(/^rgba\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0|1|0?\.\d+)\s*\)$/i)
  if (rgbaMatch) return `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, ${rgbaMatch[4]})`
  return `rgb("${fallback}")`
}

function buildTypstTheme(cfg: Config): TypstTheme {
  return {
    pageBg: toTypstColor(cfg.dumpTypstPageBgColor, '#f9efe2'),
    textColor: toTypstColor(cfg.dumpTypstTextColor, '#2f2f35'),
    headerFill: toTypstColor(cfg.dumpTypstHeaderFillColor, '#fab8ba'),
    headerStroke: toTypstColor(cfg.dumpTypstHeaderStrokeColor, '#f9b7a0'),
    headerText: toTypstColor(cfg.dumpTypstHeaderTextColor, '#ffffff'),
    panelFill: toTypstColor(cfg.dumpTypstPanelFillColor, '#fffbf8'),
    panelStroke: toTypstColor(cfg.dumpTypstPanelStrokeColor, '#f3efe5'),
    sectionTitle: toTypstColor(cfg.dumpTypstSectionTitleColor, '#d0908c'),
    codeBlockFill: toTypstColor(cfg.dumpTypstCodeBlockFillColor, '#ffffff'),
    codeBlockStroke: toTypstColor(cfg.dumpTypstCodeBlockStrokeColor, '#edd6d0'),
    statsText: toTypstColor(cfg.dumpTypstStatsTextColor, '#8788a5'),
  }
}

class TypstRenderer {
  private typst: typeof import('@myriaddreamin/typst-ts-node-compiler') | null = null
  private compiler: NodeCompiler | null = null
  private readonly typstModuleName = '@myriaddreamin/typst-ts-node-compiler'
  private readonly workspaceDir = path.resolve(__dirname, '..')
  private initialized = false

  constructor(
    private ctx: Context,
    private logger: any,
    private cfg: Config,
  ) {}

  async init(): Promise<void> {
    if (this.cfg.verboseConsoleLog) {
      this.logger.info(`[Typst] 开始加载 Typst 模块: ${this.typstModuleName}`)
      this.logger.info(`[Typst] 工作目录: ${this.workspaceDir}`)
    }
    this.typst = await import(this.typstModuleName)
    this.logger.info('Typst 模块加载成功')
    this.initialized = true
  }

  isReady(): boolean {
    return this.initialized && !!this.typst
  }

  private getCompiler(): NodeCompiler {
    if (!this.typst) throw new Error('Typst 模块未初始化，请先调用 init()')

    const fontArgs: NodeAddFontBlobs[] = []
    const loadedNames: string[] = []

    for (const fp of getTypstFontPaths(this.ctx, this.cfg)) {
      try {
        const buf = fs.readFileSync(fp)
        fontArgs.push({ fontBlobs: [buf] })
        loadedNames.push(path.basename(fp))
      } catch (err) {
        this.logger.warn(`[Typst] 加载字体失败: ${fp}, 错误: ${err}`)
      }
    }

    if (fontArgs.length === 0) {
      this.logger.warn('[Typst] 未加载到任何字体，将依赖系统字体 fallback')
    }

    if (!this.compiler) {
      if (this.cfg.verboseConsoleLog) {
        this.logger.info(`[Typst] 创建编译器，工作目录: ${this.workspaceDir}`)
        this.logger.info(`[Typst] 加载 ${fontArgs.length} 个字体: ${loadedNames.join(', ') || '无'}`)
      }
      this.compiler = this.typst.NodeCompiler.create({
        fontArgs,
        workspace: this.workspaceDir,
      })
      this.logger.debug(`Typst 编译器已创建，加载了 ${fontArgs.length} 个字体`)
    }

    return this.compiler
  }

  private fixSvgForResvg(svg: string): string {
    let fixed = svg.replace(
      /\.outline_glyph\s+path,\s*\npath\.outline_glyph\s*{\s*\n\s*fill:\s*var\(--glyph_fill\);\s*\n\s*stroke:\s*var\(--glyph_stroke\);\s*\n}/g,
      ''
    )
    fixed = fixed.replace(
      /\.outline_glyph[^}]*fill:\s*var\(--glyph_fill\)[^}]*}/g,
      ''
    )
    fixed = fixed.replace(
      /\.outline_glyph[^}]*transition[^}]*}/g,
      ''
    )
    fixed = fixed.replace(
      /\.hover\s+\.typst-text\s*{[^}]*}/g,
      ''
    )
    return fixed
  }

  private toSvg(content: string): string {
    const compiler = this.getCompiler()
    try {
      if (this.cfg.verboseConsoleLog) {
        this.logger.info(`[Typst] 开始编译 Typst 代码，长度: ${content.length} 字符`)
      }
      let result = compiler.svg({ mainFileContent: content })
      result = this.fixSvgForResvg(result)
      if (this.cfg.verboseConsoleLog) {
        this.logger.info(`[Typst] 编译完成，SVG 长度: ${result.length} 字符`)
        const colorMatches = result.match(/fill="#[0-9a-fA-F]{6}"/g) || []
        this.logger.info(`[Typst] SVG 中的颜色: ${[...new Set(colorMatches)].join(', ')}`)
        if (result.includes('var(--glyph')) {
          this.logger.warn(`[Typst] 警告: SVG 中仍包含 CSS 变量！`)
        }
      }
      return result
    } catch (err) {
      if (this.cfg.verboseConsoleLog) {
        this.logger.error(`[Typst] 编译失败: ${err}`)
      }
      throw err
    } finally {
      compiler.evictCache(10)
    }
  }

  async toPng(content: string, scale: number = 1.5): Promise<Buffer> {
    if (this.cfg.verboseConsoleLog) {
      this.logger.info(`[Typst] 开始转换 PNG，缩放: ${scale}x`)
    }
    const svg = this.toSvg(content)
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'zoom', value: scale },
      font: { loadSystemFonts: true },
    })
    const buffer = resvg.render().asPng()
    if (this.cfg.verboseConsoleLog) {
      this.logger.info(`[Typst] PNG 生成完成，大小: ${(buffer.length / 1024).toFixed(2)} KB`)
    }
    return buffer
  }
}

let sharedRenderer: TypstRenderer | null = null

function escapeFencedCodeBlock(data: string): { fence: string; content: string } {
  const backtickSequences = data.match(/`+/g) || []
  let maxBackticks = 0
  for (const seq of backtickSequences) {
    if (seq.length > maxBackticks) maxBackticks = seq.length
  }
  const fenceLength = Math.max(3, maxBackticks + 1)
  return { fence: '`'.repeat(fenceLength), content: data }
}

function generateTypstCode(formattedData: string, format: FormatType, theme: TypstTheme, messageMode: 'forward' | 'image', cfg: Config): string {
  const formatName = getFormatDisplayName(format)
  const codeLang = getTypstCodeLang(format)
  const timestamp = new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  const escapedFormatName = escapeTypstText(formatName)
  const escapedTimestamp = escapeTypstText(timestamp)
  const { fence, content: codeContent } = escapeFencedCodeBlock(formattedData)
  const footerText = (cfg.dumpTypstFooterText || '🧩 Generated by *koishi-plugin-quote-debug-msg-json-image*').trim()

  return `#set page(
  width: 500pt,
  height: auto,
  margin: (x: 14pt, y: 14pt),
  fill: ${theme.pageBg}
)

#set text(
  font: ("LXGW WenKai Mono", "Noto Color Emoji", "Source Han Serif SC", "Noto Sans CJK SC", "Microsoft YaHei"),
  size: 11pt,
  fill: ${theme.textColor},
  lang: "zh"
)

#show raw.where(block: true): it => block(
  fill: ${theme.codeBlockFill},
  stroke: 1pt + ${theme.codeBlockStroke},
  radius: 4pt,
  inset: 8pt,
  width: 100%,
  it
)

#show raw: set text(
  font: ("LXGW WenKai Mono", "Noto Color Emoji", "JetBrains Mono", "Fira Code", "Consolas"),
  size: 9pt
)

#align(center)[
  #block(
    fill: ${theme.headerFill},
    stroke: 2pt + ${theme.headerStroke},
    radius: 6pt,
    inset: 10pt,
    width: 100%
  )[
    #text(size: 16pt, weight: "bold", fill: ${theme.headerText})[
      📋 消息${escapedFormatName}调试
    ]

    #v(4pt)

    #text(size: 10pt, fill: ${theme.headerText})[
      ⏰ 查询时间: ${escapedTimestamp}
    ]
  ]
]

#v(8pt)

#block(
  fill: ${theme.panelFill},
  stroke: 1pt + ${theme.panelStroke},
  radius: 4pt,
  inset: 8pt,
  width: 100%
)[
  #text(weight: "bold", fill: ${theme.sectionTitle})[
    📝 ${escapedFormatName} 数据
  ]

  #v(5pt)

${fence}${codeLang}
${codeContent}
${fence}

  #v(5pt)

  #text(size: 9pt, fill: ${theme.statsText})[
    📏 总长度: ${formattedData.length} 字符
  ]
]

#v(10pt)

#align(center)[
  #block(
    fill: ${theme.panelFill},
    stroke: 0.5pt + ${theme.panelStroke},
    radius: 4pt,
    inset: 6pt,
    width: 100%
  )[
    #text(size: 8pt, fill: ${theme.statsText})[
      ${footerText}

      🎨 Mode: *${messageMode}* · typst image

      ⏰ Time: ${escapedTimestamp}
    ]
  ]
]
`
}

async function ensureTypstReady(renderer: TypstRenderer): Promise<void> {
  if (!renderer.isReady()) await renderer.init()
}

export async function renderTypstImage(
  ctx: Context,
  cfg: Config,
  formattedData: string,
  format: FormatType,
  messageMode: 'forward' | 'image',
): Promise<Buffer> {
  if (!sharedRenderer) {
    sharedRenderer = new TypstRenderer(ctx, ctx.logger('quote-debug-typst'), cfg)
  }
  await ensureTypstReady(sharedRenderer)
  const typstTheme = buildTypstTheme(cfg)
  const typstCode = generateTypstCode(formattedData, format, typstTheme, messageMode, cfg)

  if (cfg.verboseConsoleLog) {
    const logger = ctx.logger('quote-debug-typst')
    logger.info(`[Typst] 生成的 Typst 代码片段（前 500 字符）：`)
    logger.info(typstCode.substring(0, 500))
    const fencedMatch = typstCode.match(/(`{3,})(\w+)\n([\s\S]*?)\1/s)
    if (fencedMatch) {
      logger.info(`[Typst] 找到 fenced code block：围栏: ${fencedMatch[1]}, 语言: ${fencedMatch[2]}, 内容长度: ${fencedMatch[3].length}`)
    }
  }

  return sharedRenderer.toPng(typstCode, cfg.dumpTypstRenderScale ?? 2.33)
}
