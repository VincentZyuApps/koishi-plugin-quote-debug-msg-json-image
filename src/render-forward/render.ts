import { Context, h } from 'koishi'
import type {} from 'koishi-plugin-puppeteer'
import type { Config } from '../config'
import { resolveConfiguredFontPath } from '../utils/font'
import { getForwardAvatarUrl, loadFontFaceCss, prefetchAvatars } from './assets'
import {
  collectAllUserIds,
  getForwardContent,
  getForwardMessageElements,
  isForwardMessage,
} from './model'
import type { AvatarMap } from './model'
import { generateForwardHtmlTemplate, getForwardRenderStyleFromIndex } from './template'

export function registerRenderForwardCommand(ctx: Context, cfg: Config) {
  const commandName = cfg.renderForwardCommandName || 'render-forward'
  ctx.command(commandName, "渲染合并转发消息为图片")
    .option('index', '-i, --index <index:number> 图片样式索引 (0: Source Han Serif, 1: LXGW WenKai)')
    .action(async ({ session, options }) => {
      if (!session.quote) {
        const hint = '请回复一条合并转发消息来使用此命令'
        await session.send(cfg.enableQuote ? [h.quote(session.messageId), hint] : hint)
        return
      }

      try {
        // 获取被引用的消息
        const msgObj = session.platform === 'onebot' && cfg.useNapcatGetMsgInsteadOnOnebot
          ? await session.bot.internal._request('get_msg', { message_id: session.quote.messageId })
          : await session.bot.getMessage(session.channelId, session.quote.messageId)

        // 调试日志：输出消息对象
        if (cfg.verboseConsoleLog) {
          ctx.logger.info(`[render-forward] 获取到的消息对象: ${JSON.stringify(msgObj, null, 2)}`)
        }

        // 检查是否为合并转发消息
        if (!isForwardMessage(msgObj)) {
          const message = getForwardMessageElements(msgObj)
          let debugInfo = ''

          if (cfg.verboseConsoleLog) {
            const debugText = `\n\n调试信息：\n` +
              `- message 是否为数组: ${Array.isArray(message)}\n` +
              `- message 长度: ${Array.isArray(message) ? message.length : 'N/A'}\n` +
              `- message 内容: ${JSON.stringify(message, null, 2)}`
            ctx.logger.warn(`[render-forward] 消息不是合并转发${debugText}`)

            // 仅在 verboseSessionLog 开启时才在用户消息中包含调试信息
            if (cfg.verboseSessionLog) {
              debugInfo = debugText
            }
          }

          const hint = '该消息不是合并转发消息，无法渲染。\n' +
            '提示：合并转发消息的 message 数组中应有且仅有一个 type 为 "forward" 的元素。\n' +
            '⚠️ 注意：Bot 自己发送的合并转发消息，可能因为协议限制无法再次获取完整内容。请尝试回复其他人发送的合并转发消息。' +
            debugInfo
          await session.send(cfg.enableQuote ? [h.quote(session.messageId), hint] : hint)
          return
        }

        // 获取转发内容
        const forwardContent = getForwardContent(msgObj)
        if (!forwardContent || forwardContent.length === 0) {
          if (cfg.verboseConsoleLog) {
            const message = getForwardMessageElements(msgObj)
            const forwardData = message?.[0]?.data
            ctx.logger.warn(`[render-forward] 无法获取合并转发内容，forward.data = ${JSON.stringify(forwardData, null, 2)}`)
          }
          const hint = '无法获取合并转发消息的内容，可能是消息格式不支持。\n' +
            '⚠️ 可能原因：\n' +
            '1. Bot 自己发送的合并转发消息无法再次获取完整内容（OneBot 协议限制）\n' +
            '2. 合并转发消息的 content 字段为空或格式异常\n' +
            '建议：尝试回复其他人或其他 Bot 发送的合并转发消息。'
          await session.send(cfg.enableQuote ? [h.quote(session.messageId), hint] : hint)
          return
        }

        // 获取转发消息ID
        const message = getForwardMessageElements(msgObj)
        const forwardId = message[0]?.data?.id || 'unknown'

        // 获取最大嵌套深度配置
        const maxDepth = cfg.maxForwardNestDepth ?? 3

        const defaultStyle = cfg.renderForwardDefaultStyle ?? 'source'
        const styleIndex = typeof options.index === 'number' ? options.index : Number(options.index)
        const renderStyle = getForwardRenderStyleFromIndex(
          Number.isFinite(styleIndex) ? styleIndex : undefined,
          defaultStyle
        )

        const fontFamily = 'RenderForwardFont'
        const fontPath = renderStyle === 'source'
          ? resolveConfiguredFontPath(ctx, cfg.renderForwardSourceFontPath, 'SOURCE_HAN')
          : resolveConfiguredFontPath(ctx, cfg.renderForwardLxgwFontPath, 'LXGW')
        const fontFaceCss = await loadFontFaceCss(fontPath, fontFamily)
        const backgroundImageUrl = renderStyle === 'source' ? getForwardAvatarUrl(forwardContent) : null

        // 预获取头像（如果开启了配置）
        let avatarMap: AvatarMap | null = null
        if (cfg.renderForwardPrefetchAvatar !== false) {
          const userIds = collectAllUserIds(forwardContent, maxDepth)
          if (cfg.verboseConsoleLog) {
            ctx.logger.info(`[render-forward] 预获取头像，共 ${userIds.size} 个不重复的用户ID: ${Array.from(userIds).join(', ')}`)
          }
          avatarMap = await prefetchAvatars(ctx, userIds)
          if (cfg.verboseConsoleLog) {
            ctx.logger.info(`[render-forward] 成功预获取 ${avatarMap.size}/${userIds.size} 个头像`)
          }
        }

        // 发送提示消息
        const loadingHint = `正在渲染合并转发消息（共 ${forwardContent.length} 条，最大嵌套 ${maxDepth} 层），请稍候...`
        const hintMsgIds = await session.send(cfg.enableQuote ? [h.quote(session.messageId), loadingHint] : loadingHint)

        // 使用 puppeteer 渲染
        const page = await ctx.puppeteer.page()
        try {
          const maxImageSize = cfg.renderForwardMaxImageSize ?? 50
          const htmlContent = generateForwardHtmlTemplate(
            forwardContent,
            forwardId,
            maxDepth,
            renderStyle,
            fontFaceCss,
            backgroundImageUrl,
            maxImageSize,
            avatarMap
          )

          await page.setViewport({ width: 980, height: 9999 })
          await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 30000 })

          // 等待图片加载
          await page.evaluate(() => {
            return Promise.all(
              Array.from(document.images)
                .filter(img => !img.complete)
                .map(img => new Promise(resolve => {
                  img.onload = img.onerror = resolve
                }))
            )
          })

          const wrapper = await page.$('#content-wrapper') || await page.$('.card') || await page.$('body')
          if (!wrapper) throw new Error('无法获取渲染容器')

          const screenshot = await wrapper.screenshot({
            type: 'png',
            encoding: 'base64'
          })

          // 删除提示消息
          try {
            await session.bot.deleteMessage(session.channelId, hintMsgIds[0])
          } catch (e) {
            // 忽略删除失败
          }

          // 发送渲染结果
          const resultElements = [
            h.text(`合并转发消息渲染完成（共 ${forwardContent.length} 条消息，样式: ${renderStyle}）：\n`),
            h.image(`data:image/png;base64,${screenshot}`)
          ]
          await session.send(cfg.enableQuote ? [h.quote(session.messageId), ...resultElements] : resultElements)

        } finally {
          await page.close()
        }

      } catch (err) {
        const errmsg = `[render_forward] 渲染合并转发消息失败：${err}`
        ctx.logger.error(errmsg)
        await session.send(cfg.enableQuote ? [h.quote(session.messageId), errmsg] : errmsg)
      }
    })
}
