# 📜 Changelog

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
