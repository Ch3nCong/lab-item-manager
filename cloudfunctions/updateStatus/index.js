/**
 * updateStatus - 确认申请
 * 权限：仅主理人可执行
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const ADMIN_OPENIDS = ['YOUR_OPENID_HERE'];

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const { recordId, action } = event;

  if (!ADMIN_OPENIDS.includes(OPENID)) {
    return { success: false, message: '权限不足' };
  }
  if (!recordId || action !== 'confirm') {
    return { success: false, message: '参数错误' };
  }

  try {
    await db.collection('records').doc(recordId).update({
      data: { status: 'confirmed', update_time: db.serverDate() }
    });
    return { success: true, message: '已确认' };
  } catch (err) {
    return { success: false, message: err.message };
  }
};
