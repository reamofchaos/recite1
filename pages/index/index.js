Page({
  data: {
    totalWords: 0,
    studiedWords: 0,
    masteredWords: 0,
    studiedDays: 0
  },

  onShow() {
    this.updateStats();
    this.calculateStudiedDays();
  },

  updateStats() {
    try {
      const words = wx.getStorageSync('wordList') || [];
      const studyProgress = wx.getStorageSync('studyProgress') || {};
      
      let studiedCount = 0;
      let masteredCount = 0;
      
      words.forEach(word => {
        const progress = studyProgress[word.text] || { studied: false, mastered: false };
        if (progress.studied) studiedCount++;
        if (progress.mastered) masteredCount++;
      });

      this.setData({
        totalWords: words.length,
        studiedWords: studiedCount,
        masteredWords: masteredCount
      });
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  },

  calculateStudiedDays() {
    try {
      const firstStudyDate = wx.getStorageSync('firstStudyDate');
      if (firstStudyDate) {
        const today = new Date();
        const firstDate = new Date(firstStudyDate);
        const diffTime = Math.abs(today - firstDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        this.setData({
          studiedDays: diffDays
        });
      } else {
        // 如果没有首次学习日期，设置为今天
        wx.setStorageSync('firstStudyDate', new Date().toISOString().split('T')[0]);
        this.setData({
          studiedDays: 1
        });
      }
    } catch (error) {
      console.error('计算学习天数失败:', error);
    }
  },

  clearProgress() {
    wx.showModal({
      title: '重置进度',
      content: '确定要重置所有学习进度吗？此操作不可撤销。',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.removeStorageSync('studyProgress');
            wx.showToast({
              title: '进度已重置',
              icon: 'success'
            });
            this.updateStats();
          } catch (error) {
            console.error('重置进度失败:', error);
            wx.showToast({
              title: '重置失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  about() {
    wx.showModal({
      title: '关于单词背诵小程序',
      content: '版本 1.0.0\n\n一款帮助您通过拍照识词和背诵练习来学习英语单词的小程序。',
      showCancel: false
    });
  },

  goToWordList() {
    wx.navigateTo({
      url: '/pages/wordlist/wordlist'
    });
  }
});