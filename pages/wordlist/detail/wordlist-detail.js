Page({
  data: {
    wordListId: '',
    wordList: null,
    words: [],
    showAddWordModal: false,
    newWordText: '',
    newWordTranslation: '',
    showEditWordModal: false,
    editWordIndex: -1,
    editWordText: '',
    editWordTranslation: '',
    showImportWordListModal: false,
    availableWordLists: [],
    isLoading: true
  },

  onLoad(options) {
    // 从页面参数中获取词库ID
    if (options.id) {
      this.setData({
        wordListId: options.id
      });
      this.loadWordListData();
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },
  
  onReady() {
    // 确保页面渲染完成后设置列表容器的样式
    setTimeout(() => {
      this.setWordsListScroll();
    }, 100);
  },
  
  // 设置单词列表滚动样式
  setWordsListScroll() {
    const query = wx.createSelectorQuery();
    query.select('.words-list').boundingClientRect();
    query.exec(res => {
      if (res && res[0]) {
        // 确保容器有明确的高度并启用滚动
        // 这里通过样式设置已经在CSS中定义，这里只是确保样式正确应用
        console.log('单词列表容器高度:', res[0].height);
      }
    });
  },

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
  },

  // 加载词库数据
  loadWordListData() {
    try {
      // 从存储中获取所有词库
      const wordLists = wx.getStorageSync('wordLists') || [];
      
      // 查找指定ID的词库
      let wordList = wordLists.find(list => list.id === this.data.wordListId);
      
      if (wordList) {
        // 复制词库对象，避免直接修改原始数据
        wordList = { ...wordList };
        
        // 直接在JS中格式化时间，而不是依赖过滤器
        if (wordList.createTime) {
          wordList.formattedCreateTime = this.formatTime(wordList.createTime);
        } else {
          wordList.formattedCreateTime = '未知';
        }
        
        this.setData({
          wordList: wordList,
          words: wordList.words || [],
          isLoading: false
        });
        
        // 设置页面标题
        wx.setNavigationBarTitle({
          title: wordList.name || '词库详情'
        });
      } else {
        wx.showToast({
          title: '未找到词库',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    } catch (error) {
      console.error('加载词库数据失败:', error);
      wx.showToast({
        title: '数据加载失败',
        icon: 'none'
      });
      this.setData({
        isLoading: false
      });
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },

  // 显示新增单词弹窗
  showAddWordModal() {
    this.setData({
      showAddWordModal: true,
      newWordText: '',
      newWordTranslation: ''
    });
  },

  // 新增单词输入
  onNewWordTextInput(e) {
    this.setData({
      newWordText: e.detail.value
    });
  },

  onNewWordTranslationInput(e) {
    this.setData({
      newWordTranslation: e.detail.value
    });
  },

  // 取消新增单词
  cancelAddWord() {
    this.setData({
      showAddWordModal: false,
      newWordText: '',
      newWordTranslation: ''
    });
  },

  // 确认新增单词
  confirmAddWord() {
    const text = this.data.newWordText.trim();
    const translation = this.data.newWordTranslation.trim();
    
    if (!text) {
      wx.showToast({
        title: '请输入单词',
        icon: 'none'
      });
      return;
    }
    
    if (!translation) {
      wx.showToast({
        title: '请输入翻译',
        icon: 'none'
      });
      return;
    }
    
    try {
      // 获取所有词库
      const wordLists = wx.getStorageSync('wordLists') || [];
      
      // 找到当前词库
      const wordListIndex = wordLists.findIndex(list => list.id === this.data.wordListId);
      
      if (wordListIndex !== -1) {
        // 检查单词是否已存在
        const isExist = wordLists[wordListIndex].words.some(word => 
          word.text.toLowerCase() === text.toLowerCase()
        );
        
        if (isExist) {
          wx.showToast({
            title: '单词已存在',
            icon: 'none'
          });
          return;
        }
        
        // 添加新单词
        const newWord = {
          text: text,
          translation: translation,
          createTime: new Date().getTime(),
          lastReviewTime: null,
          reviewCount: 0
        };
        
        wordLists[wordListIndex].words.push(newWord);
        
        // 保存到存储
        wx.setStorageSync('wordLists', wordLists);
        
        wx.showToast({
          title: '新增成功',
          icon: 'success'
        });
        
        // 更新当前页面数据
        this.setData({
          showAddWordModal: false,
          newWordText: '',
          newWordTranslation: '',
          words: wordLists[wordListIndex].words
        });
      }
    } catch (error) {
      console.error('新增单词失败:', error);
      wx.showToast({
        title: '新增失败',
        icon: 'none'
      });
    }
  },

  // 显示编辑单词弹窗
  showEditWordModal(e) {
    const { index } = e.currentTarget.dataset;
    const word = this.data.words[index];
    
    this.setData({
      showEditWordModal: true,
      editWordIndex: index,
      editWordText: word.text || '',
      editWordTranslation: word.translation || ''
    });
  },

  // 编辑单词输入
  onEditWordTextInput(e) {
    this.setData({
      editWordText: e.detail.value
    });
  },

  onEditWordTranslationInput(e) {
    this.setData({
      editWordTranslation: e.detail.value
    });
  },

  // 取消编辑单词
  cancelEditWord() {
    this.setData({
      showEditWordModal: false,
      editWordIndex: -1,
      editWordText: '',
      editWordTranslation: ''
    });
  },

  // 确认编辑单词
  confirmEditWord() {
    const text = this.data.editWordText.trim();
    const translation = this.data.editWordTranslation.trim();
    const index = this.data.editWordIndex;
    
    if (!text) {
      wx.showToast({
        title: '请输入单词',
        icon: 'none'
      });
      return;
    }
    
    if (!translation) {
      wx.showToast({
        title: '请输入翻译',
        icon: 'none'
      });
      return;
    }
    
    try {
      // 获取所有词库
      const wordLists = wx.getStorageSync('wordLists') || [];
      
      // 找到当前词库
      const wordListIndex = wordLists.findIndex(list => list.id === this.data.wordListId);
      
      if (wordListIndex !== -1) {
        // 检查单词是否与其他单词重复（排除自身）
        const isExist = wordLists[wordListIndex].words.some((word, i) => 
          i !== index && word.text.toLowerCase() === text.toLowerCase()
        );
        
        if (isExist) {
          wx.showToast({
            title: '单词已存在',
            icon: 'none'
          });
          return;
        }
        
        // 更新单词
        wordLists[wordListIndex].words[index] = {
          ...wordLists[wordListIndex].words[index],
          text: text,
          translation: translation
        };
        
        // 保存到存储
        wx.setStorageSync('wordLists', wordLists);
        
        wx.showToast({
          title: '修改成功',
          icon: 'success'
        });
        
        // 更新当前页面数据
        const updatedWords = [...this.data.words];
        updatedWords[index] = wordLists[wordListIndex].words[index];
        
        this.setData({
          showEditWordModal: false,
          editWordIndex: -1,
          editWordText: '',
          editWordTranslation: '',
          words: updatedWords
        });
      }
    } catch (error) {
      console.error('修改单词失败:', error);
      wx.showToast({
        title: '修改失败',
        icon: 'none'
      });
    }
  },

  // 删除单词
  deleteWord(e) {
    const { index } = e.currentTarget.dataset;
    const word = this.data.words[index];
    
    wx.showModal({
      title: '删除确认',
      content: `确定要删除单词「${word.text}」吗？`,
      success: (res) => {
        if (res.confirm) {
          this.performDeleteWord(index);
        }
      }
    });
  },

  // 执行删除单词
  performDeleteWord(index) {
    try {
      // 获取所有词库
      const wordLists = wx.getStorageSync('wordLists') || [];
      
      // 找到当前词库
      const wordListIndex = wordLists.findIndex(list => list.id === this.data.wordListId);
      
      if (wordListIndex !== -1) {
        // 删除单词
        wordLists[wordListIndex].words.splice(index, 1);
        
        // 保存到存储
        wx.setStorageSync('wordLists', wordLists);
        
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
        
        // 更新当前页面数据
        const updatedWords = [...this.data.words];
        updatedWords.splice(index, 1);
        
        this.setData({
          words: updatedWords
        });
      }
    } catch (error) {
      console.error('删除单词失败:', error);
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    }
  },

  // 显示导入词库弹窗
  showImportWordListModal() {
    try {
      // 获取所有词库
      const wordLists = wx.getStorageSync('wordLists') || [];
      
      // 过滤掉当前词库，只显示其他可用词库
      const availableWordLists = wordLists.filter(list => list.id !== this.data.wordListId);
      
      if (availableWordLists.length === 0) {
        wx.showToast({
          title: '暂无可用词库',
          icon: 'none'
        });
        return;
      }
      
      this.setData({
        availableWordLists: availableWordLists,
        showImportWordListModal: true
      });
    } catch (error) {
      console.error('加载词库列表失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 取消导入词库
  cancelImportWordList() {
    this.setData({
      showImportWordListModal: false,
      availableWordLists: []
    });
  },

  // 选择词库进行导入
  selectWordListToImport(e) {
    const { id } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '导入确认',
      content: '确定要导入所选词库的单词吗？重复的单词将被跳过。',
      success: (res) => {
        if (res.confirm) {
          this.performImportWordList(id);
        }
      }
    });
  },

  // 执行导入词库操作
  performImportWordList(sourceWordListId) {
    try {
      wx.showLoading({
        title: '导入中...',
      });
      
      // 获取所有词库
      const wordLists = wx.getStorageSync('wordLists') || [];
      
      // 找到源词库和目标词库
      const sourceWordListIndex = wordLists.findIndex(list => list.id === sourceWordListId);
      const targetWordListIndex = wordLists.findIndex(list => list.id === this.data.wordListId);
      
      if (sourceWordListIndex === -1 || targetWordListIndex === -1) {
        wx.showToast({
          title: '词库信息错误',
          icon: 'none'
        });
        return;
      }
      
      const sourceWords = wordLists[sourceWordListIndex].words || [];
      const targetWords = wordLists[targetWordListIndex].words || [];
      
      // 创建当前单词的小写集合，用于快速去重
      const existingWords = new Set(targetWords.map(word => word.text.toLowerCase()));
      
      // 过滤出不重复的单词并添加到目标词库
      const newWordsCount = sourceWords.reduce((count, sourceWord) => {
        if (!existingWords.has(sourceWord.text.toLowerCase())) {
          // 添加新单词（复制一份，保留单词内容但创建新的时间戳等）
          const newWord = {
            text: sourceWord.text,
            translation: sourceWord.translation,
            createTime: new Date().getTime(),
            lastReviewTime: null,
            reviewCount: 0
          };
          targetWords.push(newWord);
          existingWords.add(sourceWord.text.toLowerCase());
          return count + 1;
        }
        return count;
      }, 0);
      
      // 保存到存储
      wx.setStorageSync('wordLists', wordLists);
      
      // 更新当前页面数据
      this.setData({
        words: targetWords,
        showImportWordListModal: false,
        availableWordLists: []
      });
      
      wx.hideLoading();
      
      if (newWordsCount > 0) {
        wx.showToast({
          title: `成功导入${newWordsCount}个单词`,
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: '没有导入新单词（全部重复）',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('导入词库失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '导入失败',
        icon: 'none'
      });
    }
  }
});