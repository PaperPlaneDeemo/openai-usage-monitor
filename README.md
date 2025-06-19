# OpenAI API 使用量监控 - JavaScript版本

🚀 **轻量级云端部署** | 📱 **响应式设计** | ⚡ **实时监控**

这是一个基于JavaScript的OpenAI API使用量监控仪表板，专为Vercel云平台设计，支持手机端访问。

## ✨ 功能特性

- 📊 **双圆环图** - 直观显示高级模型和基础模型的剩余额度
- 📱 **响应式设计** - 完美适配手机、平板、桌面设备
- ⚡ **实时数据** - 自动刷新，实时监控API使用情况
- 🎯 **智能警告** - 使用率超过75%/90%时自动警告
- 📈 **详细分析** - 按模型显示token使用详情和成本分析
- 💡 **使用建议** - 基于当前使用情况提供智能建议

## 🛠️ 技术栈

- **前端**: HTML5 + CSS3 + Vanilla JavaScript + Chart.js
- **后端**: Vercel Serverless Functions (Node.js)
- **部署**: Vercel Platform (免费)
- **API**: OpenAI Usage API + Costs API

## 📦 快速部署

### 方法1: 一键部署到Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/your-repo)

### 方法2: 手动部署

1. **克隆项目**
```bash
git clone <your-repository>
cd vercel-js
```

2. **安装Vercel CLI**
```bash
npm i -g vercel
```

3. **登录Vercel**
```bash
vercel login
```

4. **配置环境变量**
   
   在Vercel项目设置中添加以下环境变量：
   
   ```
   OPENAI_ADMIN_KEY=your_admin_api_key_here
   HIGH_TIER_DAILY_LIMIT=250000
   BASIC_TIER_DAILY_LIMIT=2500000
   ```
   
   ⚠️ **重要**: 需要使用OpenAI Admin API Key，不是普通API Key
   
   获取Admin Key: https://platform.openai.com/settings/organization/admin-keys

5. **部署**
```bash
vercel --prod
```

## 🔧 本地开发

1. **安装依赖**
```bash
npm install
```

2. **创建环境变量文件**
```bash
cp .env.example .env
```

3. **编辑.env文件**
```env
OPENAI_ADMIN_KEY=your_admin_api_key_here
HIGH_TIER_DAILY_LIMIT=250000
BASIC_TIER_DAILY_LIMIT=2500000
```

4. **本地运行**
```bash
vercel dev
```

访问 http://localhost:3000

## 📊 使用说明

### 仪表板功能

1. **指标卡片**
   - 高级模型剩余tokens
   - 基础模型剩余tokens  
   - 今日API成本
   - 最后更新时间

2. **圆环图**
   - 直观显示使用率
   - 颜色编码警告系统
   - 悬停显示详细信息

3. **详细分析**
   - 按模型分类的token使用情况
   - 成本分解和明细
   - 使用建议和优化提示

4. **控制选项**
   - 手动刷新按钮
   - 自动刷新开关（30秒间隔）

### 模型分类

**高级模型** (每日25万tokens):
- gpt-4o, gpt-4.1, gpt-4.5-preview
- o1, o1-preview, o3
- 所有带时间戳的高级版本

**基础模型** (每日250万tokens):
- gpt-4o-mini, gpt-4.1-mini, gpt-4.1-nano
- o1-mini, o3-mini, o4-mini
- embedding, whisper, tts, dall-e系列

**付费模型** (不在免费试用范围内):
- o3-pro, o3-pro-2025-06-10 及其变体

## 🚨 注意事项

1. **API密钥安全**
   - 使用Vercel环境变量存储密钥
   - 不要在代码中硬编码API密钥
   - Admin Key权限很高，请妥善保管

2. **数据延迟**
   - OpenAI API数据更新可能有几分钟延迟
   - 请以实际API响应为准

3. **使用限制**
   - 免费Vercel账户有函数执行时间限制
   - 建议使用自动刷新功能时注意频率

## 🔧 自定义配置

### 修改刷新间隔
编辑 `public/app.js`:
```javascript
// 将30000改为你需要的毫秒数
autoRefreshInterval = setInterval(fetchData, 30000);
```

### 修改每日限额
在Vercel环境变量中调整:
```
HIGH_TIER_DAILY_LIMIT=你的高级模型限额
BASIC_TIER_DAILY_LIMIT=你的基础模型限额
```

### 添加新模型
编辑 `api/usage.js` 中的模型分类:
```javascript
const HIGH_TIER_MODELS = new Set([
    // 添加你的高级模型
]);

const BASIC_TIER_MODELS = new Set([
    // 添加你的基础模型
]);
```

## 🐛 故障排除

### 常见问题

1. **API密钥错误**
   ```
   错误: OPENAI_ADMIN_KEY not configured
   解决: 检查Vercel环境变量设置
   ```

2. **数据获取失败**
   ```
   错误: Usage API Error: 401
   解决: 确认使用的是Admin API Key而不是普通API Key
   ```

3. **图表不显示**
   ```
   解决: 检查浏览器控制台错误，确认Chart.js正确加载
   ```

### 日志查看

在Vercel项目面板查看Function Logs:
1. 进入项目 → Functions
2. 点击 `/api/usage` 
3. 查看实时日志

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📞 支持

如有问题，请：
1. 查看本文档的故障排除部分
2. 检查Vercel Function日志
3. 提交GitHub Issue

---

**享受你的API使用量监控体验！** 🎉 