/**
 * 登录页 - 统一微信登录
 * 所有人默认以申请人身份登录，主理人通过关于页隐藏入口进入管理后台
 */
const app = getApp();

Page({
  data: {
    userInfo: {},
    logging: false
  },

  onLoad() {
    const openid = wx.getStorageSync('_openid');
    if (openid) {
      this.autoLogin(openid);
    }
  },

  // 微信登录
  // 所有人默认以申请人身份登录，主理人通过关于页隐藏入口进入管理后台
  async doLogin() {
    if (this.data.logging) return;
    this.setData({ logging: true });
    wx.showLoading({ title: '登录中...' });

    try {
      const profileRes = await this.getUserProfile();
      const userInfo = profileRes.userInfo || {};
      const openid = await this.getOpenId();

      // isAdmin 始终为 false，仅密码验证后设为 true
      wx.setStorageSync('_openid', openid);
      wx.setStorageSync('_userInfo', userInfo);
      wx.removeStorageSync('_isAdmin');
      app.globalData.openid = openid;
      app.globalData.isAdmin = false;

      this.setData({ userInfo, logging: false });
      wx.hideLoading();
      wx.showToast({ title: '登录成功', icon: 'success' });

      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' });
      }, 800);

    } catch (err) {
      console.error('登录失败:', err);
      this.setData({ logging: false });
      wx.hideLoading();
      wx.showToast({ title: '登录失败，请重试', icon: 'none' });
    }
  },

  getUserProfile() {
    return new Promise((resolve) => {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: resolve,
        fail: () => resolve({ userInfo: {} })
      });
    });
  },

  getOpenId() {
    return wx.cloud.callFunction({
      name: 'checkAdmin',
      data: { action: 'getOpenId' }
    }).then(res => res.result.openid);
  },

  async autoLogin(openid) {
    wx.showLoading({ title: '加载中...' });
    const userInfo = wx.getStorageSync('_userInfo') || {};

    // isAdmin 始终为 false，仅密码验证后设为 true
    app.globalData.openid = openid;
    app.globalData.isAdmin = false;
    wx.removeStorageSync('_isAdmin');

    this.setData({ userInfo });
    wx.hideLoading();
    wx.switchTab({ url: '/pages/index/index' });
  }
});
