import { Context } from 'koishi'
import {} from 'koishi-plugin-to-image-service'
import {} from 'koishi-plugin-w-node'
import type { Config } from './index'
import path from 'node:path'
import type { NodeCompiler, NodeAddFontBlobs } from '@myriaddreamin/typst-ts-node-compiler'
import type { Font, FontFormat } from 'koishi-plugin-to-image-service'

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

/**
 * 获取格式的显示名称
 */
function getFormatDisplayName(format: FormatType): string {
  return format.toUpperCase()
}

/**
 * 获取 Typst 代码块语言标识
 */
function getTypstCodeLang(format: FormatType): string {
  // 使用 Typst 支持的语言标识
  switch (format) {
    case 'json': return 'json'
    case 'yaml': return 'yaml'  
    case 'toml': return 'toml'
    default: return format
  }
}

/**
 * 转义 Typst 文本内容中的特殊字符（用于非代码块的文本）
 */
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

/**
 * Typst 渲染器（仅用于 dump 指令）
 */
class TypstRenderer {
  private typst: typeof import('@myriaddreamin/typst-ts-node-compiler') | null = null
  private compiler: NodeCompiler | null = null
  private lastFonts: Font[] = []
  private readonly fontFormats: FontFormat[] = ['ttf', 'otf']
  private readonly typstModuleName = '@myriaddreamin/typst-ts-node-compiler'
  private readonly workspaceDir = path.resolve(__dirname, '..')
  private initialized = false

  constructor(
    private ctx: Context,
    private logger: any,
    private cfg: Config,
  ) {}

  /**
   * 初始化 Typst 编译器
   */
  async init(): Promise<void> {
    if (!this.ctx.node) {
      throw new Error('w-node 服务未启用，无法使用 Typst 渲染')
    }
    if (!this.ctx.toImageService) {
      throw new Error('to-image-service 服务未启用，无法使用 Typst 渲染')
    }
    if (this.cfg.verboseConsoleLog) {
      this.logger.info(`[Typst] 开始加载 Typst 模块: ${this.typstModuleName}`)
      this.logger.info(`[Typst] 工作目录: ${this.workspaceDir}`)
    }
    this.typst = await this.ctx.node.safeImport(this.typstModuleName)
    this.logger.info('Typst 模块加载成功')
    this.initialized = true
  }

  isReady(): boolean {
    return this.initialized && !!this.typst
  }

  /**
   * 获取或创建编译器实例
   */
  private getCompiler(): NodeCompiler {
    if (!this.typst) {
      throw new Error('Typst 模块未初始化，请先调用 init()')
    }

    const fonts = this.ctx.toImageService.fontManagement.getFonts(this.fontFormats)
    
    // 检查字体是否变化，如果变化则重新创建编译器
    if (
      !this.compiler ||
      fonts.length !== this.lastFonts.length ||
      (fonts.length > 0 && fonts.some(f => !this.lastFonts.some(lf => lf.data === f.data)))
    ) {
      if (this.cfg.verboseConsoleLog) {
        this.logger.info(`[Typst] 创建编译器，工作目录: ${this.workspaceDir}`)
        this.logger.info(`[Typst] 加载 ${fonts.length} 个字体：${fonts.map(f => f.name).join(', ')}`)
      }
      this.compiler = this.typst.NodeCompiler.create({
        fontArgs: fonts.map(font => ({
          fontBlobs: [font.data],
        }) as NodeAddFontBlobs),
        workspace: this.workspaceDir,
      })
      this.lastFonts = fonts
      this.logger.debug(`Typst 编译器已创建，加载了 ${fonts.length} 个字体`)
    }
    
    return this.compiler
  }

  /**
   * 将 Typst 代码编译为 SVG
   */
  private toSvg(content: string): string {
    const compiler = this.getCompiler()
    try {
      if (this.cfg.verboseConsoleLog) {
        this.logger.info(`[Typst] 开始编译 Typst 代码，长度: ${content.length} 字符`)
      }
      const result = compiler.svg({ mainFileContent: content })
      if (this.cfg.verboseConsoleLog) {
        this.logger.info(`[Typst] 编译完成，SVG 长度: ${result.length} 字符`)
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

  /**
   * 将 Typst 代码编译为 PNG
   */
  async toPng(content: string, scale: number = 1.5): Promise<Buffer> {
    if (this.cfg.verboseConsoleLog) {
      this.logger.info(`[Typst] 开始转换 PNG，缩放: ${scale}x`)
    }
    const svg = this.toSvg(content)
    const result = await this.ctx.toImageService.svgToImage.resvg(svg, {
      options: {
        fitTo: { mode: 'zoom', value: scale },
      },
    })
    const buffer = Buffer.from(result)
    if (this.cfg.verboseConsoleLog) {
      this.logger.info(`[Typst] PNG 生成完成，大小: ${(buffer.length / 1024).toFixed(2)} KB`)
    }
    return buffer
  }
}

let sharedRenderer: TypstRenderer | null = null

/**
 * 生成 Typst 渲染代码
 */
function generateTypstCode(formattedData: string, format: FormatType, theme: TypstTheme, messageMode: 'forward' | 'image'): string {
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

  // 转义标题和时间戳（这些是文本内容）
  const escapedFormatName = escapeTypstText(formatName)
  const escapedTimestamp = escapeTypstText(timestamp)
  const dumpDataLiteral = JSON.stringify(formattedData)

  return `#set page(
  width: 500pt,
  height: auto,
  margin: (x: 14pt, y: 14pt),
  fill: ${theme.pageBg}
)

#set text(
  font: ("LXGW WenKai Mono", "Noto Sans CJK SC", "Microsoft YaHei"),
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
  font: ("JetBrains Mono", "Fira Code", "Consolas", "LXGW WenKai Mono"),
  size: 9pt
)

#let dump_data = ${dumpDataLiteral}

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
  
  #raw(
    dump_data, 
    block: true, 
    lang: "${codeLang}"
  )
  
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
      Generated by *koishi-plugin-quote-debug-msg-json-image*
      
      Mode: *${messageMode}* · typst image
      
      Time: ${escapedTimestamp}
    ]
  ]
]
`
}

async function ensureTypstReady(renderer: TypstRenderer): Promise<void> {
  if (!renderer.isReady()) {
    await renderer.init()
  }
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
  const typstCode = generateTypstCode(formattedData, format, typstTheme, messageMode)
  
  if (cfg.verboseConsoleLog) {
    const logger = ctx.logger('quote-debug-typst')
    logger.info(`[Typst] 生成的 Typst 代码片段（前 500 字符）：`)
    logger.info(typstCode.substring(0, 500))
    logger.info(`[Typst] ... (总长度: ${typstCode.length} 字符)`)
    
    // 查找并输出 #raw() 调用部分
    const rawCallMatch = typstCode.match(/#raw\([^)]*\)/s)
    if (rawCallMatch) {
      logger.info(`[Typst] 找到 #raw() 调用：`)
      logger.info(rawCallMatch[0])
    } else {
      logger.warn(`[Typst] 警告：未找到 #raw() 调用！`)
    }
  }
  
  return sharedRenderer.toPng(typstCode, cfg.dumpTypstRenderScale ?? 2.33)
}



