Page({
  data: {
    userInfo: {},
    wordCount: 0
  },

  onShow() {
    this.loadUserInfo();
    this.loadWordCount();
  },

  loadUserInfo() {
    // 获取用户信息
    wx.getUserInfo({
      success: (res) => {
        this.setData({
          userInfo: res.userInfo
        });
      }
    });
  },

  loadWordCount() {
    try {
      const words = wx.getStorageSync('wordList') || [];
      this.setData({
        wordCount: words.length
      });
    } catch (error) {
      console.error('加载单词数量失败:', error);
    }
  },

  goToWordList() {
    wx.navigateTo({
      url: '/pages/wordlist/wordlist'
    });
  },

  goToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  },

  goToAbout() {
    wx.navigateTo({
      url: '/pages/about/about'
    });
  }
});