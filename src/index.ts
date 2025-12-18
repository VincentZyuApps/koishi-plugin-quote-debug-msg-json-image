import { Context, Schema } from 'koishi'
import { } from 'koishi-plugin-markdown-to-image-service'
import { } from 'koishi-plugin-puppeteer'
import { registerDumpJsonCommand } from './dump-json'
import { registerRenderForwardCommand } from './render-forward'

export const name = 'quote-debug-msg-json-image'

export const inject = {
  required: ['markdownToImage'],
  optional: ['puppeteer'],
}

export interface ThemeColors {
  bg: string
  cardBg: string
  cardBorder: string
  cardShadow: string
  mainText: string
  subText: string
  titleColor: string
  headerBg: string
  messageBg: string
  messageBorder: string
  senderColor: string
  timeColor: string
  atColor: string
  faceColor: string
  imageLabel: string
  nestedBg: string
  nestedBorder: string
  nestedHeaderBg: string
}

export interface Config {
  useNapcatGetMsgInsteadOnOnebot: boolean
  maxJsonTextLength: number
  dumpJsonCommandName: string
  dumpYamlCommandName: string
  dumpTomlCommandName: string
  maxForwardNestDepth: number
  renderForwardCommandName: string
  theme: ThemeColors
}

// 默认粉色系主题 - 灵感来自真寻
const defaultTheme: ThemeColors = {
  bg: '#ffecd2',
  cardBg: '#ffffff',
  cardBorder: '#ffb6c1',
  cardShadow: '#ff6987',
  mainText: '#4a4a4a',
  subText: '#888888',
  titleColor: '#e91e63',
  headerBg: '#f06292',
  messageBg: '#fff5f8',
  messageBorder: '#fce4ec',
  senderColor: '#d81b60',
  timeColor: '#b0a0a8',
  atColor: '#ec407a',
  faceColor: '#ff7043',
  imageLabel: '#ad8b9e',
  nestedBg: '#fce4ec',
  nestedBorder: '#f8bbd9',
  nestedHeaderBg: '#f06292',
}

export const Config: Schema<Config> = Schema.intersect([

  Schema.object({
    useNapcatGetMsgInsteadOnOnebot: Schema.boolean()
      .default(true)
      .description('如果是onebot平台，那么msgObj使用Napcat的get_msg接口获取，而不是koishi的await session.bot.getMessage(')
  }).description('调用的api设置'),

  Schema.object({
    maxJsonTextLength: Schema.number()
      .default(2222)
      .min(50).max(10000).step(1)
      .description('JSON/YAML/TOML文本的最大显示长度，超过该长度将被截断'),
    dumpJsonCommandName: Schema.string()
      .default('dump-json')
      .description('dump-json指令的名称，可自定义'),
    dumpYamlCommandName: Schema.string()
      .default('dump-yaml')
      .description('dump-yaml指令的名称，可自定义'),
    dumpTomlCommandName: Schema.string()
      .default('dump-toml')
      .description('dump-toml指令的名称，可自定义'),
  }).description('dump指令设置'),

  Schema.object({
    maxForwardNestDepth: Schema.number()
      .default(3)
      .min(1).max(10).step(1)
      .description('转发消息的最大嵌套深度，超过该深度将省略, 只显示[合并转发]'),
    renderForwardCommandName: Schema.string()
      .default('render-forward')
      .description('render-forward指令的名称，可自定义'),
    theme: Schema.object({
      bg: Schema.string().role('color').default(defaultTheme.bg).description('背景色'),
      cardBg: Schema.string().role('color').default(defaultTheme.cardBg).description('卡片背景色'),
      cardBorder: Schema.string().role('color').default(defaultTheme.cardBorder).description('卡片边框色'),
      cardShadow: Schema.string().role('color').default(defaultTheme.cardShadow).description('卡片阴影色'),
      mainText: Schema.string().role('color').default(defaultTheme.mainText).description('主文本色'),
      subText: Schema.string().role('color').default(defaultTheme.subText).description('次要文本色'),
      titleColor: Schema.string().role('color').default(defaultTheme.titleColor).description('标题色'),
      headerBg: Schema.string().role('color').default(defaultTheme.headerBg).description('头部背景色'),
      messageBg: Schema.string().role('color').default(defaultTheme.messageBg).description('消息背景色'),
      messageBorder: Schema.string().role('color').default(defaultTheme.messageBorder).description('消息边框色'),
      senderColor: Schema.string().role('color').default(defaultTheme.senderColor).description('发送者名称色'),
      timeColor: Schema.string().role('color').default(defaultTheme.timeColor).description('时间文本色'),
      atColor: Schema.string().role('color').default(defaultTheme.atColor).description('@提及色'),
      faceColor: Schema.string().role('color').default(defaultTheme.faceColor).description('表情色'),
      imageLabel: Schema.string().role('color').default(defaultTheme.imageLabel).description('图片标签色'),
      nestedBg: Schema.string().role('color').default(defaultTheme.nestedBg).description('嵌套转发背景色'),
      nestedBorder: Schema.string().role('color').default(defaultTheme.nestedBorder).description('嵌套转发边框色'),
      nestedHeaderBg: Schema.string().role('color').default(defaultTheme.nestedHeaderBg).description('嵌套转发头部背景色'),
    }).description('渲染主题颜色配置')
  }).description('render-forward指令设置'),

])

export function apply(ctx: Context, cfg: Config) {
  // 注册 dump-json / dump-yaml / dump-toml 指令
  registerDumpJsonCommand(ctx, cfg)

  // 注册 render_forward 指令（需要 puppeteer）
  registerRenderForwardCommand(ctx, cfg)
}
