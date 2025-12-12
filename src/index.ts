import { Context, Schema, h } from 'koishi'
import {} from 'koishi-plugin-markdown-to-image-service'

export const name = 'quote-debug-msg-json-image'

export const inject = {
  required: ['markdownToImage'],
}

export interface Config {
  useNapcatGetMsgInsteadOnOnebot: boolean
}

export const Config: Schema<Config> = Schema.intersect([

  Schema.object({
    useNapcatGetMsgInsteadOnOnebot: Schema.boolean()
    .default(true)
    .description('如果是onebot平台，那么msgObj使用Napcat的get_msg接口获取，而不是koishi的await session.bot.getMessage(')
  })

])

/**
 * 生成合并转发消息
 */
function generateForwardMessage(formattedJson: string, imageBuffer: Buffer): string {
  let messages = ''
  
  const addMessageBlock = (authorName: string, content: string) => {
    messages += `
      <message>
        <author name="${authorName}"/>
        ${content}
      </message>`
  }
  
  // 第一条消息：说明
  addMessageBlock(
    '📋 消息JSON调试',
    [
      `⏰ 查询时间: ${new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `📊 以下是消息的JSON数据（前2000字符）`
    ].join('\n')
  )
  
  // 第二条消息：JSON内容（前2000字符）
  const jsonPreview = formattedJson.length > 2000 
    ? formattedJson.substring(0, 2000) + '\n...\n(内容过长，已截断)'
    : formattedJson
  
  addMessageBlock(
    '📝 JSON数据',
    jsonPreview
  )
  
  // 第三条消息：统计信息
  addMessageBlock(
    '📈 数据统计',
    [
      `━━━━━━━━━━━━━━━━━━━━━`,
      `📏 JSON总长度: ${formattedJson.length} 字符`,
      `📄 显示长度: ${Math.min(formattedJson.length, 2000)} 字符`,
      `✂️ 是否截断: ${formattedJson.length > 2000 ? '是' : '否'}`
    ].join('\n')
  )
  
  // 第四条消息：完整JSON图片
  addMessageBlock(
    '🖼️ 完整JSON图片',
    h.image(imageBuffer, 'image/png').toString()
  )
  
  return `<message forward>\n${messages}\n</message>`
}

export function apply(ctx: Context) {
  // write your plugin here

  ctx.command("dump_json")
    .action( async ( {session, options} ) => {

      if ( !session.quote ) {
        await session.send('请回复一条消息来使用此命令');
        return;
      }

      try {
        // const msgObj = await session.bot.getMessage(session.channelId, session.quote.messageId);
        const msgObj = session.platform === 'onebot'
          ? await session.bot.internal._request('get_msg',{message_id: session.quote.messageId})
          : await session.bot.getMessage(session.channelId, session.quote.messageId);

        // 格式化 JSON 为多行带缩进
        const formattedJson = JSON.stringify(msgObj, null, 2);
        
        // 打印到日志
        ctx.logger.info(`quote.message = ${formattedJson}`);

        // 生成完整的图片版本，使用 HTML 标签调整字体大小
        const markdown = `
<style>
  pre code {
    font-size: 18px !important;
    line-height: 1.3 !important;
  }
</style>

# Quote Message Debug

\`\`\`json
${formattedJson}
\`\`\``;
        const imageBuffer = await ctx.markdownToImage.convertToImage(markdown);

        // 生成合并转发消息（包含图片）
        const forwardMessage = generateForwardMessage(formattedJson, imageBuffer);
        // 发送合并转发消息
        await session.send(forwardMessage);

      } catch (err) {
        const errmsg = `[dump_json] 获取消息或生成图片失败：${err}`;
        ctx.logger.error(errmsg);
        await session.send(errmsg);
      }

    } )

}
