# 📜 Changelog

## 🚧 Unreleased

### ✨ Added

- 💬 为 `dump-json` / `dump-yaml` / `dump-toml` 新增 `qq-markdown` 消息模式。
- 🤖 QQ 群聊/C2C 通过统一的 `bot.internal.sendMessage()` / `sendPrivateMessage()` payload 发送原生 Markdown。
- 🧾 非 QQ 平台在 `qq-markdown` 模式下发送同一份 Markdown 源文本，并用 `h.text()` 防止 dump 内容被解析成消息元素。
- 🔗 新增 `qqMarkdownRespectEnableQuote` 配置，默认关闭；仅当它与 `enableQuote` 同时开启时，QQ 原生 Markdown 才会尝试构造 best-effort `message_reference`。
- 🧱 JSON/YAML/TOML 原生 Markdown 使用动态 fenced code block，避免内容中的连续反引号提前闭合代码块。

### 🔄 Changed

- 📝 `qq-markdown` 输出统一包含 Markdown 生效提示与 `# Quote Message Debug (FORMAT)` 标题。
- 🛡️ QQ 原生 Markdown 默认不再附加 `message_reference`，避免部分接口组合将 Markdown 退化为普通文本。
- 🚫 QQ 原生 Markdown 发送失败、内容过长或平台拒绝时不会回退图片、截断或拆分，只返回错误信息。
- 📏 `maxJsonTextLength` 明确仅控制合并转发模式的文本预览长度。

## 🧩 v0.4.4-beta.8+20260703

### 🔄 Changed

- 📦 版本号从 `0.4.3-beta.7+20260703` 更新到 `0.4.4-beta.8+20260703`。
- 🧩 将 `markdownToImage` 和 `puppeteer` 从 required 服务改为 optional 服务。
- 🖼️ 将 `dumpMessageMode` 默认值从 `forward` 改为 `image`，提升跨平台默认可用性。
- 📦 dump 的 `forward` 回复模式仅允许在 `onebot` / `red` / `discord` 平台使用，其他平台自动回退为 `image`。
- 📦 将 `koishi-plugin-markdown-to-image-service` 和 `koishi-plugin-puppeteer` 从 `dependencies` 移到 optional peer dependencies。
- 🧾 在 `package.json` 中新增 `peerDependenciesMeta`，明确两个服务插件都是可选依赖。
- 🛠️ 将两个可选服务插件保留在 `devDependencies`，用于源码开发和类型声明合并。
- 🍵 在 `package.json` 中新增 `koishi.service.optional`，声明可选服务：
  - `markdownToImage`
  - `puppeteer`

### 🐛 Fixed

- 🧯 移除可选服务插件的运行时空 import，避免未安装可选插件时加载主插件失败。
- 📝 Markdown 渲染模式会在缺少 `markdownToImage` 服务时给出明确提示。
- 📨 `render-forward` 改为通过 `ctx.inject(['puppeteer'], ...)` 注册，跟随 `puppeteer` 服务生命周期自动注册和回收。

### 📝 Documentation

- 📖 README 将依赖说明改为“核心运行时依赖 + 可选功能依赖”。
- 🧭 README 和 usage 明确 Typst dump 不依赖 `markdownToImage` 或 `puppeteer`。
- 🌈 README 补充 npm 包内 `syntaxes` 路径、源码开发路径和默认复制行为。
- 📋 README 的 `dumpSyntaxAssetFolderRelativePath` 默认值改为数组形式。
- 🔤 usage 补充代码语法高亮功能点和 `LICENSE` 文件说明。

## 🧱 v0.4.3-beta.7+20260703

### 🔄 Changed

- 📦 版本号从 `0.4.1-beta.5+20260703` 更新到 `0.4.3-beta.7+20260703`。
- 🗂️ 整理 `src` 目录结构，将不同职责的源码移动到更清晰的子目录：
  - 📋 `dump-markdown.ts` → `dump/markdown.ts`
  - 🎨 `dump-typst.ts` → `dump/typst.ts`
  - 📨 `render-forward.ts` → `render/forward.ts`
  - 🔤 `font-utils.ts` → `utils/font.ts`
  - 🌈 `syntax-utils.ts` → `utils/syntax.ts`
  - 🤖 `qq-quote.ts` → `qq.ts`
- 🧩 保留 `index.ts` / `config.ts` / `usage.ts` 在根目录作为插件入口、配置和说明文件。
- 🔗 同步调整所有 `import` 路径，保持插件运行行为不变。

### ➕ Added

- 🌈 新增 `utils/syntax.ts`，集中处理 Typst 语法高亮资源路径、复制和工作目录解析。
- 📁 新增 `dumpSyntaxAssetFolderRelativePath` 配置项，用 `string[]` 表示相对于 Koishi 根目录 `ctx.baseDir` 的语法高亮资源目录。
- 📄 新增三个语法文件名配置项：
  - `dumpJsonSyntaxFilename`
  - `dumpYamlSyntaxFilename`
  - `dumpTomlSyntaxFilename`
- 🧭 插件启动时会把包内 `syntaxes` 目录中的 JSON/YAML/TOML 高亮文件复制到：

```text
ctx.baseDir/data/assets/quote-debug-msg-json-image/syntaxes
```

- 🧠 Typst 编译器 workspace 改为使用：

```text
ctx.baseDir/data/assets/quote-debug-msg-json-image
```

### 📝 Documentation

- 🗺️ README 的渲染流程新增 Mermaid 图，分别展示 dump 出图链路和 `render-forward` 截图链路。
- 🌈 README 补充语法高亮资源零占用说明。
- 🧾 usage 页面同步补充 `dumpSyntaxAssetFolderRelativePath` 与三个 `Filename` 配置项说明。

### 🧹 Removed

- 🧼 语法高亮资源运行时目录去掉 `koishi-plugin-` 前缀，默认目录从完整包名前缀风格调整为短插件名：

```text
data/assets/quote-debug-msg-json-image/syntaxes
```

- 🧹 不再把 JSON/YAML/TOML 语法配置项展示为长绝对路径，配置页只显示目录片段和文件名。

## 🧰 v0.4.1-beta.5+20260703

### 🔧 Chore

- 📦 版本号从 `0.4.0-beta.4+20260703` 更新到 `0.4.1-beta.5+20260703`。
- 🧱 将 `@myriaddreamin/typst-ts-node-compiler` 依赖从 `^0.7.0-rc2` 调整为 `^0.7.0`。
- 🧪 继续保留 `@resvg/resvg-js` 作为 Typst SVG 转 PNG 的本地渲染实现。

## 🚀 v0.4.0-beta.4+20260703

### 📝 Documentation

- 🧹 重写 README，使依赖说明、命令参数、字体下载逻辑与当前源码保持一致。
- 🧭 更新 Koishi 插件 usage 页面，移除过时的 `to-image-service` / `w-node` 前置依赖说明。
- 🎨 明确当前 Typst 链路为 `typst-ts-node-compiler -> SVG -> @resvg/resvg-js -> PNG`。
- 🤖 补充 QQ 官方 Bot 引用消息适配说明。
- 🔤 补充 Release 字体下载、`ctx.baseDir/data/fonts` 公共字体目录、文件大小与 SHA256 校验说明。
- 😀 补充 `NotoColorEmoji.ttf` 用于 Typst 彩色 emoji 渲染的说明。

## ✨ v0.4.0-beta.3+20260703

### 🔄 Changed

- ✂️ 移除 `koishi-plugin-to-image-service` 与 `koishi-plugin-w-node` 依赖。
- 🖼️ Typst 模式改为直接使用 `@resvg/resvg-js` 将 SVG 转为 PNG。
- 🧩 拆分 `config.ts`、`usage.ts`、`font-utils.ts`，降低 `index.ts` 的职责和体积。
- 📁 字体资源从插件目录 `assets` 迁移到 Koishi 公共数据目录 `ctx.baseDir/data/fonts`。
- 🧭 `render-forward` 字体路径改为运行时基于 `ctx.baseDir` 解析，避免 npm 安装和源码运行路径不一致。

### ➕ Added

- 📥 新增 Release 字体下载配置：
  - `downloadFontsFromRelease`
  - `notoEmojiFontReleaseUrl`
  - `lxgwFontReleaseUrl`
  - `sourceHanFontReleaseUrl`
- 🔐 新增字体下载校验，使用文件大小和 SHA256 防止错误页、半截下载或损坏文件被当作字体使用。
- 🌐 新增 Gitee 优先、GitHub fallback 的字体下载逻辑。
- 😀 新增 `NotoColorEmoji.ttf` 字体加载，用于 Typst 彩色 emoji 渲染。
- 🤖 新增 QQ 官方 Bot 引用解析：
  - 解析 `msg_idx` / `ref_msg_idx`
  - 解析 `message_reference.message_id`
  - 解析 `msg_elements[0]`
  - fallback 到 `session.quote`
- 💾 新增 QQ 官方 Bot 引用消息内存缓存 middleware。

### 🐛 Fixed

- 😀 修复 raw JSON/YAML/TOML 区域 emoji 渲染异常的问题。
- 🔤 修复 raw JSON/YAML/TOML 区域没有优先使用 LXGW 字体的问题。
- 🤖 修复 QQ 官方 Bot 平台仅依赖 `session.quote` 导致 dump 指令无法获取引用消息的问题。
- 🎭 避免 `TwemojiCOLRv0.ttf` 在 Typst SVG 链路中被选中后产生线框或异常 emoji。

### 🗑️ Removed

- 🧹 删除 `TwemojiCOLRv0.ttf` Typst 字体链路。
- 📦 删除插件内置 `assets` 字体目录的运行时依赖。
- 🔌 删除 `to-image-service` / `w-node` 相关运行时逻辑。

## 🖼️ v0.2.0-beta.8+20260312

### ➕ Added

- 🧑‍🎨 新增 `renderForwardPrefetchAvatar` 配置项，默认预获取 QQ 头像并转为 base64。
- 📖 新增 README 徽章、QQ群信息、效果预览图和字体配置说明。

### 🔄 Changed

- 📄 语法文件后缀从 `*.sublime-syntax` 调整为 `*.sublime-syntax.yml`。
- 📏 `maxJsonTextLength` 默认值调整为 `2222`。

## 🛠️ v0.2.0-beta.6+20260129

### 🐛 Fixed

- 🧯 修复 `resvg` 未就绪时可能出现的 `undefined` 错误。

## 📦 v0.2.0-beta.5+20260127

### 🐛 Fixed

- 🧱 修复生产环境 Typst 编译依赖缺失问题。
- ✂️ 添加合并转发消息自动裁剪，避免超长消息导致渲染卡顿。
- 🪵 改进错误提示和调试日志输出。

### ➕ Added

- 💬 新增 `verboseSessionLog` 配置项，用于控制是否向聊天会话发送调试信息。

## 🔤 v0.2.0-beta.3

### ➕ Added

- 🔠 新增 `dumpTypstFontPath` 配置项，支持指定 Typst 自定义字体路径。
- 📘 添加插件使用说明文档。

### 🔄 Changed

- 🧾 优化配置项 UI，路径输入框改为 textarea 多行显示。
- ✍️ 改进配置项描述文字。

## 🎨 v0.2.0-beta.2+20260126

### 🐛 Fixed

- 🌈 修复 Typst 语法高亮相关问题。
- 🖼️ 修复 resvg 兼容性问题。
- 🔲 修复 `render-forward` 圆角显示问题。

## 🌱 v0.2.0-beta.1+20260125

### ➕ Added

- 🎨 初步支持 Typst 渲染 dump 图片。
- 📋 初步支持 JSON/YAML/TOML 消息对象出图。
