// 导入图片上传工具类
const imageUploader = require('../../utils/imageUploader');
// 导入图片理解工具类
const ImageUnderstanding = require('../../utils/imageUnderstanding');

Page({
  data: {
    flashOn: false,
    showResult: false,
    loading: false,
    recognizedWords: [],
    // 屏幕尺寸信息
    screenWidth: 375, // 默认值
    screenHeight: 667, // 默认值
    // 图片编辑相关状态
    showEditor: false,
    currentImagePath: '',
    // 裁剪区域信息（百分比格式）
    cropRect: {
      x: 0,
      y: 0,
      width: 100,
      height: 100
    },
    imageInfo: null,
    // 预览相关状态
    showPreview: false,
    previewImagePath: ''
  },

  onLoad() {
    this.ctx = wx.createCameraContext();
    
    // 获取屏幕尺寸
    const { windowWidth, windowHeight } = wx.getSystemInfoSync();
    this.setData({
      screenWidth: windowWidth,
      screenHeight: windowHeight
    });
  },

  // 处理返回按钮点击事件
  handleBack() {
    wx.navigateBack();
  },

  onCameraError(e) {
    console.error('相机错误:', e.detail);
    wx.showToast({
      title: '相机启动失败',
      icon: 'none'
    });
  },

  toggleFlash() {
    this.setData({
      flashOn: !this.data.flashOn
    });
  },

  takePhoto() {
    this.setData({ loading: true });
    
    this.ctx.takePhoto({
      quality: 'high',
      success: async (res) => {
        try {
          // 隐藏加载状态
          this.setData({ loading: false });
          // 显示图片编辑界面
          await this.showImageEditor(res.tempImagePath);
        } catch (error) {
          console.error('拍照后处理失败:', error);
          this.setData({ loading: false });
          wx.showToast({
            title: '处理失败，请重试',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('拍照失败:', err);
        this.setData({ loading: false });
        wx.showToast({
          title: '拍照失败',
          icon: 'none'
        });
      }
    });
  },

  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: async (res) => {
        try {
          // 显示图片编辑界面
          await this.showImageEditor(res.tempFilePaths[0]);
        } catch (error) {
          console.error('选择图片后处理失败:', error);
          wx.showToast({
            title: '处理失败，请重试',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 关闭图片编辑界面
   */
  closeImageEditor() {
    console.log('=== 关闭图片编辑界面 ===');
    this.setData({
      showEditor: false,
      currentImagePath: '',
      imageInfo: null
    });
  },

  /**
   * 显示图片编辑界面
   * @param {string} imagePath - 图片路径
   */
  async showImageEditor(imagePath) {
    console.log('=== 显示图片编辑界面 ===', imagePath);
    try {
      // 获取图片信息用于后续裁剪计算
      const imageInfo = await new Promise((resolve, reject) => {
        wx.getImageInfo({
          src: imagePath,
          success: resolve,
          fail: reject
        });
      });
      
      console.log('=== 获取图片信息成功 ===', imageInfo);
      
      // 设置图片编辑界面数据
      this.setData({
        showEditor: true,
        currentImagePath: imagePath,
        imageInfo: imageInfo,
        // 使用百分比设置默认裁剪框
        cropRect: {
          x: 5,
          y: 5,
          width: 90,
          height: 90
        }
      });
      
      console.log('=== 图片编辑界面设置完成 ===');
    } catch (error) {
      console.error('显示图片编辑界面失败:', error);
      wx.showToast({
        title: '图片加载失败',
        icon: 'none'
      });
      throw error;
    }
  },

  /**
   * 关闭图片编辑界面
   */
  closeImageEditor() {
    this.setData({
      showEditor: false,
      currentImagePath: '',
      imageInfo: null
    });
  },

  /**
   * 确认裁剪并上传图片
   */
  async confirmCrop() {
    console.log('=== confirmCrop 开始执行 ===');
    console.log('=== 当前裁剪区域 cropRect:', this.data.cropRect);
    console.log('=== 当前图片路径 currentImagePath:', this.data.currentImagePath);
    console.log('=== 当前图片信息 imageInfo:', this.data.imageInfo);
    
    // 检查必要的数据是否存在
    if (!this.data.currentImagePath) {
      console.error('=== 错误: 图片路径不存在 ===');
      wx.showToast({
        title: '图片不存在，请重新拍照或选择',
        icon: 'none'
      });
      this.setData({ loading: false });
      return;
    }
    
    if (!this.data.cropRect) {
      console.error('=== 错误: 裁剪区域不存在 ===');
      wx.showToast({
        title: '裁剪区域无效',
        icon: 'none'
      });
      this.setData({ loading: false });
      return;
    }
    
    // 设置加载状态
    this.setData({ loading: true });
    console.log('=== 设置loading状态为true ===');
    wx.showLoading({ title: '处理中...' });
    
    try {
      // 获取图片信息（如果没有预加载）
      const imgInfo = this.data.imageInfo || await new Promise((resolve, reject) => {
        wx.getImageInfo({
          src: this.data.currentImagePath,
          success: resolve,
          fail: reject
        });
      });
      
      console.log('=== 获取图片信息成功，准备裁剪 ===', imgInfo);
      
      // 获取canvas上下文
      const canvasId = 'cropCanvas';
      const ctx = wx.createCanvasContext(canvasId);
      
      // 获取裁剪区域百分比
      const { x, y, width, height } = this.data.cropRect;
      console.log('=== 裁剪百分比:', x, y, width, height);
      
      // 获取图片的原始尺寸
      const imgWidth = imgInfo.width;
      const imgHeight = imgInfo.height;
      console.log('=== 图片原始尺寸:', imgWidth, imgHeight);
      
      // 获取图片容器的尺寸，确保使用.in(this)来正确获取组件内的节点
      const containerInfo = await new Promise((resolve, reject) => {
        const query = wx.createSelectorQuery().in(this);
        query.select('.image-container').boundingClientRect();
        query.exec(res => {
          if (res && res[0]) {
            resolve(res[0]);
          } else {
            reject(new Error('无法获取容器尺寸'));
          }
        });
      });
      
      const containerWidth = containerInfo.width;
      const containerHeight = containerInfo.height;
      console.log('=== 容器尺寸:', containerWidth, containerHeight);
      
      // 计算图片在容器中的实际显示比例和偏移
      // 计算图片的实际显示尺寸（考虑fit模式）
      const imgRatio = imgWidth / imgHeight;
      const containerRatio = containerWidth / containerHeight;
      
      let actualDisplayWidth, actualDisplayHeight, offsetX, offsetY;
      
      if (imgRatio > containerRatio) {
        // 图片较宽，按宽度适应
        actualDisplayWidth = containerWidth;
        actualDisplayHeight = containerWidth / imgRatio;
        offsetX = 0;
        offsetY = (containerHeight - actualDisplayHeight) / 2;
      } else {
        // 图片较高，按高度适应
        actualDisplayHeight = containerHeight;
        actualDisplayWidth = containerHeight * imgRatio;
        offsetX = (containerWidth - actualDisplayWidth) / 2;
        offsetY = 0;
      }
      
      console.log('=== 图片实际显示尺寸:', actualDisplayWidth, actualDisplayHeight, offsetX, offsetY);
      
      // 根据容器中的实际显示计算裁剪坐标
      // 转换百分比坐标到容器实际像素坐标
      const containerX = (x / 100) * containerWidth;
      const containerY = (y / 100) * containerHeight;
      const containerCropWidth = (width / 100) * containerWidth;
      const containerCropHeight = (height / 100) * containerHeight;
      
      // 调整裁剪坐标，考虑图片在容器中的偏移
      const adjustedX = containerX - offsetX;
      const adjustedY = containerY - offsetY;
      
      console.log('=== 容器中裁剪坐标:', containerX, containerY, containerCropWidth, containerCropHeight);
      console.log('=== 调整后裁剪坐标:', adjustedX, adjustedY);
      
      // 计算相对于原始图片的裁剪比例
      const scaleX = imgWidth / actualDisplayWidth;
      const scaleY = imgHeight / actualDisplayHeight;
      
      // 确保宽度计算更精确，避免向下取整导致的宽度缩小问题
      // 计算最终的裁剪坐标（相对于原始图片）
      const finalCropX = Math.floor(adjustedX * scaleX);
      const finalCropY = Math.floor(adjustedY * scaleY);
      // 对于宽度使用Math.ceil确保不会因为四舍五入导致宽度变小
      const finalCropWidth = Math.ceil(containerCropWidth * scaleX);
      const finalCropHeight = Math.floor(containerCropHeight * scaleY);
      
      console.log('=== 缩放比例:', scaleX, scaleY);
      console.log('=== 容器裁剪尺寸:', containerCropWidth, containerCropHeight);
      
      // 调整边界检查逻辑，对宽度进行优化
      const safeCropX = Math.max(0, Math.min(imgWidth - 1, finalCropX));
      const safeCropY = Math.max(0, Math.min(imgHeight - 1, finalCropY));
      // 对于宽度，我们使用Math.ceil并稍微放宽边界检查，确保宽度足够
      const safeCropWidth = Math.ceil(Math.max(1, Math.min(imgWidth - safeCropX, finalCropWidth + 2)));
      // 保持原有的高度计算逻辑
      const safeCropHeight = Math.max(1, Math.min(imgHeight - safeCropY, finalCropHeight));
      
      console.log('=== 最终裁剪坐标和尺寸:', finalCropX, finalCropY, finalCropWidth, finalCropHeight);
      console.log('=== 安全边界后的裁剪尺寸:', safeCropX, safeCropY, safeCropWidth, safeCropHeight);
      
      // 移除旧的日志输出，避免混淆
      
      // 确保裁剪区域有效
      if (safeCropWidth <= 0 || safeCropHeight <= 0) {
        throw new Error('裁剪区域无效');
      }
      
      // 使用简单可靠的canvas处理方式
      const canvasContext = wx.createCanvasContext(canvasId);
      
      // 清空canvas
      canvasContext.clearRect(0, 0, 1000, 1000);
      
      // 直接绘制裁剪区域
      canvasContext.drawImage(
        this.data.currentImagePath, 
        safeCropX, safeCropY, safeCropWidth, safeCropHeight, 
        0, 0, safeCropWidth, safeCropHeight
      );
      
      // 使用Promise包装draw操作
      await new Promise((resolve) => {
        canvasContext.draw(false, resolve);
      });
      
      console.log('=== Canvas绘制完成 ===');
      
      // 延迟一点时间确保绘制完成
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 从canvas导出裁剪后的图片，明确指定导出尺寸
      const cropResult = await new Promise((resolve, reject) => {
        wx.canvasToTempFilePath({
          canvasId: canvasId,
          // 明确指定导出的宽度和高度
          width: safeCropWidth,
          height: safeCropHeight,
          // 确保导出区域精确对应裁剪内容
          destWidth: safeCropWidth,
          destHeight: safeCropHeight,
          success: resolve,
          fail: reject
        });
      });
      
      console.log('=== 导出图片尺寸:', safeCropWidth, safeCropHeight);
      
      console.log('=== 裁剪成功，直接上传识别 ===', cropResult.tempFilePath);
      
      // 关闭编辑界面并设置预览图片路径
      this.setData({ 
        showEditor: false,
        previewImagePath: cropResult.tempFilePath
      });
      
      // 直接调用上传识别功能，不再显示预览确认界面
      this.onConfirmUpload();
      
      console.log('=== 裁剪完成，直接进行上传识别 ===');
      // 不再直接上传，而是等待用户确认
      
    } catch (error) {
      console.error('裁剪过程出错:', error);
      wx.showToast({
        title: '裁剪失败: ' + error.message,
        icon: 'none'
      });
    } finally {
      console.log('=== 最终清理loading状态 ===');
      wx.hideLoading();
      this.setData({ 
        loading: false
        // 注意：不再在这里强制关闭showEditor，因为在try块中已经处理
      });
    }
  },

  /**
   * 重新裁剪
   * 用户点击重新裁剪按钮时调用，隐藏预览界面并重新显示裁剪编辑界面
   */


  /**
   * 确认上传
   * 用户确认裁剪结果后调用，上传预览图片进行识别
   */
  async onConfirmUpload() {
    if (!this.data.previewImagePath) {
      console.error('=== 错误: 预览图片路径不存在 ===');
      wx.showToast({
        title: '预览图片不存在',
        icon: 'none'
      });
      return;
    }

    console.log('=== 开始识别 ===');
    
    // 设置初始加载状态 - 第一阶段：裁剪中
    this.setData({ loading: true });
    wx.showLoading({ title: '裁剪中...' });

    try {
      // 延迟一小段时间，确保用户能看到裁剪中的提示
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 上传并识别图片
      await this.uploadAndRecognizeImage(this.data.previewImagePath);
    } catch (error) {
      console.error('上传识别过程出错:', error);
      // 先关闭加载提示，再显示错误提示
      wx.hideLoading();
      this.setData({ loading: false });
      wx.showToast({
        title: '识别失败: ' + error.message,
        icon: 'none'
      });
    }
    // 移除finally块中的自动关闭逻辑，由uploadAndRecognizeImage方法内部控制关闭
  },

  /**
   * 图片加载完成处理
   */
  onImageLoad(e) {
    // 获取图片信息
    const { width, height } = e.detail;
    this.setData({
      imageInfo: { width, height }
    });
  },
  
  /**
   * 记录触摸开始位置
   */
  onCropBoxTouchStart(e) {
    const { corner } = e.currentTarget.dataset || {};
    
    // 记录触摸起始位置和当前操作类型
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
    this.operationType = corner ? 'resize' : 'move';
    this.operationCorner = corner;
    
    // 记录开始时的裁剪框状态
    this.startCropRect = { ...this.data.cropRect };
  },

  /**
   * 处理裁剪框触摸移动
   */
  onCropBoxTouchMove(e) {
    // 获取容器尺寸
    const query = wx.createSelectorQuery().in(this);
    query.select('.image-container').boundingClientRect();
    
    query.exec((res) => {
      if (!res || !res[0]) return;
      
      const containerWidth = res[0].width;
      const containerHeight = res[0].height;
      
      // 获取当前触摸位置
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      
      // 计算触摸移动的差值（像素）
      const deltaX = currentX - this.touchStartX;
      const deltaY = currentY - this.touchStartY;
      
      // 更新起始位置
      this.touchStartX = currentX;
      this.touchStartY = currentY;
      
      // 计算像素到百分比的转换系数
      const pxToPercentX = 100 / containerWidth;
      const pxToPercentY = 100 / containerHeight;
      
      // 最小尺寸限制（百分比）
      const minWidthPercent = 15;
      const minHeightPercent = 15;
      
      // 获取当前裁剪框状态（而不是初始状态）
      let { x, y, width, height } = this.data.cropRect;
      
      // 将像素差值转换为百分比差值
      const deltaPercentX = deltaX * pxToPercentX;
      const deltaPercentY = deltaY * pxToPercentY;
      
      // 处理拖拽移动整个裁剪框
      if (this.operationType === 'move') {
        x += deltaPercentX;
        y += deltaPercentY;
        
        // 限制在有效范围内
        x = Math.max(0, Math.min(100 - width, x));
        y = Math.max(0, Math.min(100 - height, y));
      }
      // 处理通过控制点调整大小
      else if (this.operationType === 'resize' && this.operationCorner) {
        // 根据不同角调整裁剪框大小
        switch (this.operationCorner) {
          case 'top-left':
            x += deltaPercentX;
            y += deltaPercentY;
            width -= deltaPercentX;
            height -= deltaPercentY;
            break;
          case 'top-right':
            width += deltaPercentX;
            y += deltaPercentY;
            height -= deltaPercentY;
            break;
          case 'bottom-left':
            x += deltaPercentX;
            width -= deltaPercentX;
            height += deltaPercentY;
            break;
          case 'bottom-right':
            width += deltaPercentX;
            height += deltaPercentY;
            break;
        }
        
        // 确保裁剪框尺寸有效且不超出边界
        width = Math.max(minWidthPercent, Math.min(width, 100 - x));
        height = Math.max(minHeightPercent, Math.min(height, 100 - y));
        x = Math.max(0, Math.min(100 - width, x));
        y = Math.max(0, Math.min(100 - height, y));
      }
      
      // 更新裁剪框位置和大小
      this.setData({ 
        cropRect: { x, y, width, height } 
      });
    });
    
    // 阻止页面滚动
    return false;
  },

  /**
   * 上传图片并使用GLM-4.5v API进行单词识别
   * @param {string} imagePath - 图片本地路径
   * @returns {Promise<void>}
   */
  async uploadAndRecognizeImage(imagePath) {
    console.log('=== uploadAndRecognizeImage 开始执行 ===', imagePath);
    
    // 第二阶段：上传中
    wx.showLoading({ title: '上传中...' });
    
    try {
      console.log('开始处理图片...');
      
      // 步骤1: 上传图片到OSS
      console.log('=== 开始上传图片到OSS ===');
      
      const uploadResult = await imageUploader.uploadImage(
        'https://oss-upload-rbyekjwaqs.cn-beijing.fcapp.run/upload',
        imagePath,
        {
          user: 'test',
          secret: 'osstestu'
        }
      );
      
      console.log('=== 图片上传成功 ===', uploadResult);
      console.log('图片上传成功，URL:', uploadResult.url);
      
      // 第三阶段：识别中
      wx.showLoading({ title: '识别中...' });
      
      // 步骤2: 使用GLM-4.5v API进行图片理解和单词识别
      // 将内网地址转换为公网地址（移除-internal标记）
      const processedImageUrl = uploadResult.url.replace('-internal', '');
      console.log('=== 开始调用GLM-4.5v API进行图片理解 ===', processedImageUrl);
      
      // 调用更新后的recognizeText方法
      console.log('=== 调用recognizeText方法 ===');
      let recognizedWords = await this.recognizeText(processedImageUrl);
      
      // 检查是否是429错误
      if (recognizedWords && recognizedWords.isRateLimited) {
        console.log('=== 检测到429限流错误，不显示结果界面 ===');
        // 关闭加载提示
        wx.hideLoading();
        this.setData({ loading: false });
        // 显示友好提示
        wx.showToast({
          title: '当前识别请求过多，请稍后再试',
          icon: 'none',
          duration: 3000
        });
        return;
      } else if (recognizedWords && recognizedWords.hasError) {
        console.log('=== 检测到其他识别错误 ===');
        // 关闭加载提示
        wx.hideLoading();
        this.setData({ loading: false });
        // 显示友好提示
        wx.showToast({
          title: '识别服务暂时不可用，请稍后重试',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      
      console.log('=== 识别结果 ===', recognizedWords);
      console.log('图片理解完成，共识别到', recognizedWords.length, '个单词');
      
      // 步骤3: 显示识别结果
      console.log('=== 显示识别结果 ===');
      console.log('=== recognizedWords数据类型:', Array.isArray(recognizedWords));
      console.log('=== recognizedWords内容详情:', JSON.stringify(recognizedWords));
      
      // 确保数据格式正确
      const formattedWords = recognizedWords.map(item => ({
        text: String(item.text || ''),
        translation: String(item.translation || '')
      })).filter(item => item.text.trim());
      
      console.log('=== 格式化后的数据:', JSON.stringify(formattedWords));
      
      // 只有当有有效结果时才显示结果界面
      if (formattedWords.length > 0) {
        // 先设置showResult为false，然后延迟设置为true，确保UI正确刷新
        this.setData({
          showResult: true,
          recognizedWords: formattedWords
        });
      } else {
        console.log('=== 未识别到有效单词，显示提示信息 ===');
        wx.showToast({
          title: '未识别到有效单词，请尝试调整图片',
          icon: 'none',
          duration: 2000
        });
      }
    } catch (error) {
      console.error('=== catch块执行 - 处理图片过程中发生错误 ===', error);
      console.log('=== 错误堆栈 ===', error.stack);
      
      wx.showToast({
        title: '处理失败，请稍后重试',
        icon: 'none'
      });
      throw error;
    } finally {
      console.log('=== uploadAndRecognizeImage 执行结束 ===');
      // 统一在finally块中关闭加载提示，确保无论成功失败都会关闭
      wx.hideLoading();
      this.setData({ loading: false });
    }
  },

  /**
   * 使用GLM-4.5v API进行图片理解和单词识别
   * @param {string} imageUrl - 上传后的图片URL
   * @returns {Promise<Array>} 识别到的单词列表
   */
  async recognizeText(imageUrl) {
    console.log('=== recognizeText 开始执行 ===', imageUrl);
    try {
      console.log('=== 设置API令牌 ===');
      // 替换为真实的API令牌
      const GLM_API_TOKEN = '1abe26bfda6363dd9883694257fd8f6e.z39xgNybcbVUOhi3';
      
      console.log('=== 创建ImageUnderstanding实例 ===');
      // 创建图片理解实例
      const imageUnderstanding = new ImageUnderstanding(GLM_API_TOKEN);
      
      console.log('=== 调用GLM-4.5v API进行图片理解 ===');
      // 调用GLM-4.5v API进行图片理解
      const result = await imageUnderstanding.callGLMAPI(
        'GLM-4.1V-Thinking-Flash',
        imageUrl,
        '识别图中的单词，返回单词及其简明中文翻译，每行一个，不要返回任何其它内容或者解释说明性文字，示例：\nfood##食物\napple##苹果'
      );
      console.log('=== API调用完成，开始处理结果 ===');
      
      console.log('=== GLM-4.5v API返回原始结果 ===', result);
      
      // 解析结果为单词和翻译的数组
      console.log('=== 开始解析结果 ===');
      const recognizedWords = this.parseRecognitionResult(result);
      
      console.log('=== 解析完成，识别到单词数 ===', recognizedWords.length);
      console.log('=== 识别到的单词列表 ===', recognizedWords);
      
      if (recognizedWords.length > 0) {
        return recognizedWords;
      } else {
        // 如果没有识别到单词，使用模拟数据作为降级方案
        console.log('=== 未识别到单词，使用模拟数据 ===');
        return [];
      }
    } catch (error) {
      console.error('=== catch块执行 - GLM-4.5v API调用失败 ===', error);
      console.log('=== 错误堆栈 ===', error.stack);
      
      // 检查是否是429错误（请求过多）
      const errorMessage = error.message || '';
      if (errorMessage.includes('429')) {
        // 返回特殊标记，让调用者知道是429错误
        return { isRateLimited: true };
      }
      
      // 其他错误情况下，返回错误标记
      return { hasError: true };

    } finally {
      console.log('=== recognizeText 执行结束 ===');
    }
  },
  
  /**
   * 解析GLM-4.5v API返回的识别结果
   * @param {string} resultText - API返回的原始文本
   * @returns {Array} 解析后的单词对象数组
   */
  parseRecognitionResult(resultText) {
    console.log('=== parseRecognitionResult 开始执行 ===');
    
    if (!resultText || typeof resultText !== 'string') {
      console.log('=== 输入无效，返回空数组 ===');
      return [];
    }
    
    // 按行分割结果文本
    console.log('=== 按行分割结果文本 ===');
    const lines = resultText.split('\n');
    console.log('=== 结果行数 ===', lines.length);
    
    // 解析每行，提取单词和翻译
    console.log('=== 开始解析每行数据 ===');
    const words = lines
      .filter(line => {
        const trimmed = line.trim();
        const hasContent = trimmed && trimmed.includes('##');
        console.log(`=== 过滤行 [${trimmed}] - 保留: ${hasContent} ===`);
        return hasContent;
      })
      .map(line => {
        console.log(`=== 处理行: ${line} ===`);
        const [text, translation] = line.split('##');
        const parsed = {
          text: text ? text.trim() : '',
          translation: translation ? translation.trim() : ''
        };
        console.log(`=== 解析结果: ${parsed.text} => ${parsed.translation} ===`);
        return parsed;
      })
      .filter(word => {
        const isValid = word.text.length > 0;
        console.log(`=== 过滤单词 [${word.text}] - 有效: ${isValid} ===`);
        return isValid;
      });
    
    console.log('=== 解析完成，最终单词数 ===', words.length);
    return words;
  },

  // 生成模拟识别结果
  generateMockWords() {
    const mockData = [
      { text: 'apple', translation: '苹果' },
      { text: 'banana', translation: '香蕉' },
      { text: 'computer', translation: '计算机' },
      { text: 'education', translation: '教育' },
      { text: 'beautiful', translation: '美丽的' },
      { text: 'important', translation: '重要的' },
      { text: 'development', translation: '发展' },
      { text: 'technology', translation: '技术' }
    ];
    
    // 随机返回3-6个单词
    const count = Math.floor(Math.random() * 4) + 3;
    const shuffled = mockData.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  },

  hideResult() {
    this.setData({
      showResult: false,
      recognizedWords: []
    });
  },

  stopPropagation() {
    // 阻止事件冒泡
  },

  saveWords() {
    try {
      const newWords = this.data.recognizedWords;
      if (newWords.length === 0) {
        wx.showToast({
          title: '没有可保存的单词',
          icon: 'none'
        });
        return;
      }
      
      // 生成词库名称：导入词库-年月日时分秒
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const wordbookName = `导入词库-${year}${month}${day}${hours}${minutes}${seconds}`;
      
      // 1. 准备单词数据（无需单独保存到wordList，每个词库包含自己的单词列表）
      console.log('=== 准备保存的单词数量 ===', newWords.length)
      
      // 2. 创建新词库
      const wordLists = wx.getStorageSync('wordLists') || [];
      const newWordList = {
        id: `wordbook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: wordbookName,
        words: newWords.map(word => ({
          id: `word_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          text: word.text,
          translation: word.translation,
          addTime: now.getTime()
        })),
        createTime: now.getTime()
      };
      
      wordLists.push(newWordList);
      wx.setStorageSync('wordLists', wordLists);
      
      wx.showToast({
        title: `成功创建词库并保存${newWords.length}个单词`,
        icon: 'success'
      });
      
      console.log('=== 新词库创建成功 ===', newWordList);
      console.log('=== 词库列表更新完成 ===', wordLists.length, '个词库');
      
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      
    } catch (error) {
      console.error('保存单词失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    }
  }
});