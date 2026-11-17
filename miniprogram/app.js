/**
 * 个人实验室物品管理工具
 * 注意：本小程序为个人主体，严禁使用任何敏感词汇
 * 敏感词替换：课题组→实验室伙伴、报销→预算额度、发票→凭证、审批→确认
 */

App({
  onLaunch() {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }

    wx.cloud.init({
      env: 'YOUR_CLOUD_ENV_ID',
      traceUser: true
    });

    this.loadOpenId();
  },

  // 缓存用户 OpenID
  // 注意：isAdmin 不在此处恢复，仅通过 about.js 密码验证后设置
  loadOpenId() {
    const cached = wx.getStorageSync('_openid');
    if (cached) {
      this.globalData.openid = cached;
      // isAdmin 始终默认 false，仅密码验证后设为 true
      this.globalData.isAdmin = false;
      wx.removeStorageSync('_isAdmin');
      return;
    }

    wx.cloud.callFunction({
      name: 'checkAdmin',
      data: { action: 'getOpenId' }
    }).then(res => {
      const openid = res.result.openid;
      this.globalData.openid = openid;
      wx.setStorageSync('_openid', openid);
    }).catch(err => {
      console.error('获取 OpenID 失败:', err);
    });
  },

  // 检查当前用户是否为主理人（管理员）
  checkIsAdmin() {
    return wx.cloud.callFunction({
      name: 'checkAdmin',
      data: { action: 'check' }
    }).then(res => {
      this.globalData.isAdmin = res.result.isAdmin;
      wx.setStorageSync('_isAdmin', res.result.isAdmin);
      return res.result.isAdmin;
    }).catch(() => {
      this.globalData.isAdmin = false;
      wx.setStorageSync('_isAdmin', false);
      return false;
    });
  },

  globalData: {
    openid: '',
    isAdmin: false,
    // 管理员OpenID列表（部署时替换为实际值）
    adminOpenIds: []
  }
});
