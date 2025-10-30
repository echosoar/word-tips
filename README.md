# Word Tips - 词汇提示助手

一个基于 Chrome Manifest V3 的浏览器插件，用于在网页中为配置的词汇添加释义提示。

## 功能特性

1. **词汇高亮** - 根据配置的词表，自动识别并高亮页面中的词汇，使用点状虚线标记
2. **释义浮层** - 鼠标悬停在高亮词汇上时，显示浮层展示释义
3. **多词表支持** - 支持添加多个词表，同一词汇可以有多个释义，使用横线分隔
4. **隐藏词汇** - 在浮层中可以设置某个词不再显示，并在设置页面查看所有隐藏的词
5. **网站排除** - 可以配置排除的网站地址，支持正则表达式
6. **自定义样式** - 使用自定义的 `<work-tip>` 标签，不影响原有页面布局
7. **灵活的词表来源** - 支持文本输入和远程 JSON 地址两种方式配置词表

## 安装方法

1. 克隆或下载此仓库
2. 打开 Chrome 浏览器，进入 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择本项目的根目录

## 使用方法

### 配置词表

#### 方式一：本地文本输入

1. 点击扩展图标，选择"打开设置"
2. 在"本地词表"文本框中输入词汇，每行一个
3. 格式：`词汇:释义` 或 `词汇：释义`（支持中英文冒号）
4. 示例：
   ```
   API:Application Programming Interface，应用程序编程接口
   JSON:JavaScript Object Notation，一种轻量级的数据交换格式
   HTML：Hypertext Markup Language，超文本标记语言
   ```

#### 方式二：远程 JSON 地址

1. 在"远程词表"部分输入 JSON 地址
2. JSON 格式：`{ "word": "definition" }`
3. 示例：
   ```json
   {
     "API": "Application Programming Interface",
     "JSON": "JavaScript Object Notation"
   }
   ```

### 排除网站

在"排除网站"文本框中输入要排除的网站地址，每行一个：
- 支持完整 URL：`https://example.com`
- 支持正则表达式：`.*\.google\.com`（匹配所有 Google 域名）

### 隐藏词汇

- 在浮层中点击"不再显示"按钮，该词汇将不再高亮
- 在设置页面的"隐藏的词汇"部分可以查看和恢复隐藏的词汇

## 本地测试

项目包含了测试文件方便开发和测试：

1. **test.html** - 包含各种测试场景的网页，可以直接在浏览器中打开测试扩展功能
2. **sample-wordlist.json** - 示例远程词表文件，可以作为远程 JSON 地址的参考

测试步骤：
1. 加载扩展后，打开 test.html 文件
2. 在扩展设置中配置词表（可以使用页面中建议的配置）
3. 刷新 test.html 页面，观察词汇高亮效果
4. 测试各项功能：悬停提示、隐藏词汇、网站排除等

## 技术实现

- **Manifest V3** - 使用最新的 Chrome 扩展 API
- **自定义元素** - 使用 `<work-tip>` 自定义标签标记高亮词汇
- **Storage API** - 使用 Chrome Storage API 存储配置
- **Content Scripts** - 在页面中注入脚本实现词汇高亮和浮层
- **Background Service Worker** - 处理数据管理和远程请求

## 文件结构

```
work-tips/
├── manifest.json          # 扩展配置文件
├── background.js          # 后台服务脚本
├── content.js            # 内容脚本（词汇高亮和浮层）
├── content.css           # 内容样式
├── options.html          # 设置页面
├── options.js            # 设置页面脚本
├── popup.html            # 弹出窗口
├── popup.js              # 弹出窗口脚本
├── icon16.png            # 16x16 图标
├── icon48.png            # 48x48 图标
├── icon128.png           # 128x128 图标
├── test.html             # 测试页面（用于本地测试）
├── sample-wordlist.json  # 示例远程词表
└── README.md             # 说明文档
```

## 许可证

MIT