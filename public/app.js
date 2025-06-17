// 全局变量
let highTierChart = null;
let basicTierChart = null;
let autoRefreshInterval = null;

// DOM元素
const elements = {
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    errorText: document.getElementById('errorText'),
    mainContent: document.getElementById('mainContent'),
    refreshBtn: document.getElementById('refreshBtn'),
    autoRefresh: document.getElementById('autoRefresh'),
    warningSection: document.getElementById('warningSection'),
    warningMessage: document.getElementById('warningMessage'),
    
    // 指标元素
    highTierRemaining: document.getElementById('highTierRemaining'),
    highTierUsage: document.getElementById('highTierUsage'),
    basicTierRemaining: document.getElementById('basicTierRemaining'),
    basicTierUsage: document.getElementById('basicTierUsage'),
    todayCost: document.getElementById('todayCost'),
    lastUpdated: document.getElementById('lastUpdated'),
    
    // 图表中心文本
    highTierCenterText: document.getElementById('highTierCenterText'),
    basicTierCenterText: document.getElementById('basicTierCenterText'),
    
    // 详情区域
    modelDetails: document.getElementById('modelDetails'),
    costDetails: document.getElementById('costDetails'),
    suggestions: document.getElementById('suggestions')
};

// 检查Chart.js是否加载
function checkChartJS() {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js未正确加载');
        showError('Chart.js库加载失败，请刷新页面重试');
        return false;
    }
    return true;
}

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    // 检查Chart.js是否可用
    if (!checkChartJS()) {
        return;
    }
    initializeApp();
});

function initializeApp() {
    // 绑定事件监听器
    elements.refreshBtn.addEventListener('click', fetchData);
    elements.autoRefresh.addEventListener('change', toggleAutoRefresh);
    
    // 初始加载数据
    fetchData();
}

// 获取数据
async function fetchData() {
    showLoading();
    
    try {
        const response = await fetch('/api/usage');
        const result = await response.json();
        
        if (!response.ok || !result.success) {
            throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        updateUI(result.data);
        hideLoading();
        
    } catch (error) {
        console.error('获取数据失败:', error);
        showError(error.message);
    }
}

// 更新UI
function updateUI(data) {
    updateMetrics(data);
    updateCharts(data);
    updateDetails(data);
    updateWarnings(data);
    updateSuggestions(data);
    
    // 添加动画效果
    elements.mainContent.classList.add('fade-in');
}

// 更新指标卡片
function updateMetrics(data) {
    const { high_tier, basic_tier, costs, last_updated } = data;
    
    // 格式化数字
    elements.highTierRemaining.textContent = formatNumber(high_tier.remaining);
    elements.highTierUsage.textContent = `使用率 ${high_tier.usage_percentage.toFixed(1)}%`;
    
    elements.basicTierRemaining.textContent = formatNumber(basic_tier.remaining);
    elements.basicTierUsage.textContent = `使用率 ${basic_tier.usage_percentage.toFixed(1)}%`;
    
    elements.todayCost.textContent = `$${costs.total_cost.toFixed(4)}`;
    
    // 更新时间
    const updateTime = new Date(last_updated);
    elements.lastUpdated.textContent = updateTime.toLocaleTimeString('zh-CN', { 
        timeZone: 'UTC',
        hour12: false 
    });
    
    // 更新颜色状态
    updateMetricColors(high_tier, basic_tier);
}

// 更新指标颜色
function updateMetricColors(highTier, basicTier) {
    const highTierCard = document.querySelector('.metric-card.high-tier .metric-value');
    const basicTierCard = document.querySelector('.metric-card.basic-tier .metric-value');
    
    // 重置类名
    highTierCard.className = 'metric-value';
    basicTierCard.className = 'metric-value';
    
    // 高级模型颜色
    if (highTier.usage_percentage > 90) {
        highTierCard.classList.add('text-danger');
    } else if (highTier.usage_percentage > 75) {
        highTierCard.classList.add('text-warning');
    } else {
        highTierCard.classList.add('text-success');
    }
    
    // 基础模型颜色
    if (basicTier.usage_percentage > 90) {
        basicTierCard.classList.add('text-danger');
    } else if (basicTier.usage_percentage > 75) {
        basicTierCard.classList.add('text-warning');
    } else {
        basicTierCard.classList.add('text-success');
    }
}

// 更新圆环图
function updateCharts(data) {
    const { high_tier, basic_tier } = data;
    
    // 更新高级模型图表
    updateDoughnutChart('highTierChart', {
        used: high_tier.used,
        remaining: high_tier.remaining,
        percentage: high_tier.usage_percentage,
        title: '高级模型'
    });
    
    // 更新基础模型图表
    updateDoughnutChart('basicTierChart', {
        used: basic_tier.used,
        remaining: basic_tier.remaining,
        percentage: basic_tier.usage_percentage,
        title: '基础模型'
    });
    
    // 更新中心文本
    elements.highTierCenterText.innerHTML = `
        <strong>${formatNumber(high_tier.used)}</strong><br>
        / ${formatNumber(high_tier.limit)}
    `;
    
    elements.basicTierCenterText.innerHTML = `
        <strong>${formatNumber(basic_tier.used)}</strong><br>
        / ${formatNumber(basic_tier.limit)}
    `;
}

// 创建或更新圆环图
function updateDoughnutChart(canvasId, data) {
    // 再次检查Chart.js是否可用
    if (!checkChartJS()) {
        return;
    }
    
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    
    // 确定颜色
    let colors;
    if (data.percentage > 90) {
        colors = ['#FF4757', '#FFE4E6']; // 红色警告
    } else if (data.percentage > 75) {
        colors = ['#FFA502', '#FFF3E0']; // 橙色警告
    } else {
        colors = data.title === '高级模型' ? 
                 ['#FF6B6B', '#FFE4E6'] : 
                 ['#4ECDC4', '#E0F7F7']; // 默认颜色
    }
    
    // 销毁现有图表
    if (canvasId === 'highTierChart' && highTierChart) {
        highTierChart.destroy();
    } else if (canvasId === 'basicTierChart' && basicTierChart) {
        basicTierChart.destroy();
    }
    
    // 创建新图表
    const chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['已使用', '剩余'],
            datasets: [{
                data: [data.used, data.remaining],
                backgroundColor: colors,
                borderWidth: 0,
                cutout: '75%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label;
                            const value = formatNumber(context.raw);
                            const percentage = ((context.raw / (data.used + data.remaining)) * 100).toFixed(1);
                            return `${label}: ${value} tokens (${percentage}%)`;
                        }
                    }
                }
            },
            animation: {
                animateRotate: true,
                duration: 1000
            }
        }
    });
    
    // 保存图表实例
    if (canvasId === 'highTierChart') {
        highTierChart = chart;
    } else {
        basicTierChart = chart;
    }
}

// 更新详细信息
function updateDetails(data) {
    updateModelDetails(data.model_details);
    updateCostDetails(data.costs);
}

// 更新模型详情
function updateModelDetails(modelDetails) {
    if (!modelDetails || Object.keys(modelDetails).length === 0) {
        elements.modelDetails.innerHTML = '<p class="no-data">今日暂无模型使用记录</p>';
        return;
    }
    
    let html = '<table class="model-table"><thead><tr>';
    html += '<th>模型</th><th>层级</th><th>输入Tokens</th><th>输出Tokens</th><th>总计</th>';
    html += '</tr></thead><tbody>';
    
    // 按总tokens排序
    const sortedModels = Object.entries(modelDetails)
        .sort(([,a], [,b]) => b.tokens - a.tokens);
    
    for (const [model, details] of sortedModels) {
        const tierClass = details.tier === '高级模型' ? 'text-danger' : 
                         details.tier === '基础模型' ? 'text-info' : 'text-warning';
        
        html += `<tr>
            <td title="${model}">${truncateText(model, 20)}</td>
            <td><span class="${tierClass}">${details.tier}</span></td>
            <td>${formatNumber(details.input_tokens)}</td>
            <td>${formatNumber(details.output_tokens)}</td>
            <td><strong>${formatNumber(details.tokens)}</strong></td>
        </tr>`;
    }
    
    html += '</tbody></table>';
    elements.modelDetails.innerHTML = html;
}

// 更新成本详情
function updateCostDetails(costs) {
    if (!costs || costs.total_cost === 0) {
        let html = '<p class="no-data">今日暂无成本数据或成本为$0</p>';
        if (costs.error) {
            html += `<p class="text-warning">获取异常: ${costs.error}</p>`;
        }
        elements.costDetails.innerHTML = html;
        return;
    }
    
    let html = '<div class="cost-breakdown">';
    
    // 成本明细
    for (const [item, cost] of Object.entries(costs.breakdown)) {
        html += `<div class="cost-item">
            <span>${item}</span>
            <span>$${cost.toFixed(4)}</span>
        </div>`;
    }
    
    // 总计
    html += `<div class="cost-item">
        <span><strong>总计</strong></span>
        <span><strong>$${costs.total_cost.toFixed(4)}</strong></span>
    </div>`;
    
    html += '</div>';
    elements.costDetails.innerHTML = html;
}

// 更新警告信息
function updateWarnings(data) {
    const { high_tier, basic_tier } = data;
    
    let warnings = [];
    
    if (high_tier.usage_percentage > 90) {
        warnings.push(`⚠️ 高级模型使用量已超过90% (${high_tier.usage_percentage.toFixed(1)}%)`);
    } else if (high_tier.usage_percentage > 75) {
        warnings.push(`⚠️ 高级模型使用量已超过75% (${high_tier.usage_percentage.toFixed(1)}%)`);
    }
    
    if (basic_tier.usage_percentage > 90) {
        warnings.push(`⚠️ 基础模型使用量已超过90% (${basic_tier.usage_percentage.toFixed(1)}%)`);
    } else if (basic_tier.usage_percentage > 75) {
        warnings.push(`⚠️ 基础模型使用量已超过75% (${basic_tier.usage_percentage.toFixed(1)}%)`);
    }
    
    if (warnings.length > 0) {
        elements.warningMessage.innerHTML = warnings.join('<br>');
        elements.warningMessage.className = 'warning-message' + 
            (warnings.some(w => w.includes('90%')) ? ' error' : '');
        elements.warningSection.style.display = 'block';
    } else {
        elements.warningSection.style.display = 'none';
    }
}

// 更新使用建议
function updateSuggestions(data) {
    const { high_tier, basic_tier } = data;
    
    let suggestions = [];
    
    // 基于使用情况生成建议
    if (high_tier.usage_percentage > 90) {
        suggestions.push({
            text: '高级模型额度即将用完，建议切换到基础模型或等待明日重置',
            type: 'danger'
        });
    } else if (high_tier.usage_percentage > 75) {
        suggestions.push({
            text: '高级模型使用量较高，请注意控制使用频率',
            type: 'warning'
        });
    }
    
    if (basic_tier.usage_percentage > 90) {
        suggestions.push({
            text: '基础模型额度即将用完，建议暂停API调用或等待明日重置',
            type: 'danger'
        });
    } else if (basic_tier.usage_percentage > 75) {
        suggestions.push({
            text: '基础模型使用量较高，建议优化prompt以减少token消耗',
            type: 'warning'
        });
    }
    
    if (high_tier.usage_percentage < 50 && basic_tier.usage_percentage < 50) {
        suggestions.push({
            text: '当前使用量较低，可以正常使用API服务',
            type: 'success'
        });
    }
    
    // 通用建议
    suggestions.push({
        text: '数据更新可能有几分钟延迟，请以实际API响应为准',
        type: 'info'
    });
    
    // 渲染建议
    let html = '';
    for (const suggestion of suggestions) {
        html += `<div class="suggestion-item ${suggestion.type}">
            ${suggestion.text}
        </div>`;
    }
    
    elements.suggestions.innerHTML = html;
}

// 显示加载状态
function showLoading() {
    elements.loading.style.display = 'block';
    elements.error.style.display = 'none';
    elements.mainContent.style.display = 'none';
    elements.refreshBtn.disabled = true;
}

// 隐藏加载状态
function hideLoading() {
    elements.loading.style.display = 'none';
    elements.error.style.display = 'none';
    elements.mainContent.style.display = 'block';
    elements.refreshBtn.disabled = false;
}

// 显示错误
function showError(message) {
    elements.loading.style.display = 'none';
    elements.mainContent.style.display = 'none';
    elements.error.style.display = 'block';
    elements.errorText.textContent = message;
    elements.refreshBtn.disabled = false;
}

// 切换自动刷新
function toggleAutoRefresh() {
    if (elements.autoRefresh.checked) {
        // 开启自动刷新 (30秒)
        autoRefreshInterval = setInterval(fetchData, 30000);
    } else {
        // 关闭自动刷新
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
        }
    }
}

// 工具函数
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// 页面可见性API - 当页面重新可见时刷新数据
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && elements.autoRefresh.checked) {
        fetchData();
    }
}); 