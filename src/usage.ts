const KOISHI_LOGO_BASE64 = 'data%3Aimage%2Fpng%3Bbase64%2CiVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAABU0lEQVR42p2UQSsFYRSGnxnqLuytKWKpKFkQNsS%2FsOHPWPADLCmxU5S7UzYWNrJR7lYiRF2FeWzOMKZ7mXHqNNP5vvP2nu%2B850CY2lP4X1K31ZbaDm%2BpO%2Bpyp5wfAXVEPfRvO1JHf4AVQGbUh7j4EZ4VkrNCXPVRnf3CUBN1SH2KC28VGOV3ntRhNclZHdcAKYM11QR1oVBOXctzFlNgBTC8qmXxPQEegbVeYApIgJT6tg%2F0AdMp0B%2FBpCabK2AAmAAa%2F2GRBft1oBFPkqTAba7LCiAfQC9wClwAY1HJHepuiO29Yrsf1Dn1uiDU3RTYCtTkl1Leg8k9MB4NGgReI28rV3azgyCz0og01Xl1Uz1QX8uCTELm3UbkTF1VJ9Wr0tn3iBSGdjYG0XivE3VN3VD31PM4a3cc2tIGGI0VkTO7rLxGuiy25ejmjfqsvkSXui62TxaK03td4FXTAAAAAElFTkSuQmCC'

export function createUsage(version: string): string {
  return `
<h1>📋 Koishi 插件：quote-debug-msg-json-image</h1>
<h2>🎯 插件版本：v${version}</h2>

<p>
  <a href="https://www.npmjs.com/package/koishi-plugin-quote-debug-msg-json-image" target="_blank">
    <img src="https://img.shields.io/npm/v/koishi-plugin-quote-debug-msg-json-image?style=flat-square&logo=npm" alt="npm version">
  </a>
  <a href="https://www.npmjs.com/package/koishi-plugin-quote-debug-msg-json-image" target="_blank">
    <img src="https://img.shields.io/npm/dm/koishi-plugin-quote-debug-msg-json-image?style=flat-square&logo=npm" alt="npm downloads">
  </a>
  <br>
  <a href="https://github.com/VincentZyuApps/koishi-plugin-quote-debug-msg-json-image" target="_blank">
    <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
  </a>
  <a href="https://gitee.com/vincent-zyu/koishi-plugin-quote-debug-msg-json-image" target="_blank">
    <img src="https://img.shields.io/badge/Gitee-C71D23?style=for-the-badge&logo=gitee&logoColor=white" alt="Gitee">
  </a>
  <br>
  <a href="https://forum.koishi.xyz/t/topic/12379" target="_blank">
    <img src="https://img.shields.io/badge/Koishi%20Forum-12379-5546A3?style=for-the-badge&logo=${KOISHI_LOGO_BASE64}&logoColor=white" alt="Koishi Forum">
  </a>
  <a href="https://qm.qq.com/q/4vjto4V7Di" target="_blank">
    <img src="https://img.shields.io/badge/QQ群-1085190201-12B7F5?style=flat-square&logo=qq&logoColor=white" alt="QQ群">
  </a>
  <br>
</p>

<p>回复一条消息，将消息对象序列化为 JSON/YAML/TOML。dump 指令支持 Typst / Markdown 图片渲染，也支持 QQ 原生 Markdown 与其他平台的 Markdown 源文本。</p>
<p>另提供 <code>render-forward</code> 指令，用 Puppeteer 将 OneBot 合并转发消息渲染为图片。</p>

<p><del>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>259248174</b>（这个群G了）</del></p>
<p>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>1085190201</b></p>
<p>💡 在群里直接艾特我，回复得更快。</p>

<p><b>💡 提示：</b> <a href="https://gitee.com/vincent-zyu/koishi-plugin-quote-debug-msg-json-image" target="_blank">前往 Gitee README 获得更完整说明 → <i>https://gitee.com/vincent-zyu/koishi-plugin-quote-debug-msg-json-image</i></a></p>

<hr>

<h2>⚠️ 依赖说明</h2>

<p><b>核心运行时依赖：</b><code>@iarna/toml</code>、<code>@myriaddreamin/typst-ts-node-compiler</code>、<code>@resvg/resvg-js</code>、<code>js-yaml</code> 会随插件安装，用于 JSON/YAML/TOML 序列化和 Typst 出图。</p>

<table>
<thead>
<tr><th>依赖</th><th>类型</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td><b>koishi-plugin-markdown-to-image-service</b></td><td>可选 Koishi 服务</td><td>仅 Markdown 图片渲染模式需要 <code>markdownToImage</code> 服务；<code>qq-markdown</code> 不依赖</td></tr>
<tr><td><b>koishi-plugin-puppeteer</b></td><td>可选 Koishi 服务</td><td>仅 <code>render-forward</code> 合并转发截图渲染需要 <code>puppeteer</code> 服务</td></tr>
<tr><td><b>@myriaddreamin/typst-ts-node-compiler</b></td><td>npm 运行时依赖</td><td>Typst 编译为 SVG</td></tr>
<tr><td><b>@resvg/resvg-js</b></td><td>npm 运行时依赖</td><td>Typst SVG 转 PNG</td></tr>
</tbody>
</table>

<p><b>注意：</b>Typst dump 和 <code>qq-markdown</code> 不依赖 <code>markdownToImage</code> 或 <code>puppeteer</code> 服务。未启用 <code>markdownToImage</code> 时，Markdown 图片渲染模式会在执行时给出提示；<code>render-forward</code> 会通过 <code>ctx.inject(['puppeteer'], ...)</code> 注册，未启用 <code>puppeteer</code> 时不会注册该命令。</p>
<p><b>当前版本不再依赖</b> <code>koishi-plugin-to-image-service</code> 和 <code>koishi-plugin-w-node</code>。</p>

<hr>

<h2>✨ 功能特性</h2>
<ul>
<li>📋 <b>dump 指令</b>：将消息对象序列化为 JSON/YAML/TOML，并输出为图片、合并转发或 Markdown</li>
<li>🤖 <b>QQ 官方 Bot 引用适配</b>：不再只依赖 <code>session.quote</code>，会解析 QQ 原始事件里的引用信息</li>
<li>🎨 <b>双渲染引擎</b>：支持 Typst（推荐）和 Markdown 两种渲染模式</li>
<li>💬 <b>QQ 原生 Markdown</b>：QQ 群聊/C2C 发送原生 Markdown，其他平台发送同一份 Markdown 源文本</li>
<li>🔗 <b>QQ Markdown 引用开关</b>：默认不附加引用；同时开启 <code>enableQuote</code> 与 <code>qqMarkdownRespectEnableQuote</code> 后才会尝试发送 <code>message_reference</code></li>
<li>🌈 <b>代码语法高亮</b>：JSON/YAML/TOML 自动语法着色</li>
<li>😀 <b>彩色 emoji</b>：Typst 模式使用 Noto Color Emoji 修复 raw JSON/YAML/TOML 中的 emoji 渲染</li>
<li>📨 <b>render-forward</b>：将 OneBot 合并转发消息渲染成图片</li>
<li>🧵 <b>嵌套转发支持</b>：支持多层嵌套并可限制最大深度</li>
</ul>

<hr>

<h2>📖 使用方法</h2>

<h3>dump 指令</h3>
<p>回复一条消息并发送：</p>
<pre>
<code>
dump-json
</code>
<code>
dump-yaml
</code>
<code>
dump-toml
</code>
</code>
</pre>

<p><b>可用选项：</b></p>
<ul>
<li><code>-r, --reply-mode &lt;typst|markdown&gt;</code> - 选择渲染引擎</li>
<li><code>-m, --message-mode &lt;forward|image|qq-markdown&gt;</code> - 回复模式；<code>qq-markdown</code> 在 QQ 发送原生 Markdown，在其他平台发送 Markdown 源文本，失败不回退图片</li>
<li><code>-s, --self</code> - 解析当前消息本身，而不是被引用的消息</li>
</ul>

<h3>render-forward 指令</h3>
<p>回复一条 OneBot 合并转发消息并发送：</p>
<pre><code>render-forward</code></pre>

<p><b>可用选项：</b></p>
<ul>
<li><code>-i, --index &lt;0|1&gt;</code> - 样式选择，0=Source Han Serif 毛玻璃风格，1=LXGW WenKai 简约风格</li>
</ul>

<hr>

<h2>🔤 字体说明</h2>
<p>默认会从 Release 下载字体到 Koishi 运行目录的 <code>ctx.baseDir/data/fonts</code> 公共字体目录，并校验文件大小和 SHA256。</p>
<ul>
<li><code>LXGWWenKaiMono-Medium.ttf</code>：dump Typst 主字体与 render-forward LXGW 风格字体</li>
<li><code>SourceHanSerifSC-Medium.otf</code>：render-forward Source 风格字体，也作为 Typst fallback</li>
<li><code>NotoColorEmoji.ttf</code>：Typst 彩色 emoji 字体</li>
<li><code>LICENSE</code>：Noto Color Emoji 的 OFL 1.1 许可证文件</li>
</ul>

<p>可以关闭 <code>downloadFontsFromRelease</code> 后手动放置字体，或在配置项里修改 LXGW / Source Han 的字体路径。Noto emoji 默认路径为 <code>ctx.baseDir/data/fonts/NotoColorEmoji.ttf</code>。</p>

<hr>

<h2>🌈 语法高亮资源</h2>
<p>npm 包内保留 <code>syntaxes</code> 目录作为内置种子文件。插件启动时会把 JSON/YAML/TOML 的 <code>sublime-syntax</code> 文件复制到：</p>
<pre><code>ctx.baseDir/data/assets/quote-debug-msg-json-image/syntaxes</code></pre>
<p>目录由 <code>dumpSyntaxAssetFolderRelativePath</code> 配置，表示相对于 Koishi 根目录 <code>ctx.baseDir</code> 的文件夹路径；文件名由 <code>dumpJsonSyntaxFilename</code> / <code>dumpYamlSyntaxFilename</code> / <code>dumpTomlSyntaxFilename</code> 配置。Typst 编译器 workspace 会使用 <code>ctx.baseDir/data/assets/quote-debug-msg-json-image</code>，避免运行时写入插件包目录。</p>

<hr>

<p><b>📦 仓库地址：</b> <a href="https://gitee.com/vincent-zyu/koishi-plugin-quote-debug-msg-json-image" target="_blank">Gitee</a></p>
`
}
