// pages/wordlist/wordlist.js - 词库管理页面（背单词的子模块）
Page({
  data: {
    // 词库列表数据
    wordLists: [],
    wordListNames: [],
    
    // 弹窗状态
    showAddModal: false,
    showRenameModal: false,
    showDeleteModal: false,
    showMergeModal: false,
    
    // 表单数据
    newWordListName: '',
    renameWordListName: '',
    selectedWordListId: '',
    selectedWordListName: '',
    
    // 合并词库相关
    sourceWordListIndex: 0,
    targetWordListIndex: 0,
    selectedSourceWordList: '',
    selectedTargetWordList: ''
  },

  // 生命周期函数 - 页面加载
  onLoad() {
    this.initWordLists();
  },

  // 生命周期函数 - 页面显示
  onShow() {
    // 每次显示页面时重新加载词库数据
    this.loadWordLists();
  },

  // 初始化词库数据（如果不存在则创建默认词库）
  initWordLists() {
    try {
      const wordLists = wx.getStorageSync('wordLists');
      if (!wordLists || !Array.isArray(wordLists) || wordLists.length === 0) {
        // 创建默认词库
        const defaultWordLists = [
          {
            id: this.generateUniqueId(),
            name: '默认词库',
            createTime: new Date().getTime(),
            words: []
          }
        ];
        wx.setStorageSync('wordLists', defaultWordLists);
      }
      this.loadWordLists();
    } catch (error) {
      console.error('初始化词库失败:', error);
      wx.showToast({
        title: '初始化失败',
        icon: 'none'
      });
    }
  },

  // 加载词库数据
  loadWordLists() {
    try {
      const wordLists = wx.getStorageSync('wordLists') || [];
      const wordListNames = wordLists.map(list => list.name);
      
      this.setData({
        wordLists,
        wordListNames
      });
    } catch (error) {
      console.error('加载词库失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 生成唯一ID
  generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  // 显示新增词库弹窗
  showAddWordListModal() {
    this.setData({
      showAddModal: true,
      newWordListName: ''
    });
  },

  // 新增词库名称输入
  onNewWordListNameInput(e) {
    this.setData({
      newWordListName: e.detail.value
    });
  },

  // 取消新增词库
  cancelAddWordList() {
    this.setData({
      showAddModal: false,
      newWordListName: ''
    });
  },

  // 确认新增词库
  confirmAddWordList() {
    const name = this.data.newWordListName.trim();
    if (!name) {
      wx.showToast({
        title: '请输入词库名称',
        icon: 'none'
      });
      return;
    }

    try {
      const newWordList = {
        id: this.generateUniqueId(),
        name: name,
        createTime: new Date().getTime(),
        words: []
      };

      const wordLists = [...this.data.wordLists, newWordList];
      wx.setStorageSync('wordLists', wordLists);
      
      wx.showToast({
        title: '新增成功',
        icon: 'success'
      });
      
      this.setData({
        showAddModal: false,
        newWordListName: ''
      });
      
      this.loadWordLists();
    } catch (error) {
      console.error('新增词库失败:', error);
      wx.showToast({
        title: '新增失败',
        icon: 'none'
      });
    }
  },

  // 显示重命名词库弹窗
  showRenameWordListModal(e) {
    // 获取正确的id和index - 从父元素传递或直接从按钮获取
    const { id, index } = e.currentTarget.dataset;
    
    // 安全检查：确保id和index都存在
    if (!id || index === undefined) {
      wx.showToast({
        title: '数据错误，请重试',
        icon: 'none'
      });
      return;
    }
    
    // 查找匹配的词库
    const wordList = this.data.wordLists.find(list => list.id === id) || this.data.wordLists[index];
    
    // 安全检查：确保词库存在
    if (!wordList) {
      wx.showToast({
        title: '未找到词库信息',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      showRenameModal: true,
      renameWordListName: wordList.name || '',
      selectedWordListId: wordList.id,
      selectedWordListName: wordList.name || ''
    });
  },

  // 重命名词库名称输入
  onRenameWordListNameInput(e) {
    this.setData({
      renameWordListName: e.detail.value
    });
  },

  // 取消重命名词库
  cancelRenameWordList() {
    this.setData({
      showRenameModal: false,
      renameWordListName: '',
      selectedWordListId: '',
      selectedWordListName: ''
    });
  },

  // 确认重命名词库
  confirmRenameWordList() {
    const name = this.data.renameWordListName.trim();
    if (!name) {
      wx.showToast({
        title: '请输入词库名称',
        icon: 'none'
      });
      return;
    }

    try {
      const wordLists = this.data.wordLists.map(list => 
        list.id === this.data.selectedWordListId 
          ? { ...list, name: name }
          : list
      );
      
      wx.setStorageSync('wordLists', wordLists);
      
      wx.showToast({
        title: '重命名成功',
        icon: 'success'
      });
      
      this.setData({
        showRenameModal: false,
        renameWordListName: '',
        selectedWordListId: '',
        selectedWordListName: ''
      });
      
      this.loadWordLists();
    } catch (error) {
      console.error('重命名词库失败:', error);
      wx.showToast({
        title: '重命名失败',
        icon: 'none'
      });
    }
  },

  // 显示删除词库弹窗
  showDeleteWordListModal(e) {
    // 获取正确的id和index
    const { id, index } = e.currentTarget.dataset;
    
    // 安全检查：确保id和index都存在
    if (!id || index === undefined) {
      wx.showToast({
        title: '数据错误，请重试',
        icon: 'none'
      });
      return;
    }
    
    // 查找匹配的词库
    const wordList = this.data.wordLists.find(list => list.id === id) || this.data.wordLists[index];
    
    // 安全检查：确保词库存在
    if (!wordList) {
      wx.showToast({
        title: '未找到词库信息',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      showDeleteModal: true,
      selectedWordListId: wordList.id,
      selectedWordListName: wordList.name || ''
    });
  },

  // 取消删除词库
  cancelDeleteWordList() {
    this.setData({
      showDeleteModal: false,
      selectedWordListId: '',
      selectedWordListName: ''
    });
  },

  // 确认删除词库
  confirmDeleteWordList() {
    try {
      // 至少保留一个词库
      if (this.data.wordLists.length <= 1) {
        wx.showToast({
          title: '至少保留一个词库',
          icon: 'none'
        });
        return;
      }
      
      const wordLists = this.data.wordLists.filter(list => list.id !== this.data.selectedWordListId);
      wx.setStorageSync('wordLists', wordLists);
      
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });
      
      this.setData({
        showDeleteModal: false,
        selectedWordListId: '',
        selectedWordListName: ''
      });
      
      this.loadWordLists();
    } catch (error) {
      console.error('删除词库失败:', error);
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    }
  },

  // 显示合并词库弹窗
  showMergeWordListModal() {
    if (this.data.wordLists.length < 2) {
      wx.showToast({
        title: '至少需要两个词库才能合并',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      showMergeModal: true,
      sourceWordListIndex: 0,
      targetWordListIndex: 1,
      selectedSourceWordList: this.data.wordListNames[0],
      selectedTargetWordList: this.data.wordListNames[1]
    });
  },

  // 源词库选择变化
  onSourceWordListChange(e) {
    const index = e.detail.value;
    this.setData({
      sourceWordListIndex: index,
      selectedSourceWordList: this.data.wordListNames[index]
    });
  },

  // 目标词库选择变化
  onTargetWordListChange(e) {
    const index = e.detail.value;
    this.setData({
      targetWordListIndex: index,
      selectedTargetWordList: this.data.wordListNames[index]
    });
  },

  // 取消合并词库
  cancelMergeWordList() {
    this.setData({
      showMergeModal: false,
      sourceWordListIndex: 0,
      targetWordListIndex: 0,
      selectedSourceWordList: '',
      selectedTargetWordList: ''
    });
  },

  // 确认合并词库
  confirmMergeWordList() {
    const { sourceWordListIndex, targetWordListIndex } = this.data;
    
    if (sourceWordListIndex === targetWordListIndex) {
      wx.showToast({
        title: '源词库和目标词库不能相同',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '合并确认',
      content: `确定要将「${this.data.selectedSourceWordList}」合并到「${this.data.selectedTargetWordList}」吗？合并后源词库将被保留。`,
      success: (res) => {
        if (res.confirm) {
          this.performMergeWordList();
        }
      }
    });
  },

  // 执行合并词库
  performMergeWordList() {
    try {
      const { sourceWordListIndex, targetWordListIndex } = this.data;
      const wordLists = [...this.data.wordLists];
      const sourceWordList = wordLists[sourceWordListIndex];
      const targetWordList = wordLists[targetWordListIndex];
      
      // 创建单词映射，避免重复
      const targetWordMap = new Map();
      targetWordList.words.forEach(word => {
        targetWordMap.set(word.text.toLowerCase(), word);
      });
      
      // 添加源词库中不存在于目标词库的单词
      let newWordCount = 0;
      sourceWordList.words.forEach(word => {
        const key = word.text.toLowerCase();
        if (!targetWordMap.has(key)) {
          targetWordMap.set(key, word);
          newWordCount++;
        }
      });
      
      // 更新目标词库的单词列表
      wordLists[targetWordListIndex].words = Array.from(targetWordMap.values());
      
      wx.setStorageSync('wordLists', wordLists);
      
      wx.showToast({
        title: `合并成功，新增${newWordCount}个单词`,
        icon: 'success'
      });
      
      this.setData({
        showMergeModal: false,
        sourceWordListIndex: 0,
        targetWordListIndex: 0,
        selectedSourceWordList: '',
        selectedTargetWordList: ''
      });
      
      this.loadWordLists();
    } catch (error) {
      console.error('合并词库失败:', error);
      wx.showToast({
        title: '合并失败',
        icon: 'none'
      });
    }
  },

  // 查看词库详情
  viewWordListDetail(e) {
    // 获取正确的id
    const { id, index } = e.currentTarget.dataset;
    
    // 安全检查：确保id存在
    if (!id) {
      wx.showToast({
        title: '数据错误，请重试',
        icon: 'none'
      });
      return;
    }
    
    // 查找匹配的词库
    const wordList = this.data.wordLists.find(list => list.id === id) || (index !== undefined && this.data.wordLists[index]);
    
    // 安全检查：确保词库存在
    if (!wordList) {
      wx.showToast({
        title: '未找到词库信息',
        icon: 'none'
      });
      return;
    }
    
    // 跳转到词库详情页面
    wx.navigateTo({
      url: `/pages/wordlist/detail/wordlist-detail?id=${wordList.id}`
    });
  }
});