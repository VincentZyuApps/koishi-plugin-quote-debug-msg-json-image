![koishi-plugin-quote-debug-msg-json-image](https://socialify.git.ci/VincentZyuApps/koishi-plugin-quote-debug-msg-json-image/image?custom_description=%F0%9F%93%8B%E6%8A%8A%E4%B8%80%E6%9D%A1%E6%B6%88%E6%81%AF%E7%94%A8json%2Fyaml%2Ftoml%E7%9A%84%E6%A0%BC%E5%BC%8F%E6%B8%B2%E6%9F%93%E6%88%90%E5%9B%BE%E7%89%87%EF%BC%8C%F0%9F%8E%A8%E6%94%AF%E6%8C%81typst%E6%88%96%E8%80%85markdown%E3%80%82%E8%BF%98%E6%94%AF%E6%8C%81%E7%94%A8puppeteer%E6%B8%B2%E6%9F%93onebot%E7%9A%84%E5%90%88%E5%B9%B6%E8%BD%AC%E5%8F%91%E6%88%90%E5%9B%BE%E7%89%87%F0%9F%96%BC%EF%B8%8F&description=1&font=Bitter&forks=1&issues=1&language=1&logo=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Ff%2Ff3%2FKoishi.js_Logo.png%3F_%3D20230331182243&name=1&owner=1&pulls=1&stargazers=1&theme=Auto)

# 📋 koishi-plugin-quote-debug-msg-json-image

[![npm](https://img.shields.io/npm/v/koishi-plugin-quote-debug-msg-json-image?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-quote-debug-msg-json-image)
[![npm-download](https://img.shields.io/npm/dm/koishi-plugin-quote-debug-msg-json-image?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-quote-debug-msg-json-image)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/VincentZyuApps/koishi-plugin-quote-debug-msg-json-image)
[![Gitee](https://img.shields.io/badge/Gitee-C71D23?style=for-the-badge&logo=gitee&logoColor=white)](https://gitee.com/vincent-zyu/koishi-plugin-quote-debug-msg-json-image)

<p>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>1085190201</b> 🎉</p>
<p>💡 在群里直接艾特我，回复的更快哦~ ✨</p>

回复一条消息，将其渲染为精美的 JSON/YAML/TOML 格式图片（防止超出聊天平台的文字长度上限）。还支持渲染 OneBot 的合并转发消息为图片。

## ✨ 功能特性

- 📋 **dump 指令**：将消息对象序列化为 JSON/YAML/TOML 格式，渲染成图片
- 📨 **render-forward 指令**：将合并转发消息渲染成精美的图片
- 🎨 **双渲染引擎**：支持 Typst（推荐）和 Markdown 两种渲染模式
- 🌈 **代码语法高亮**：JSON/YAML/TOML 自动语法着色
- 🧵 **嵌套转发支持**：智能处理多层嵌套的合并转发消息

## 📦 依赖服务

```yaml
required:
  - markdownToImage   # koishi-plugin-markdown-to-image-service
  - toImageService    # koishi-plugin-to-image-service
  - node              # koishi-plugin-w-node
  - puppeteer         # koishi-plugin-puppeteer
```

可选依赖（推荐安装以获得最佳 Typst 渲染效果）：
- `@myriaddreamin/typst-ts-node-compiler` >= 0.7.0-rc2

### 📋 package.json 依赖详解

以下是本插件的依赖配置及其用途说明：

```json
{
  // === peerDependencies: 宿主环境必须提供的依赖 ===
  // 这些依赖由 Koishi 主程序或其他插件提供，插件不会自己安装
  "peerDependencies": {
    // Typst 编译器 - 将 Typst 源码编译为 SVG/PDF
    // 用于 dump 指令的 Typst 渲染模式，实现精美排版和代码语法高亮
    "@myriaddreamin/typst-ts-node-compiler": ">=0.7.0-rc2",

    // Koishi 核心框架 - 插件运行的基础环境
    "koishi": "^4.18.7",

    // 图片服务 - 提供 SVG → PNG 转换（resvg）和字体管理
    // Typst 编译输出 SVG，需要此服务转换为最终的 PNG 图片
    "koishi-plugin-to-image-service": ">=0.1.0",

    // Node.js 模块加载器 - 动态加载 npm 包
    // 用于运行时安全加载 @myriaddreamin/typst-ts-node-compiler
    "koishi-plugin-w-node": ">=1.0.0"
  },

  // === peerDependenciesMeta: peerDependencies 的元数据 ===
  "peerDependenciesMeta": {
    // Typst 编译器标记为可选
    // 如果用户只使用 Markdown 渲染模式，可以不安装此依赖
    "@myriaddreamin/typst-ts-node-compiler": {
      "optional": true
    }
  },

  // === dependencies: 插件自带的运行时依赖 ===
  // 这些依赖会随插件一起安装到 node_modules
  "dependencies": {
    // TOML 解析器 - 将消息对象序列化为 TOML 格式
    // 支持 dump-toml 指令输出 TOML 格式的消息数据
    "@iarna/toml": "^2.2.5",

    // YAML 解析/序列化库 - 将消息对象序列化为 YAML 格式
    // 支持 dump-yaml 指令输出 YAML 格式的消息数据
    "js-yaml": "^4.1.1",

    // Markdown 转图片服务 - 将 Markdown 渲染为图片
    // 作为 Typst 渲染的备选方案，适合简单快速的场景
    "koishi-plugin-markdown-to-image-service": "^1.3.6"
  },

  // === devDependencies: 仅开发时需要的依赖 ===
  // 发布后不会包含在 npm 包中
  "devDependencies": {
    // Typst 编译器（开发版本）- 用于本地开发测试
    "@myriaddreamin/typst-ts-node-compiler": "^0.7.0-rc2",

    // js-yaml 的 TypeScript 类型定义
    // 提供 IDE 智能提示和类型检查
    "@types/js-yaml": "^4.0.9",

    // 以下两个服务的开发版本，用于本地测试
    "koishi-plugin-to-image-service": "^0.1.5",
    "koishi-plugin-w-node": "^1.0.1"
  }
}
```

#### 依赖关系图

```
┌─────────────────────────────────────────────────────────┐
│                    dump 指令渲染流程                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  消息对象 ──┬──▶ JSON (内置)                              │
│            ├──▶ YAML (js-yaml)                          │
│            └──▶ TOML (@iarna/toml)                      │
│                       │                                 │
│                       ▼                                 │
│         ┌─────────────┴─────────────┐                   │
│         │                           │                   │
│    [Typst 模式]              [Markdown 模式]            │
│         │                           │                   │
│  typst-ts-node-compiler    markdown-to-image-service   │
│  (via w-node 动态加载)              │                   │
│         │                           │                   │
│         ▼                           │                   │
│    SVG 输出                         │                   │
│         │                           │                   │
│  to-image-service                   │                   │
│  (resvg: SVG → PNG)                 │                   │
│         │                           │                   │
│         └───────────┬───────────────┘                   │
│                     ▼                                   │
│                 PNG 图片                                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│               render-forward 指令渲染流程                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  合并转发消息 ──▶ HTML 生成 ──▶ Puppeteer 截图 ──▶ PNG   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 🚀 使用方法

### dump 指令

回复一条消息并发送指令：

```
dump-json          # 渲染为 JSON 格式图片
dump-yaml          # 渲染为 YAML 格式图片  
dump-toml          # 渲染为 TOML 格式图片
```

**可用选项**：
- `-m, --mode <typst|markdown>` - 选择渲染引擎
- `-r, --reply <forward|image>` - 回复模式（合并转发/仅图片）
- `-s, --self` - 解析当前消息而非被引用的消息

**效果预览**：

![dump-json 效果预览](doc/dump-json-preview.png)

### render-forward 指令

回复一条合并转发消息并发送：

```
render-forward     # 渲染合并转发为图片
```

**可用选项**：
- `-i, --index <0|1>` - 样式选择（0=Source Han Serif 毛玻璃风格, 1=LXGW WenKai 简约风格）

**效果预览**：

| Source Han Serif 风格 (index=0) | LXGW WenKai 风格 (index=1) |
|:---:|:---:|
| ![Source 风格预览](doc/render-forward-source-preview.png) | ![LXGW 风格预览](doc/render-forward-lxgw-preview.png) |

---

## 🔧 技术实现细节

### 🎨 代码语法高亮

#### Typst 渲染引擎

Typst 内置了对多种编程语言的语法高亮支持。本插件使用 **Fenced Code Block 语法**来触发高亮：

```typst
` ` `json
{"key": "value", "count": 42}
` ` `
```

> ⚠️ **技术要点**：Typst 的 `#raw(variable, lang: "json")` 函数对**变量内容不会触发语法高亮**，只有直接写在源码中的 Fenced Code Block 才会启用高亮。因此本插件将数据直接嵌入 Typst 源码中。

#### resvg 兼容性修复

Typst 生成的 SVG 使用了 CSS 变量来设置字形颜色：

```css
.outline_glyph path { fill: var(--glyph_fill); }
```

然而 **resvg 不支持 CSS 变量**，这会导致所有文字变成默认颜色。本插件通过 `fixSvgForResvg()` 函数在 SVG 转 PNG 之前移除这些 CSS 变量规则，让颜色从父元素的 `fill` 属性正确继承：

```typescript
private fixSvgForResvg(svg: string): string {
  // 移除 CSS 变量规则，让颜色从父元素 <g fill="#color"> 继承
  return svg.replace(
    /\.outline_glyph[^}]*fill:\s*var\(--glyph_fill\)[^}]*}/g,
    ''
  )
}
```

#### Markdown 渲染引擎

Markdown 渲染使用 `koishi-plugin-markdown-to-image-service`，通过标准的 Markdown Fenced Code Block 实现语法高亮：

````markdown
```json
{"key": "value"}
```
````

---

### 📨 合并转发渲染的排版设计

#### Puppeteer 页面截图

合并转发渲染使用 Puppeteer 将 HTML 页面渲染为图片。关键的排版技巧：

**1. 自适应高度**

使用 `height: auto` 的卡片容器，让内容自然撑开高度：

```css
.card {
  width: 920px;
  height: auto; /* 内容自适应 */
  border-radius: 32px;
}
```

**2. 双风格系统**

- **Source Han Serif 风格**：毛玻璃效果，使用 `backdrop-filter: blur()` 实现
- **LXGW WenKai 风格**：简约扁平设计，清晰易读

```css
/* 毛玻璃效果 */
.card {
  background: rgba(255,255,255,.13);
  backdrop-filter: blur(13px) saturate(130%);
  box-shadow: 0 16px 48px rgba(0,0,0,.3);
}
```

**3. 头像与布局**

每条消息使用 Flex 布局，头像固定尺寸，内容区自适应：

```css
.message-item {
  display: flex;
  gap: 14px;
}
.message-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  flex-shrink: 0; /* 不压缩 */
}
.message-main {
  flex: 1;
  min-width: 0; /* 防止内容溢出 */
}
```

---

### 🧵 嵌套合并转发的处理

OneBot 的合并转发消息可能包含多层嵌套。本插件通过**递归渲染**和**深度限制**来优雅处理：

#### 递归解析架构

```typescript
function parseMessageElement(
  element: MessageElement,
  currentDepth: number,  // 当前嵌套深度
  maxDepth: number       // 最大允许深度（可配置，默认 3）
): string {
  if (element.type === 'forward') {
    // 达到最大深度时折叠显示
    if (currentDepth >= maxDepth) {
      return `<span class="collapsed">[合并转发: ${count}条消息，已达最大嵌套深度]</span>`
    }
    // 递归渲染嵌套内容
    return generateNestedForwardHtml(element.data.content, currentDepth + 1, maxDepth)
  }
  // ... 其他消息类型处理
}
```

#### 视觉层级区分

嵌套的合并转发使用不同的视觉样式来区分层级：

```css
.nested-forward {
  margin: 12px 0;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.6);
  background: rgba(255,255,255,.2);
}

.nested-forward[data-depth="2"] {
  /* 更深层级可以有不同样式 */
}
```

#### 深度标识

每个嵌套层级都会显示深度信息，帮助用户理解消息结构：

```
📨 嵌套合并转发 (5条消息, 深度:2)
```

---

## ⚙️ 配置项

### 🔤 字体配置

本插件需要配置字体路径才能正常渲染。你可以：

1. **下载预置字体**：前往 [Gitee Releases - fonts](https://gitee.com/vincent-zyu/koishi-plugin-quote-debug-msg-json-image/releases/tag/fonts) 下载字体文件
2. **使用自己喜欢的字体**：支持 `.ttf` 和 `.otf` 格式

下载后将字体文件放到服务器上，然后在配置中填入**绝对路径**即可。

**需要配置的字体路径（共 3 个）**：

| 配置项 | 用途 | 推荐字体 |
|--------|------|----------|
| `dumpTypstFontPath` | dump 指令 (Typst 渲染) | LXGW WenKai Mono |
| `renderForwardSourceFontPath` | render-forward Source 风格 | Source Han Serif SC |
| `renderForwardLxgwFontPath` | render-forward LXGW 风格 | LXGW WenKai Mono |

### dump 指令配置

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `dumpRenderMode` | `'typst' \| 'markdown'` | `'typst'` | 默认渲染引擎 |
| `dumpMessageMode` | `'forward' \| 'image'` | `'forward'` | 回复模式 |
| `dumpTypstRenderScale` | `number` | `2.33` | Typst 渲染缩放倍率 |
| `dumpTypstPageBgColor` | `string` | `'#f9efe2'` | 页面背景色 |
| `dumpTypstCodeBlockFillColor` | `string` | `'#ffffff'` | 代码块背景色 |

### render-forward 配置

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `maxForwardNestDepth` | `number` | `3` | 最大嵌套深度 |
| `renderForwardDefaultStyle` | `'source' \| 'lxgw'` | `'source'` | 默认渲染风格 |
| `renderForwardSourceFontPath` | `string` | - | Source 风格字体路径 |
| `renderForwardLxgwFontPath` | `string` | - | LXGW 风格字体路径 |
| `renderForwardMaxImageSize` | `number` | `50` | 图片最大尺寸 (px) |

