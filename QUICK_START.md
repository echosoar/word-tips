# Quick Start Guide - Work Tips 浏览器扩展

## 快速开始

### 1. 安装扩展

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的 **"开发者模式"**
4. 点击 **"加载已解压的扩展程序"**
5. 选择 work-tips 项目文件夹

### 2. 配置词表

#### 方式 A：使用文本输入（推荐新手）

1. 点击浏览器工具栏的 Work Tips 图标
2. 点击 **"打开设置"** 按钮
3. 在 **"本地词表"** 文本框输入词汇，每行一个
4. 格式：`词汇:释义` 或 `词汇：释义`

**示例**：
```
API:Application Programming Interface，应用程序编程接口
JSON:JavaScript Object Notation，一种轻量级的数据交换格式
HTML：Hypertext Markup Language，超文本标记语言
```

5. 点击页面底部的 **"💾 保存设置"** 按钮

#### 方式 B：使用远程 JSON（适合团队共享）

1. 准备一个 JSON 文件，格式如下：
```json
{
  "API": "Application Programming Interface",
  "JSON": "JavaScript Object Notation"
}
```

2. 将 JSON 文件上传到可访问的 URL（如 GitHub Gist、自己的服务器）
3. 在设置页面的 **"远程词表"** 部分，输入 JSON 地址
4. 点击 **"添加"** 按钮

**注意**：可以使用项目自带的 `sample-wordlist.json` 作为参考

### 3. 测试功能

1. 打开项目中的 `test.html` 文件（或任意网页）
2. 配置好的词汇会显示 **点状虚线**
3. **鼠标悬停** 在词汇上查看释义
4. 如果不想再看到某个词，点击浮层中的 **"不再显示"** 按钮

### 4. 高级功能

#### 排除特定网站

如果不想在某些网站上启用词汇提示：

1. 在设置页面找到 **"排除网站"** 部分
2. 输入网址，每行一个
3. 支持正则表达式匹配

**示例**：
```
https://mail.google.com
.*\.github\.com
https://example\.com/admin/.*
```

#### 管理隐藏的词汇

1. 在设置页面找到 **"隐藏的词汇"** 部分
2. 查看所有已隐藏的词汇
3. 点击词汇旁的 **"恢复"** 按钮可以重新显示该词

### 5. 查看统计信息

点击浏览器工具栏的 Work Tips 图标，可以看到：
- 词汇数量
- 隐藏词汇数量
- 排除网站数量

## 常见问题

### Q: 词汇没有被高亮？
**A:** 检查以下几点：
1. 是否保存了设置？
2. 是否刷新了页面？
3. 当前网站是否在排除列表中？
4. 词汇格式是否正确（使用冒号分隔）？

### Q: 远程词表加载失败？
**A:** 确保：
1. JSON 地址可以在浏览器中直接访问
2. JSON 格式正确
3. 服务器允许跨域访问（CORS）

### Q: 如何添加多个释义？
**A:** 两种方式：
1. 同一个词在本地词表中写多行
2. 同时使用本地词表和远程词表

### Q: 可以导入/导出词表吗？
**A:** 当前版本直接复制粘贴文本即可。未来版本会支持文件导入导出。

## 使用技巧

1. **团队协作**：使用远程 JSON 地址，团队成员共享同一份词表
2. **分类管理**：使用多个远程 URL，分别管理不同领域的词汇
3. **性能优化**：如果词汇太多影响性能，可以使用排除列表
4. **快速配置**：使用 test.html 快速验证配置是否生效

## 示例配置

### 前端开发词表
```
HTML:Hypertext Markup Language，超文本标记语言
CSS:Cascading Style Sheets，层叠样式表
JavaScript:一种高级的、解释型的编程语言
React:用于构建用户界面的 JavaScript 库
Vue:渐进式 JavaScript 框架
Webpack:现代 JavaScript 应用程序的静态模块打包工具
```

### 后端开发词表
```
API:Application Programming Interface，应用程序编程接口
REST:Representational State Transfer，表述性状态转移
Node.js:基于 Chrome V8 引擎的 JavaScript 运行时
Python:一种高级编程语言，语法简洁清晰
MySQL:开源的关系型数据库管理系统
Redis:开源的内存数据结构存储系统
```

### 云计算词表
```
AWS:Amazon Web Services，亚马逊云计算服务
Docker:开源的容器化平台
Kubernetes:容器编排系统
CI/CD:持续集成/持续部署
DevOps:开发与运维的结合
```

## 需要帮助？

- 查看 `README.md` 了解完整功能说明
- 查看 `IMPLEMENTATION_SUMMARY.md` 了解技术实现
- 在 GitHub 上提交 Issue

---

祝使用愉快！ 🎉
