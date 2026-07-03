export function createUsage(version: string): string {
  return `
<h1>📋 Koishi 插件：quote-debug-msg-json-image</h1>
<h2>🎯 插件版本：v${version}</h2>

<p>回复一条消息，将其渲染为精美的 JSON/YAML/TOML 格式图片。还支持渲染 OneBot 的合并转发消息为图片。</p>

<p><del>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>259248174</b>   🎉（这个群G了</del> </p> 
<p>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>1085190201</b> 🎉</p>
<p>💡 在群里直接艾特我，回复的更快哦~ ✨</p>


<p><b>💡 提示：</b> <a href="https://gitee.com/vincent-zyu/koishi-plugin-quote-debug-msg-json-image" target="_blank">前往 Gitee README 获得更佳观感 → <i>https://gitee.com/vincent-zyu/koishi-plugin-quote-debug-msg-json-image</i></a></p>

<hr>

<h2 style="color: #f44336;">⚠️ 前置依赖（必须安装）</h2>

<table>
<thead>
<tr><th>依赖插件</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td><b>@resvg/resvg-js</b></td><td>Typst 图片渲染（dump 指令）</td></tr>
<tr><td><b>puppeteer</b></td><td>Puppeteer 图片渲染（render-forward 指令）</td></tr>
<tr><td><b>markdown-to-image-service</b></td><td>Markdown 渲染备选方案</td></tr>
</tbody>
</table>

<p style="color: #f44336;"><b>🔴 请确保以上插件已安装并启用，否则本插件无法正常工作！</b></p>

<hr>

<h2>✨ 功能特性</h2>
<ul>
<li>📋 <b>dump 指令</b>：将消息对象序列化为 JSON/YAML/TOML 格式，渲染成图片</li>
<li>📨 <b>render-forward 指令</b>：将合并转发消息渲染成精美的图片</li>
<li>🎨 <b>双渲染引擎</b>：支持 Typst（推荐）和 Markdown 两种渲染模式</li>
<li>🌈 <b>代码语法高亮</b>：JSON/YAML/TOML 自动语法着色</li>
<li>🧵 <b>嵌套转发支持</b>：智能处理多层嵌套的合并转发消息</li>
</ul>

<hr>

<h2>📖 使用方法</h2>

<h3>dump 指令</h3>
<p>回复一条消息并发送指令：</p>
<pre><code>
dump-json          # 渲染为 JSON 格式图片
</code></pre>
<pre><code>
dump-yaml          # 渲染为 YAML 格式图片
</code></pre>
<pre><code>
dump-toml          # 渲染为 TOML 格式图片
</code></pre>

<p><b>可用选项：</b></p>
<ul>
<li><code>-r, --reply-mode &lt;typst|markdown&gt;</code> - 选择渲染引擎</li>
<li><code>-m, --message-mode &lt;forward|image&gt;</code> - 回复模式（合并转发/仅图片）</li>
<li><code>-s, --self</code> - 解析当前消息而非被引用的消息</li>
</ul>

<h3>render-forward 指令</h3>
<p>回复一条合并转发消息并发送：</p>
<pre><code>render-forward     # 渲染合并转发为图片</code></pre>

<p><b>可用选项：</b></p>
<ul>
<li><code>-i, --index &lt;0|1&gt;</code> - 样式选择（0=Source Han Serif 毛玻璃风格, 1=LXGW WenKai 简约风格）</li>
</ul>

<hr>

<p><b>📦 仓库地址：</b> <a href="https://gitee.com/vincent-zyu/koishi-plugin-quote-debug-msg-json-image" target="_blank">Gitee</a></p>
`
}
