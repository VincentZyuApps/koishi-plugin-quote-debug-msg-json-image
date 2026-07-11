import { escapeHtml, generateMessageItemHtml } from './content'
import type { AvatarMap, ForwardContentItem, ForwardRenderStyle } from './model'

export function getForwardRenderStyleFromIndex(
  index: number | undefined,
  fallback: ForwardRenderStyle,
): ForwardRenderStyle {
  if (index === 0) return 'source'
  if (index === 1) return 'lxgw'
  return fallback
}

export function generateForwardHtmlTemplate(
  content: ForwardContentItem[],
  forwardId: string,
  maxDepth: number,
  style: ForwardRenderStyle,
  fontFaceCss: string,
  backgroundImageUrl: string | null,
  maxImageSize: number,
  avatarMap: AvatarMap | null,
): string {
  const lxgwColors = {
    bg: '#eef2f7',
    cardBg: '#ffffff',
    mainText: '#2b2f36',
    subText: '#6b7280',
    titleColor: '#1f4b99',
    messageBorder: 'rgba(255,255,255,0.8)',
    senderColor: '#1f2937',
    timeColor: '#9aa4b2',
    atColor: '#2563eb',
    faceColor: '#f97316',
    imageLabel: '#64748b',
  }

  const messagesHtml = content.map((item, index) => generateMessageItemHtml(item, index, maxDepth, avatarMap)).join('')
  const timestamp = new Date().toLocaleString('zh-CN')

  const baseCss = `
    *{box-sizing:border-box;margin:0;padding:0;}
    body{margin:0;padding:0;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;}
    #content-wrapper{display:flex;justify-content:center;}
    .card{width:920px;border-radius:32px;position:relative;z-index:2;display:flex;flex-direction:column;overflow:hidden;}
    .header{padding:28px 40px;display:flex;flex-direction:column;gap:14px;text-align:center;border-radius:32px 32px 0 0;}
    .title{font-size:36px;font-weight:800;letter-spacing:.5px;}
    .header-info{display:inline-flex;flex-direction:column;align-items:center;gap:8px;padding:14px 28px;border-radius:20px;}
    .subtitle{font-size:16px;font-weight:700;}
    .forward-id{font-size:13px;font-family:'Consolas','Monaco',monospace;padding:6px 14px;border-radius:10px;}
    .stats{display:flex;justify-content:center;gap:24px;padding:12px 20px;font-size:13px;font-weight:600;}
    .messages-container{padding:20px 28px;display:flex;flex-direction:column;gap:15px;}
    .message-item{border-radius:10px;padding:7px 9px;display:flex;gap:14px;transition:all .3s cubic-bezier(.25,.8,.25,1);}
    .message-avatar{width:60px;height:60px;border-radius:50%;overflow:hidden;flex-shrink:0;}
    .message-avatar img{width:100%;height:100%;object-fit:cover;display:block;}
    .message-main{flex:1;min-width:0;}
    .message-header{display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap;}
    .message-index{padding:4px 12px;border-radius:999px;font-size:13px;font-weight:700;}
    .sender-name{font-weight:800;font-size:16px;}
    .sender-id{font-size:13px;font-weight:600;}
    .message-time{font-size:13px;margin-left:auto;font-weight:500;}
    .message-content{font-size:16px;line-height:1.4;word-wrap:break-word;font-weight:bold;}
    .msg-image{margin:10px 0;}
    .msg-image img{max-width:${maxImageSize}px;max-height:${maxImageSize}px;border-radius:12px;display:block;box-shadow:0 8px 20px rgba(0,0,0,.2);object-fit:contain;}
    .msg-image .img-label{display:block;font-size:13px;margin-top:6px;}
    .msg-at{font-weight:700;}
    .msg-face{font-weight:600;}
    .msg-reply{display:inline-block;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:600;margin-bottom:4px;}
    .msg-forward,.msg-unknown{font-style:italic;}
    .msg-forward-collapsed{font-style:italic;padding:6px 12px;border-radius:10px;display:inline-block;}
    .nested-forward{margin:12px 0;border-radius:12px;overflow:hidden;border:1px solid;}
    .nested-forward-header{padding:10px 16px;font-size:13px;font-weight:700;}
    .nested-forward-content{padding:12px;display:flex;flex-direction:column;gap:10px;}
    .nested-message-item{border-radius:10px;padding:10px 14px;display:flex;gap:12px;}
    .nested-message-avatar{width:40px;height:40px;border-radius:50%;overflow:hidden;flex-shrink:0;}
    .nested-message-avatar img{width:100%;height:100%;object-fit:cover;display:block;}
    .nested-message-main{flex:1;min-width:0;}
    .nested-message-header{display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap;}
    .nested-sender-name{font-weight:700;font-size:13px;}
    .nested-message-time{font-size:12px;margin-left:auto;}
    .nested-message-content{font-size:14px;line-height:1.5;}
    .footer{text-align:center;padding:18px;font-size:13px;border-radius:0 0 32px 32px;}
    .timestamp-watermark{position:fixed;top:1.3px;left:1.3px;font-size:13px;color:rgba(128,128,128,.6);font-family:'Courier New',monospace;z-index:9999;pointer-events:none;text-shadow:0 0 2px rgba(255,255,255,.8);}
  `

  const sourceCss = `
    body{
      font-family:'RenderForwardFont','Source Han Serif SC','Noto Serif SC','Songti SC','STSong',-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol";
      ${backgroundImageUrl ? `background-image:url('${backgroundImageUrl}');` : 'background-color:#f0f2f5;'}
      background-size:cover;
      background-position:center center;
      background-repeat:no-repeat;
    }
    #content-wrapper{
      padding:28px 28px 28px 28px;
    }
    .card{
      background:rgba(255,255,255,.13);
      backdrop-filter:blur(13px) saturate(130%);
      -webkit-backdrop-filter:blur(13px) saturate(130%);
      border-radius:32px;
      box-shadow:0 16px 48px rgba(0,0,0,.3),0 0 0 1px rgba(255,255,255,.25),inset 0 2px 0 rgba(255,255,255,.4);
      padding:0;
      border:1px solid rgba(255,255,255,.3);
      color:#212121;
    }
    .header{
      background:rgba(255,255,255,.25);
      border-bottom:1px solid rgba(255,255,255,.3);
    }
    .title{
      color:#111;
      text-shadow:0 3px 6px rgba(255,255,255,.7);
      background:rgba(255,255,255,.25);
      padding:14px 28px;
      border-radius:20px;
      border:1px solid rgba(255,255,255,.5);
      display:inline-block;
    }
    .header-info{
      background:rgba(255,255,255,.4);
      border:1px solid rgba(255,255,255,.6);
    }
    .subtitle{
      color:#333;
      text-shadow:0 1px 3px rgba(255,255,255,.9);
    }
    .forward-id{
      background:rgba(255,255,255,.6);
      color:#555;
      border:1px solid rgba(255,255,255,.6);
      font-weight:600;
      text-shadow:0 1px 2px rgba(255,255,255,.8);
    }
    .stats{
      background:rgba(255,255,255,.2);
      color:#555;
      border-bottom:1px solid rgba(255,255,255,.3);
      text-shadow:0 1px 2px rgba(255,255,255,.8);
    }
    .message-item{
      background:rgba(255,255,255,.5);
      border:1px solid rgba(255,255,255,.8);
      box-shadow:3px 3px 9px rgba(0,0,0,0.3);
    }
    .message-avatar{
      border:2px solid rgba(255,255,255,.7);
      box-shadow:0 6px 16px rgba(0,0,0,.25);
    }
    .message-index{
      background:rgba(255,255,255,.55);
      color:#111;
      border:1px solid rgba(255,255,255,.7);
      text-shadow:0 1px 2px rgba(255,255,255,.8);
    }
    .sender-name{
      color:#111;
      text-shadow:0 1px 2px rgba(255,255,255,.8);
    }
    .sender-id{
      color:#555;
      background:rgba(255,255,255,.4);
      padding:4px 10px;
      border-radius:8px;
      border:1px solid rgba(255,255,255,.6);
      text-shadow:0 1px 2px rgba(255,255,255,.8);
    }
    .message-time{
      color:#555;
      text-shadow:0 1px 2px rgba(255,255,255,.8);
    }
    .message-content{
      color:#212121;
      text-shadow:0 1px 2px rgba(255,255,255,.8);
    }
    .msg-at{color:#007bff;}
    .msg-face{color:#ff7043;}
    .msg-reply{background:rgba(255,255,255,.4);color:#555;border:1px solid rgba(255,255,255,.6);border-left:3px solid #007bff;}
    .msg-forward,.msg-unknown{color:#777;}
    .msg-forward-collapsed{
      color:#333;
      background:rgba(255,255,255,.5);
      border:1px solid rgba(255,255,255,.6);
    }
    .msg-image .img-label{color:#666;text-shadow:0 1px 2px rgba(255,255,255,.8);}
    .nested-forward{
      border-color:rgba(255,255,255,.6);
      background:rgba(255,255,255,.2);
      box-shadow:inset 0 2px 8px rgba(0,0,0,.1);
    }
    .nested-forward-header{
      background:rgba(255,255,255,.4);
      color:#111;
      border-bottom:1px solid rgba(255,255,255,.5);
      text-shadow:0 1px 2px rgba(255,255,255,.8);
    }
    .nested-message-item{
      background:rgba(255,255,255,.5);
      border:1px solid rgba(255,255,255,.7);
      box-shadow:2px 2px 6px rgba(0,0,0,.2);
    }
    .nested-message-avatar{
      border:3px solid rgba(255,255,255,.7);
      box-shadow:0 6px 16px rgba(0,0,0,.2);
    }
    .nested-sender-name{
      color:#111;
      text-shadow:0 1px 2px rgba(255,255,255,.8);
    }
    .nested-message-time{
      color:#666;
      text-shadow:0 1px 2px rgba(255,255,255,.8);
    }
    .nested-message-content{
      color:#212121;
      text-shadow:0 1px 2px rgba(255,255,255,.8);
    }
    .footer{
      color:#666;
      border-top:1px solid rgba(255,255,255,.3);
      background:rgba(255,255,255,.2);
      text-shadow:0 1px 2px rgba(255,255,255,.8);
    }
  `

  const lxgwCss = `
    body {
      font-family: 'RenderForwardFont','LXGW WenKai','LXGW WenKai Screen','LXGW WenKai Mono','Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif;
      background: ${lxgwColors.bg};
    }
    #content-wrapper{
      padding:28px;
    }
    .card {
      background: ${lxgwColors.cardBg};
      border: 1px solid ${lxgwColors.messageBorder};
      box-shadow: 0 12px 32px rgba(15,23,42,0.12);
    }
    .header {
      color: ${lxgwColors.titleColor};
      background: linear-gradient(180deg, rgba(37,99,235,0.08), rgba(37,99,235,0.02));
    }
    .header-info {
      background: rgba(255,255,255,0.8);
      border: 1px solid ${lxgwColors.messageBorder};
      color: ${lxgwColors.subText};
    }
    .forward-id { background: rgba(148,163,184,0.15); color: ${lxgwColors.subText}; }
    .stats { background: #f8fafc; color: ${lxgwColors.subText}; border-top: 1px solid ${lxgwColors.messageBorder}; border-bottom: 1px solid ${lxgwColors.messageBorder}; }
    .message-item {
      background: #ffffff;
      border: 1px solid ${lxgwColors.messageBorder};
    }
    .message-index { background: rgba(37,99,235,0.12); color: ${lxgwColors.titleColor}; }
    .sender-name { color: ${lxgwColors.senderColor}; }
    .sender-id { color: ${lxgwColors.subText}; }
    .message-time { color: ${lxgwColors.timeColor}; }
    .message-content { color: ${lxgwColors.mainText}; }
    .msg-at { color: ${lxgwColors.atColor}; }
    .msg-face { color: ${lxgwColors.faceColor}; }
    .msg-reply { background: rgba(37,99,235,0.08); color: ${lxgwColors.titleColor}; border: 1px solid rgba(37,99,235,0.2); border-left: 3px solid ${lxgwColors.atColor}; }
    .msg-forward, .msg-unknown { color: ${lxgwColors.subText}; }
    .msg-forward-collapsed { color: ${lxgwColors.titleColor}; background: rgba(37,99,235,0.08); }
    .msg-image .img-label { color: ${lxgwColors.imageLabel}; }
    .nested-forward { border-color: ${lxgwColors.messageBorder}; background: rgba(248,250,252,0.9); }
    .nested-forward-header { background: rgba(37,99,235,0.12); color: ${lxgwColors.titleColor}; }
    .nested-message-item { background: #fff; }
    .nested-sender-name { color: ${lxgwColors.senderColor}; }
    .nested-message-time { color: ${lxgwColors.timeColor}; }
    .nested-message-content { color: ${lxgwColors.mainText}; }
    .footer { color: ${lxgwColors.subText}; border-top: 1px solid ${lxgwColors.messageBorder}; }
  `

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        ${fontFaceCss}
        ${baseCss}
        ${style === 'source' ? sourceCss : lxgwCss}
      </style>
    </head>
    <body>
      <div id="content-wrapper">
        <div class="card">
          <div class="header">
            <div class="title">📨 合并转发消息</div>
            <div class="header-info">
              <div class="subtitle">共 ${content.length} 条消息</div>
              <div class="forward-id">ID: ${escapeHtml(forwardId)}</div>
            </div>
          </div>
          <div class="stats">
            <span>📅 渲染时间: ${timestamp}</span>
            <span>🔄 最大嵌套: ${maxDepth}层</span>
          </div>
          <div class="messages-container">
            ${messagesHtml}
          </div>
          <div class="footer">
            Generated by koishi-plugin-quote-debug-msg-json-image
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}
