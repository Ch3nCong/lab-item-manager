/**
 * checkAdmin - 校验管理员（主理人）身份
 *
 * 功能：
 * - action: 'check' → 校验当前用户是否为管理员
 * - action: 'getOpenId' → 返回当前用户的 OpenID
 *
 * 管理员通过硬编码 OpenID 列表识别
 * 部署时请替换 ADMIN_OPENIDS 为实际值
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 管理员 OpenID 列表（硬编码，部署时替换）
const ADMIN_OPENIDS = [
  'YOUR_OPENID_HERE'
];

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { action } = event;

  switch (action) {

    // 校验是否为管理员
    case 'check': {
      const isAdmin = ADMIN_OPENIDS.includes(OPENID);
      return {
        success: true,
        isAdmin,
        openid: OPENID
      };
    }

    // 获取 OpenID
    case 'getOpenId':
    default: {
      return {
        success: true,
        openid: OPENID
      };
    }
  }
};
