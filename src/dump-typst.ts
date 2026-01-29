import { Context } from 'koishi'
import {} from 'koishi-plugin-to-image-service'
import {} from 'koishi-plugin-w-node'
import type { Config } from './index'
import path from 'node:path'
import fs from 'node:fs'
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
    // 等待 toImageService.svgToImage.resvg 就绪（最多等待 10 秒）
    const maxWaitMs = 10000
    const intervalMs = 200
    let waited = 0
    while (!this.ctx.toImageService?.svgToImage?.resvg && waited < maxWaitMs) {
      if (this.cfg.verboseConsoleLog) {
        this.logger.info(`[Typst] 等待 toImageService.svgToImage.resvg 就绪... (${waited}ms)`)
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs))
      waited += intervalMs
    }
    if (!this.ctx.toImageService?.svgToImage?.resvg) {
      throw new Error(
        `to-image-service 的 svgToImage.resvg 在 ${maxWaitMs}ms 内未就绪。` +
        '请确保 to-image-service 插件在 quote-debug-msg-json-image 之前加载，并且已正确安装 @resvg/resvg-wasm 依赖。'
      )
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
    
    // 尝试加载自定义字体
    const customFontPath = this.cfg.dumpTypstFontPath
    if (customFontPath && fs.existsSync(customFontPath)) {
      try {
        const customFontBuffer = fs.readFileSync(customFontPath)
        fonts.push({
          name: path.basename(customFontPath),
          filePath: customFontPath,
          data: customFontBuffer,
          format: customFontPath.endsWith('.otf') ? 'otf' : 'ttf'
        })
        if (this.cfg.verboseConsoleLog) {
          this.logger.info(`[Typst] 成功加载自定义字体: ${customFontPath}`)
        }
      } catch (err) {
        this.logger.warn(`[Typst] 加载自定义字体失败: ${customFontPath}, 错误: ${err}`)
      }
    } else if (customFontPath) {
      this.logger.warn(`[Typst] 自定义字体文件不存在: ${customFontPath}`)
    }
    
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
   * 修复 Typst 生成的 SVG 以兼容 resvg
   * 
   * Typst 的 SVG 输出使用 CSS 变量和 <use> 元素，resvg 不支持 CSS 变量。
   * 解决方案：移除 CSS 变量样式规则，让颜色通过父元素的 fill 属性继承。
   */
  private fixSvgForResvg(svg: string): string {
    // 移除 .outline_glyph 的 fill: var(--glyph_fill) 样式规则
    // 这样颜色会从父元素 <g class="typst-text" fill="#color"> 继承
    let fixed = svg.replace(
      /\.outline_glyph\s+path,\s*\npath\.outline_glyph\s*{\s*\n\s*fill:\s*var\(--glyph_fill\);\s*\n\s*stroke:\s*var\(--glyph_stroke\);\s*\n}/g,
      ''
    )
    // 备用匹配：更宽松的模式
    fixed = fixed.replace(
      /\.outline_glyph[^}]*fill:\s*var\(--glyph_fill\)[^}]*}/g,
      ''
    )
    // 移除 transition 样式（resvg 不支持）
    fixed = fixed.replace(
      /\.outline_glyph[^}]*transition[^}]*}/g,
      ''
    )
    // 移除 hover 样式（静态图片不需要）
    fixed = fixed.replace(
      /\.hover\s+\.typst-text\s*{[^}]*}/g,
      ''
    )
    return fixed
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
      let result = compiler.svg({ mainFileContent: content })
      
      // 修复 SVG 以兼容 resvg
      result = this.fixSvgForResvg(result)
      
      if (this.cfg.verboseConsoleLog) {
        this.logger.info(`[Typst] 编译完成，SVG 长度: ${result.length} 字符`)
        // 检查 SVG 中的颜色
        const colorMatches = result.match(/fill="#[0-9a-fA-F]{6}"/g) || []
        const uniqueColors = [...new Set(colorMatches)]
        this.logger.info(`[Typst] SVG 中的颜色: ${uniqueColors.join(', ')}`)
        // 检查是否有语法高亮颜色
        const highlightColors = ['#4b69c6', '#198810', '#b60157', '#d73948']
        const foundHighlights = uniqueColors.filter(c => highlightColors.some(h => c.includes(h)))
        if (foundHighlights.length > 0) {
          this.logger.info(`[Typst] 找到语法高亮颜色: ${foundHighlights.join(', ')}`)
        } else {
          this.logger.warn(`[Typst] 警告: 未找到语法高亮颜色！`)
        }
        // 检查是否还有 CSS 变量
        if (result.includes('var(--glyph')) {
          this.logger.warn(`[Typst] 警告: SVG 中仍包含 CSS 变量！`)
        } else {
          this.logger.info(`[Typst] SVG 已修复，移除了 CSS 变量`)
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

  /**
   * 将 Typst 代码编译为 PNG
   */
  async toPng(content: string, scale: number = 1.5): Promise<Buffer> {
    if (this.cfg.verboseConsoleLog) {
      this.logger.info(`[Typst] 开始转换 PNG，缩放: ${scale}x`)
    }
    const svg = this.toSvg(content)
    
    // 防御性检查：确保 toImageService.svgToImage 已初始化
    if (!this.ctx.toImageService?.svgToImage?.resvg) {
      throw new Error(
        'toImageService.svgToImage.resvg 尚未就绪，请确保 to-image-service 插件已完全启动。' +
        '提示：在 koishi.yml 中将 to-image-service 放在 quote-debug-msg-json-image 之前加载。'
      )
    }
    
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
 * 为 fenced code block 转义数据中的反引号
 * 如果数据中包含连续的反引号，需要增加围栏反引号的数量
 */
function escapeFencedCodeBlock(data: string): { fence: string; content: string } {
  // 找出数据中最长的连续反引号序列
  const backtickSequences = data.match(/`+/g) || []
  let maxBackticks = 0
  for (const seq of backtickSequences) {
    if (seq.length > maxBackticks) {
      maxBackticks = seq.length
    }
  }
  // 围栏需要比数据中最长的反引号序列多至少一个
  const fenceLength = Math.max(3, maxBackticks + 1)
  const fence = '`'.repeat(fenceLength)
  return { fence, content: data }
}

/**
 * 生成 Typst 渲染代码
 * 使用 fenced code block 语法以支持语法高亮
 */
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

  // 转义标题和时间戳（这些是文本内容）
  const escapedFormatName = escapeTypstText(formatName)
  const escapedTimestamp = escapeTypstText(timestamp)
  
  // 使用 fenced code block，并处理数据中可能的反引号
  const { fence, content: codeContent } = escapeFencedCodeBlock(formattedData)

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
  const typstCode = generateTypstCode(formattedData, format, typstTheme, messageMode, cfg)
  
  if (cfg.verboseConsoleLog) {
    const logger = ctx.logger('quote-debug-typst')
    logger.info(`[Typst] 生成的 Typst 代码片段（前 500 字符）：`)
    logger.info(typstCode.substring(0, 500))
    logger.info(`[Typst] ... (总长度: ${typstCode.length} 字符)`)
    
    // 查找并输出 fenced code block 部分
    const fencedMatch = typstCode.match(/(`{3,})(\w+)\n([\s\S]*?)\1/s)
    if (fencedMatch) {
      logger.info(`[Typst] 找到 fenced code block：`)
      logger.info(`[Typst] 围栏: ${fencedMatch[1]}, 语言: ${fencedMatch[2]}, 内容长度: ${fencedMatch[3].length}`)
      logger.info(`[Typst] 代码块前 100 字符: ${fencedMatch[3].substring(0, 100)}`)
    } else {
      logger.warn(`[Typst] 警告：未找到 fenced code block！`)
      // 输出代码中间部分帮助调试
      const midStart = Math.max(0, typstCode.length / 2 - 200)
      logger.info(`[Typst] 代码中间部分: ${typstCode.substring(midStart, midStart + 400)}`)
    }
  }
  
  return sharedRenderer.toPng(typstCode, cfg.dumpTypstRenderScale ?? 2.33)
}



