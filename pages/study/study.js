Page({
  data: {
    // 主页面数据
    totalWords: 0,
    masteredWords: 0,
    unstudiedWords: 0,
    studyMode: 'all', // all, unstudied
    randomOrder: true,
    showResetModal: false,
    
    // 学习页面数据
    isStudying: false,
    currentWord: null,
    currentIndex: 0,
    studyWords: [],
    progress: 0,
    showTranslation: false,
    completed: false,
    correctCount: 0,
    wrongCount: 0,
    wrongWords: []
  },

  onLoad() {
    this.updateStats();
  },
  
  onShow() {
    // 每次页面显示时更新统计数据
    this.updateStats();
    // 如果正在学习中，不重置状态
    if (!this.data.isStudying) {
      this.setData({
        isStudying: false,
        completed: false
      });
    }
  },

  // 更新统计数据
  updateStats() {
    try {
      const words = wx.getStorageSync('wordList') || [];
      const studyProgress = wx.getStorageSync('studyProgress') || {};
      
      let masteredCount = 0;
      let unstudiedCount = 0;
      
      words.forEach(word => {
        const progress = studyProgress[word.text] || {};
        if (progress.mastered) {
          masteredCount++;
        } else if (!progress.studied) {
          unstudiedCount++;
        }
      });
      
      this.setData({
        totalWords: words.length,
        masteredWords: masteredCount,
        unstudiedWords: unstudiedCount
      });
    } catch (error) {
      console.error('更新统计失败:', error);
    }
  },

  // 跳转到拍照识词页面
  goToCamera() {
    wx.navigateTo({
      url: '/pages/camera/camera'
    });
  },

  // 跳转到词库管理页面（作为背单词的子模块）
  goToWordList() {
    wx.navigateTo({
      url: '/pages/wordlist/wordlist'
    });
  },

  // 显示重置进度确认弹窗
  showResetProgress() {
    this.setData({
      showResetModal: true
    });
  },

  // 取消重置
  cancelReset() {
    this.setData({
      showResetModal: false
    });
  },

  // 确认重置进度
  confirmReset() {
    try {
      wx.removeStorageSync('studyProgress');
      wx.showToast({
        title: '进度已重置',
        icon: 'success'
      });
      this.setData({
        showResetModal: false
      });
      this.updateStats();
    } catch (error) {
      console.error('重置进度失败:', error);
      wx.showToast({
        title: '重置失败',
        icon: 'none'
      });
    }
  },

  // 设置学习模式
  setStudyMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({
      studyMode: mode
    });
  },

  // 切换随机排序
  toggleRandomOrder() {
    this.setData({
      randomOrder: !this.data.randomOrder
    });
  },

  // 开始学习
  startStudy() {
    try {
      const words = wx.getStorageSync('wordList') || [];
      const studyProgress = wx.getStorageSync('studyProgress') || {};
      
      if (words.length === 0) {
        wx.showToast({
          title: '暂无单词可学习',
          icon: 'none'
        });
        return;
      }

      let studyWords = words;
      
      // 根据学习模式过滤
      if (this.data.studyMode === 'unstudied') {
        studyWords = words.filter(word => {
          const progress = studyProgress[word.text] || {};
          return !progress.studied && !progress.mastered;
        });
      }

      if (studyWords.length === 0) {
        wx.showToast({
          title: '没有符合条件的单词',
          icon: 'none'
        });
        return;
      }

      // 随机打乱顺序
      if (this.data.randomOrder) {
        studyWords = this.shuffleArray([...studyWords]);
      }

      this.setData({
        isStudying: true,
        studyWords,
        totalWords: studyWords.length,
        currentIndex: 0,
        currentWord: studyWords[0] || null,
        progress: 0,
        showTranslation: false,
        completed: false,
        correctCount: 0,
        wrongCount: 0,
        wrongWords: []
      });

    } catch (error) {
      console.error('初始化学习失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 返回主页
  backToHome() {
    this.setData({
      isStudying: false,
      completed: false
    });
  },

  // 洗牌算法
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  },

  // 翻转卡片
  flipCard() {
    this.setData({
      showTranslation: !this.data.showTranslation
    });
  },

  // 标记认识
  markEasy() {
    this.setData({
      correctCount: this.data.correctCount + 1
    });
    this.updateProgress(true);
    this.nextWord();
  },

  // 标记不认识
  markDifficult() {
    this.setData({
      wrongCount: this.data.wrongCount + 1
    });
    this.data.wrongWords.push(this.data.currentWord);
    this.updateProgress(false);
    this.nextWord();
  },

  // 更新学习进度
  updateProgress(isCorrect) {
    try {
      const studyProgress = wx.getStorageSync('studyProgress') || {};
      const wordText = this.data.currentWord.text;
      
      studyProgress[wordText] = {
        studied: true,
        mastered: isCorrect,
        lastStudyTime: new Date().getTime()
      };
      
      wx.setStorageSync('studyProgress', studyProgress);
    } catch (error) {
      console.error('更新学习进度失败:', error);
    }
  },

  nextWord() {
    const { currentIndex, totalWords, studyWords } = this.data;
    const nextIndex = currentIndex + 1;
    
    if (nextIndex >= totalWords) {
      // 学习完成
      this.setData({
        completed: true,
        progress: 100
      });
    } else {
      // 下一个单词
      this.setData({
        currentIndex: nextIndex,
        currentWord: studyWords[nextIndex],
        progress: (nextIndex / totalWords) * 100,
        showTranslation: false
      });
    }
  },

  reviewWrong() {
    const wrongWords = this.shuffleArray([...this.data.wrongWords]);
    this.setData({
      studyWords: wrongWords,
      totalWords: wrongWords.length,
      currentIndex: 0,
      currentWord: wrongWords[0] || null,
      progress: 0,
      showTranslation: false,
      completed: false,
      correctCount: 0,
      wrongCount: 0,
      wrongWords: []
    });
  },

  restartStudy() {
    this.initStudy();
  },

  goBack() {
    wx.navigateBack();
  },

  goToCamera() {
    wx.navigateTo({
      url: '/pages/camera/camera'
    });
  },

  showSettingsPanel() {
    this.setData({
      showSettings: true
    });
  },

  hideSettings() {
    this.setData({
      showSettings: false
    });
  },

  setStudyMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({
      studyMode: mode
    });
    this.initStudy();
    this.hideSettings();
  },

  toggleRandomOrder(e) {
    this.setData({
      randomOrder: e.detail.value
    });
  },

  stopPropagation() {
    // 阻止事件冒泡
  }
});