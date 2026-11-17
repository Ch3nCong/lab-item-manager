/**
 * 关于页 - 含隐藏管理入口（点击Logo 5次 + 密码验证）
 */
const constants = require('../../utils/constants');

Page({
  data: {
    clickCount: 0,
    showAdminTip: false,
    showPwdDialog: false,
    pwdInput: '',
    pwdError: '',
    appVersion: '1.0.0',
    isAdmin: false,
    displayName: '已登录',
    avatarUrl: ''
  },

  onShow() {
    if (typeof this.getTabBar === 'function') { this.getTabBar().setData({ selected: 2 }); }
    const userInfo = wx.getStorageSync('_userInfo') || {};
    const savedName = wx.getStorageSync('_applicant') || '';
    const nick = userInfo.nickName || '';

    // 优先历史填写姓名，其次微信昵称（排除默认值），否则显示"已登录"
    let displayName = '已登录';
    if (savedName) displayName = savedName;
    else if (nick && nick !== '微信用户') displayName = nick;

    this.setData({
      isAdmin: wx.getStorageSync('_isAdmin') || false,
      displayName,
      avatarUrl: userInfo.avatarUrl || ''
    });
  },

  // Logo 点击计数
  onLogoClick() {
    let count = this.data.clickCount + 1;
    this.setData({ clickCount: count });

    if (count === 2) {
      this.setData({ showAdminTip: true });
    }

    if (count >= constants.ADMIN_ENTRY_CLICK_COUNT) {
      this.setData({ clickCount: 0, showAdminTip: false });
      this.showPasswordDialog();
    }
  },

  // 显示密码弹窗
  showPasswordDialog() {
    this.setData({ showPwdDialog: true, pwdInput: '', pwdError: '' });
  },

  // 密码输入
  onPwdInput(e) {
    this.setData({ pwdInput: e.detail.value, pwdError: '' });
  },

  // 验证密码
  verifyPassword() {
    if (this.data.pwdInput === constants.ADMIN_PASSWORD) {
      this.setData({ showPwdDialog: false });
      this.enterAdmin();
    } else {
      this.setData({ pwdError: '密码错误' });
    }
  },

  // 取消密码输入
  cancelPwd() {
    this.setData({ showPwdDialog: false, pwdInput: '', pwdError: '' });
  },

  // 进入管理后台
  enterAdmin() {
    const app = getApp();
    if (!app.globalData.openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    // 密码已验证通过，直接授予管理权限
    app.globalData.isAdmin = true;
    wx.setStorageSync('_isAdmin', true);
    wx.navigateTo({ url: '/pages/admin/admin' });
  },

  resetCount() {
    this.setData({ clickCount: 0, showAdminTip: false });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '退出后需重新登录才能使用。',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('_openid');
          wx.removeStorageSync('_userInfo');
          wx.removeStorageSync('_isAdmin');
          getApp().globalData.openid = '';
          getApp().globalData.isAdmin = false;
          wx.reLaunch({ url: '/pages/login/login' });
        }
      }
    });
  },

  // 阻止弹窗内部点击冒泡
  preventBubble() {}
});
