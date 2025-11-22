// app.js
App({})

// 全局过滤器
wx.Filter = {
  // 格式化时间戳为年月日时分秒格式
  formatTime(timestamp) {
    if (!timestamp || typeof timestamp !== 'number') {
      return '未知';
    }
    
    // 处理负数时间戳
    if (timestamp < 0) {
      return '未知';
    }
    
    const date = new Date(timestamp);
    
    // 处理无效日期
    if (isNaN(date.getTime())) {
      return '未知';
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
};

// 使用mixin注入过滤器
wx.mixin = {
  onLoad() {
    // 为空时不处理
  }
};

// 自定义过滤器处理
// 在页面渲染时会自动使用
