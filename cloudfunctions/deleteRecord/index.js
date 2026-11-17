/**
 * deleteRecord - 删除记录
 * 管理员：硬删除
 * 申请人：软删除（deleted=true），仅限 pending 状态
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const ADMIN_OPENIDS = ['YOUR_OPENID_HERE'];

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const { recordId } = event;
  const isAdmin = ADMIN_OPENIDS.includes(OPENID);

  if (!recordId) return { success: false, message: '缺少记录ID' };

  try {
    const doc = await db.collection('records').doc(recordId).get();
    if (!doc.data) return { success: false, message: '记录不存在' };

    if (isAdmin) {
      // 管理员：硬删除
      await db.collection('records').doc(recordId).remove();
      return { success: true, message: '已删除' };
    }

    if (doc.data.creator_openid !== OPENID) {
      return { success: false, message: '无权删除他人记录' };
    }

    // 申请人：软删除
    await db.collection('records').doc(recordId).update({
      data: { deleted: true, update_time: db.serverDate() }
    });
    return { success: true, message: '已删除' };

  } catch (err) {
    return { success: false, message: err.message };
  }
};
