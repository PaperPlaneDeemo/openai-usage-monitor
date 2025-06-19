// Vercel Serverless Function for OpenAI Usage API
export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { OPENAI_ADMIN_KEY, HIGH_TIER_DAILY_LIMIT, BASIC_TIER_DAILY_LIMIT } = process.env;

  if (!OPENAI_ADMIN_KEY || OPENAI_ADMIN_KEY === 'your_admin_api_key_here') {
    return res.status(400).json({ 
      error: 'OPENAI_ADMIN_KEY not configured',
      message: '请在Vercel环境变量中配置OPENAI_ADMIN_KEY'
    });
  }

  // 配置常量
  const HIGH_TIER_LIMIT = parseInt(HIGH_TIER_DAILY_LIMIT) || 250000;
  const BASIC_TIER_LIMIT = parseInt(BASIC_TIER_DAILY_LIMIT) || 2500000;

  // 模型分类
  const HIGH_TIER_MODELS = new Set([
    'gpt-4.5-preview', 'gpt-4.1', 'gpt-4o', 'o1', 'o3',
    'gpt-4o-2024-11-20', 'gpt-4o-2024-08-06', 'gpt-4o-2024-05-13',
    'o1-2024-12-17', 'o1-preview-2024-09-12',
    'gpt-4.5-preview-2025-02-27'
  ]);

  const BASIC_TIER_MODELS = new Set([
    'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o-mini', 
    'o1-mini', 'o3-mini', 'o4-mini', 'codex-mini-latest',
    'gpt-4o-mini-2024-07-18', 'o1-mini-2024-09-12', 'gpt-4.1-mini-2025-04-14'
  ]);

  // 付费模型 (不在免费试用范围内)
  const PAID_MODELS = new Set([
    'o3-pro', 'o3-pro-2025-06-10'
  ]);

  // 模型分类函数
  function isHighTierModel(model) {
    if (!model) return false;
    
    const modelLower = model.toLowerCase();
    
    // 排除付费模型
    if (PAID_MODELS.has(model) || modelLower.startsWith('o3-pro')) return false;
    
    // 精确匹配
    if (HIGH_TIER_MODELS.has(model)) return true;
    
    // 排除包含mini或nano的模型
    if (modelLower.includes('mini') || modelLower.includes('nano')) return false;
    
    // 模式匹配
    if (modelLower.startsWith('o3') || modelLower.startsWith('o1') || modelLower.startsWith('gpt-4')) {
      return true;
    }
    
    return false;
  }

  function isBasicTierModel(model) {
    if (!model) return false;
    
    const modelLower = model.toLowerCase();
    
    // 精确匹配
    if (BASIC_TIER_MODELS.has(model)) return true;
    
    // 模式匹配
    if (modelLower.includes('mini') || modelLower.includes('nano') || 
        modelLower.startsWith('gpt-3.5') ||
        ['embedding', 'whisper', 'tts', 'dall-e'].some(service => modelLower.includes(service))) {
      return true;
    }
    
    return false;
  }

  function isPaidModel(model) {
    if (!model) return false;
    
    const modelLower = model.toLowerCase();
    
    // 精确匹配
    if (PAID_MODELS.has(model)) return true;
    
    // 模式匹配 - o3-pro 开头的都是付费模型
    if (modelLower.startsWith('o3-pro')) return true;
    
    return false;
  }

  function getModelTier(model) {
    if (isPaidModel(model)) return '付费模型';
    if (isHighTierModel(model)) return '高级模型';
    if (isBasicTierModel(model)) return '基础模型';
    return '未知分类';
  }

  try {
    // 计算今日时间范围
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    
    const startTimestamp = Math.floor(todayStart.getTime() / 1000);
    const endTimestamp = Math.floor(now.getTime() / 1000);

    // API请求头
    const headers = {
      'Authorization': `Bearer ${OPENAI_ADMIN_KEY}`,
      'Content-Type': 'application/json'
    };

    // 构建API请求URL
    const usageUrl = new URL('https://api.openai.com/v1/organization/usage/completions');
    usageUrl.searchParams.append('start_time', startTimestamp.toString());
    usageUrl.searchParams.append('end_time', endTimestamp.toString());
    usageUrl.searchParams.append('bucket_width', '1d');
    usageUrl.searchParams.append('limit', '10');
    usageUrl.searchParams.append('group_by', 'model');

    // 获取使用量数据
    const usageResponse = await fetch(usageUrl.toString(), { headers });
    
    if (!usageResponse.ok) {
      throw new Error(`Usage API Error: ${usageResponse.status} ${usageResponse.statusText}`);
    }

    const usageData = await usageResponse.json();

    // 处理数据
    let highTierTotal = 0;
    let basicTierTotal = 0;
    const modelDetails = {};

    for (const bucket of usageData.data || []) {
      for (const result of bucket.results || []) {
        const model = result.model || '未知模型';
        const inputTokens = result.input_tokens || 0;
        const outputTokens = result.output_tokens || 0;
        const totalTokens = inputTokens + outputTokens;

        // 记录模型详情
        if (!modelDetails[model]) {
          modelDetails[model] = {
            input_tokens: 0,
            output_tokens: 0,
            tokens: 0,
            tier: getModelTier(model)
          };
        }

        modelDetails[model].input_tokens += inputTokens;
        modelDetails[model].output_tokens += outputTokens;
        modelDetails[model].tokens += totalTokens;

        // 累计到对应层级
        if (isHighTierModel(model)) {
          highTierTotal += totalTokens;
        } else if (isBasicTierModel(model)) {
          basicTierTotal += totalTokens;
        }
      }
    }

    // 获取成本数据
    let costData = { total_cost: 0, breakdown: {} };
    try {
      const costsUrl = new URL('https://api.openai.com/v1/organization/costs');
      costsUrl.searchParams.append('start_time', startTimestamp.toString());
      costsUrl.searchParams.append('bucket_width', '1d');
      costsUrl.searchParams.append('limit', '10');
      costsUrl.searchParams.append('group_by', 'line_item');

      const costsResponse = await fetch(costsUrl.toString(), { headers });
      
      if (costsResponse.ok) {
        const costsResponseData = await costsResponse.json();
        
        let totalCost = 0;
        const costBreakdown = {};

        for (const bucket of costsResponseData.data || []) {
          for (const result of bucket.results || []) {
            const amount = result.amount?.value || 0;
            const lineItem = result.line_item || '未分类';
            
            totalCost += amount;
            costBreakdown[lineItem] = (costBreakdown[lineItem] || 0) + amount;
          }
        }

        costData = {
          total_cost: totalCost,
          breakdown: costBreakdown
        };
      }
    } catch (costError) {
      console.warn('获取成本数据失败:', costError);
      costData.error = '成本数据获取失败';
    }

    // 计算使用率和剩余量
    const highRemaining = Math.max(0, HIGH_TIER_LIMIT - highTierTotal);
    const basicRemaining = Math.max(0, BASIC_TIER_LIMIT - basicTierTotal);
    const highUsagePct = (highTierTotal / HIGH_TIER_LIMIT) * 100;
    const basicUsagePct = (basicTierTotal / BASIC_TIER_LIMIT) * 100;

    // 返回结果
    res.status(200).json({
      success: true,
      data: {
        high_tier: {
          used: highTierTotal,
          remaining: highRemaining,
          limit: HIGH_TIER_LIMIT,
          usage_percentage: highUsagePct
        },
        basic_tier: {
          used: basicTierTotal,
          remaining: basicRemaining,
          limit: BASIC_TIER_LIMIT,
          usage_percentage: basicUsagePct
        },
        model_details: modelDetails,
        costs: costData,
        last_updated: now.toISOString()
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
} 