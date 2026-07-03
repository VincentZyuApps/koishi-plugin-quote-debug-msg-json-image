![koishi-plugin-quote-debug-msg-json-image](https://socialify.git.ci/VincentZyuApps/koishi-plugin-quote-debug-msg-json-image/image?custom_description=%F0%9F%93%8B%E6%8A%8A%E4%B8%80%E6%9D%A1%E6%B6%88%E6%81%AF%E7%94%A8json%2Fyaml%2Ftoml%E7%9A%84%E6%A0%BC%E5%BC%8F%E6%B8%B2%E6%9F%93%E6%88%90%E5%9B%BE%E7%89%87%EF%BC%8C%F0%9F%8E%A8%E6%94%AF%E6%8C%81typst%E6%88%96%E8%80%85markdown%E3%80%82%E8%BF%98%E6%94%AF%E6%8C%81%E7%94%A8puppeteer%E6%B8%B2%E6%9F%93onebot%E7%9A%84%E5%90%88%E5%B9%B6%E8%BD%AC%E5%8F%91%E6%88%90%E5%9B%BE%E7%89%87%F0%9F%96%BC%EF%B8%8F&description=1&font=Bitter&forks=1&issues=1&language=1&logo=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Ff%2Ff3%2FKoishi.js_Logo.png%3F_%3D20230331182243&name=1&owner=1&pulls=1&stargazers=1&theme=Auto)

# 📋 koishi-plugin-quote-debug-msg-json-image

[![npm](https://img.shields.io/npm/v/koishi-plugin-quote-debug-msg-json-image?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-quote-debug-msg-json-image)
[![npm-download](https://img.shields.io/npm/dm/koishi-plugin-quote-debug-msg-json-image?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-quote-debug-msg-json-image)

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/VincentZyuApps/koishi-plugin-quote-debug-msg-json-image)
[![Gitee](https://img.shields.io/badge/Gitee-C71D23?style=for-the-badge&logo=gitee&logoColor=white)](https://gitee.com/vincent-zyu/koishi-plugin-quote-debug-msg-json-image)
[![Koishi Forum](https://img.shields.io/badge/forum.koishi.xyz_topic_12379-5546A3?style=for-the-badge&logo=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Ff%2Ff3%2FKoishi.js_Logo.png&logoColor=white)](https://forum.koishi.xyz/t/topic/12379)
[![QQ群](https://img.shields.io/badge/QQ群-1085190201-12B7F5?style=flat-square&logo=qq&logoColor=white)](https://qm.qq.com/q/4vjto4V7Di)

<p><del>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>259248174</b>（这个群G了）</del></p>
<p>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>1085190201</b></p>
<p>💡 在群里直接艾特我，回复得更快。</p>

回复一条消息，将其渲染为 JSON/YAML/TOML 格式图片，避免消息对象过长导致聊天平台刷屏或截断。dump 指令支持 Typst / Markdown 两种图片渲染方式，并适配 OneBot 与 QQ 官方 Bot 的引用消息。另提供 `render-forward` 指令，将 OneBot 合并转发消息渲染成图片。

## ✨ 功能特性

- 📋 **dump 指令**：将消息对象序列化为 JSON/YAML/TOML，并渲染为图片
- 🤖 **QQ 官方 Bot 引用适配**：解析 QQ 原始事件中的 `msg_idx` / `ref_msg_idx` / `message_reference` / `msg_elements`
- 🎨 **双渲染引擎**：支持 Typst（推荐）和 Markdown
- 🌈 **代码语法高亮**：JSON/YAML/TOML 自动语法着色
- 😀 **彩色 emoji**：Typst 模式使用 `NotoColorEmoji.ttf` 修复 raw JSON/YAML/TOML 中的 emoji 渲染
- 📨 **render-forward 指令**：将 OneBot 合并转发消息渲染成图片
- 🧵 **嵌套转发支持**：递归处理多层嵌套，并支持最大深度限制

## 📦 依赖说明

### Koishi 服务依赖

插件当前声明的必需服务：

```yaml
required:
  - markdownToImage   # koishi-plugin-markdown-to-image-service
  - puppeteer         # koishi-plugin-puppeteer
```

说明：

- `koishi-plugin-markdown-to-image-service`：Markdown 渲染备选方案。
- `koishi-plugin-puppeteer`：`render-forward` 合并转发截图渲染。
- 当前版本 **不再依赖** `koishi-plugin-to-image-service`。
- 当前版本 **不再依赖** `koishi-plugin-w-node`。

### npm 运行时依赖

这些依赖会随插件安装，不需要作为 Koishi 服务启用：

```json
{
  "@iarna/toml": "^2.2.5",
  "@myriaddreamin/typst-ts-node-compiler": "^0.7.0-rc2",
  "@resvg/resvg-js": "^2.6.2",
  "js-yaml": "^4.1.1",
  "koishi-plugin-markdown-to-image-service": "^1.3.6",
  "koishi-plugin-puppeteer": "^3.0.0"
}
```

### 渲染流程

```text
dump-json / dump-yaml / dump-toml
  -> 获取被引用消息 / 当前消息
  -> JSON / YAML / TOML 序列化
  -> Typst 模式:
       typst-ts-node-compiler -> SVG -> @resvg/resvg-js -> PNG
  -> Markdown 模式:
       markdown-to-image-service -> 图片
```

```mermaid
flowchart TD
  A["dump-json / dump-yaml / dump-toml"] --> B["获取被引用消息 / 当前消息"]
  B --> C["JSON / YAML / TOML 序列化"]
  C --> D{"渲染模式"}
  D -->|"Typst"| E["typst-ts-node-compiler"]
  E --> F["SVG"]
  F --> G["@resvg/resvg-js"]
  G --> H["PNG 图片"]
  D -->|"Markdown"| I["markdown-to-image-service"]
  I --> H
```

```text
render-forward
  -> 获取 OneBot 合并转发消息
  -> HTML 模板
  -> Puppeteer 截图
  -> PNG
```

```mermaid
flowchart TD
  A["render-forward"] --> B["获取 OneBot 合并转发消息"]
  B --> C["HTML 模板"]
  C --> D["Puppeteer 截图"]
  D --> E["PNG 图片"]
```

## 🚀 使用方法

### dump 指令

回复一条消息并发送：

```text
dump-json
dump-yaml
dump-toml
```

可用选项：

- `-r, --reply-mode <typst|markdown>`：选择渲染引擎。
- `-m, --message-mode <forward|image>`：回复模式。非 OneBot 平台会自动回退为 `image`。
- `-s, --self`：解析当前消息本身，而不是被引用的消息。

效果预览：

![dump-json 效果预览](doc/dump-json-preview.png)

### render-forward 指令

回复一条 OneBot 合并转发消息并发送：

```text
render-forward
```

可用选项：

- `-i, --index <0|1>`：样式选择，`0` = Source Han Serif 毛玻璃风格，`1` = LXGW WenKai 简约风格。

效果预览：

| Source Han Serif 风格 (index=0) | LXGW WenKai 风格 (index=1) |
|:---:|:---:|
| ![Source 风格预览](doc/render-forward-source-preview.png) | ![LXGW 风格预览](doc/render-forward-lxgw-preview.png) |

## 🤖 QQ 官方 Bot 引用适配

QQ 官方 Bot 平台下，Koishi 不一定会把被引用消息填入 `session.quote`。本插件会额外解析 QQ 原始事件：

- `(session as any).qq.d`
- `message_scene.ext` 中的 `msg_idx` / `ref_msg_idx`
- `message_reference.message_id`
- `msg_elements[0].msg_idx`
- `session.event.message.quote`

插件还会注册一个轻量 middleware，缓存机器人在线期间收到的 QQ 消息索引。dump 指令会优先尝试通过 `bot.internal.getMessage()` 获取原始被引用消息；失败时再 fallback 到 `session.quote`、内存缓存或 `msg_elements[0]`。

注意：

- QQ 平台的 `dumpMessageMode=forward` 会自动回退为 `image`。
- `render-forward` 仍然是 OneBot 合并转发消息专用功能，不是 QQ 官方普通引用消息渲染。

## 🔤 字体与 emoji

默认开启 `downloadFontsFromRelease`。插件会从 Release 下载字体到 Koishi 运行目录的公共字体目录：

```text
ctx.baseDir/data/fonts
```

下载时会校验文件大小和 SHA256，避免把错误页、半截下载文件或损坏文件当字体使用。

默认管理的字体：

| 文件 | 用途 |
|---|---|
| `LXGWWenKaiMono-Medium.ttf` | dump Typst 主字体；render-forward LXGW 风格字体 |
| `SourceHanSerifSC-Medium.otf` | render-forward Source 风格字体；Typst fallback |
| `NotoColorEmoji.ttf` | Typst 彩色 emoji 字体 |
| `LICENSE` | Noto Color Emoji 的 OFL 1.1 许可证文件 |

Release 下载配置：

| 配置项 | 说明 |
|---|---|
| `downloadFontsFromRelease` | 是否从 Release 自动下载字体 |
| `notoEmojiFontReleaseUrl` | `NotoColorEmoji.ttf` 的 Release 下载地址 |
| `lxgwFontReleaseUrl` | `LXGWWenKaiMono-Medium.ttf` 的 Release 下载地址 |
| `sourceHanFontReleaseUrl` | `SourceHanSerifSC-Medium.otf` 的 Release 下载地址 |

字体路径配置：

| 配置项 | 用途 |
|---|---|
| `dumpTypstFontPath` | dump Typst 主字体路径 |
| `renderForwardSourceFontPath` | render-forward Source 风格字体路径 |
| `renderForwardLxgwFontPath` | render-forward LXGW 风格字体路径 |

`NotoColorEmoji.ttf` 不单独暴露本地路径配置，默认使用 `ctx.baseDir/data/fonts/NotoColorEmoji.ttf`。如果关闭自动下载，需要自行把同名文件放到该目录。

## 🔧 技术实现细节

### 语法高亮资源

npm 包内仍会发布 `syntaxes` 目录作为内置种子文件。插件启动时会把这三个 `sublime-syntax` 文件复制到 Koishi 运行目录：

```text
ctx.baseDir/data/assets/quote-debug-msg-json-image/syntaxes
```

Typst 编译器的 workspace 会指向 `ctx.baseDir/data/assets/quote-debug-msg-json-image`，符合 Koishi 运行时文件不写入插件包目录的零占用习惯。

### Typst 渲染

Typst 内置多种编程语言的语法高亮。本插件使用 Fenced Code Block 语法触发高亮：

````typst
```json
{"key": "value", "count": 42}
```
````

Typst 的 `#raw(variable, lang: "json")` 对变量内容不会触发语法高亮，所以插件会把序列化后的数据直接嵌入 Typst 源码中的 fenced block。

### resvg 兼容性修复

Typst 生成的 SVG 会使用 CSS 变量设置字形颜色，例如：

```css
.outline_glyph path { fill: var(--glyph_fill); }
```

`@resvg/resvg-js` 对这类 CSS 变量支持不完整。插件在 SVG 转 PNG 前会移除相关规则，让颜色从父级 `fill` 继承，避免文字颜色异常。

### Markdown 渲染

Markdown 渲染使用 `koishi-plugin-markdown-to-image-service`，通过标准 Markdown fenced code block 实现语法高亮：

````markdown
```json
{"key": "value"}
```
````

### 合并转发渲染

`render-forward` 使用 Puppeteer 将 HTML 页面截图为图片：

- Source Han Serif 风格：毛玻璃背景，头像作为背景图。
- LXGW WenKai 风格：简洁浅色卡片。
- 支持头像预获取并转为 base64，减少 Puppeteer 加载远程头像失败的概率。
- 支持嵌套合并转发，达到 `maxForwardNestDepth` 后折叠显示。

## ⚙️ 主要配置项

### dump 指令

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `dumpRenderMode` | `typst` / `markdown` | `typst` | 默认渲染引擎 |
| `dumpTypstFooterText` | `string` | `🧩 Generated by *koishi-plugin-quote-debug-msg-json-image*` | Typst 图片底部署名文本 |
| `dumpMessageMode` | `forward` / `image` | `forward` | 回复模式，非 OneBot 会回退到 `image` |
| `maxJsonTextLength` | `number` | `2222` | 合并转发模式下预览文本最大长度 |
| `dumpTypstRenderScale` | `number` | `2.33` | Typst 渲染缩放倍率 |
| `dumpTypstPageBgColor` | `string` | `#f9efe2` | Typst 页面背景色 |
| `dumpTypstCodeBlockFillColor` | `string` | `#ffffff` | Typst 代码块背景色 |
| `dumpSyntaxAssetFolderRelativePath` | `string[]` | `data/assets/quote-debug-msg-json-image/syntaxes` | 相对于 Koishi 根目录 `ctx.baseDir` 的语法高亮文件夹路径 |
| `dumpJsonSyntaxFilename` | `string` | `json.sublime-syntax.yml` | JSON 语法高亮文件名 |
| `dumpYamlSyntaxFilename` | `string` | `yaml.sublime-syntax.yml` | YAML 语法高亮文件名 |
| `dumpTomlSyntaxFilename` | `string` | `toml.sublime-syntax.yml` | TOML 语法高亮文件名 |

### render-forward

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `maxForwardNestDepth` | `number` | `3` | 最大嵌套深度 |
| `renderForwardDefaultStyle` | `source` / `lxgw` | `source` | 默认渲染风格 |
| `renderForwardMaxImageSize` | `number` | `50` | 合并转发内图片长边最大显示尺寸 |
| `renderForwardPrefetchAvatar` | `boolean` | `true` | 是否预获取 QQ 头像并转为 base64 |

## 📝 更新日志

详见 [changelog.md](changelog.md)。
