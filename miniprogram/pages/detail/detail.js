/**
 * 详情页
 */
const db = wx.cloud.database();

Page({
  data: {
    recordId: '',
    record: {},
    items: [],
    isAdmin: false,
    showConfirmBtn: false,
    showEditBtn: false,
    showVoidBtn: false,
    showDeleteBtn: false,
    editing: false
  },

  onLoad(options) {
    this.setData({ recordId: options.id });
    this.loadDetail();
  },

  async loadDetail() {
    try {
      const res = await db.collection('records').doc(this.data.recordId).get();
      const record = res.data;
      const app = getApp();
      const isAdmin = app.globalData.isAdmin;
      const isOwner = record.creator_openid === app.globalData.openid;
      const s = record.status;

      this.setData({
        record, items: record.items || [],
        isAdmin,
        showConfirmBtn: isAdmin && s === 'pending' && !record.voided && !isOwner,
        showEditBtn: isOwner && s === 'pending' && !record.voided,
        showVoidBtn: isOwner && s === 'pending',
        showDeleteBtn: isAdmin && (record.voided || !isOwner)
      });
    } catch (err) { console.error('加载失败:', err); }
  },

  // 主理人确认
  async handleConfirm() {
    wx.showModal({
      title: '确认操作', content: '确认该申请？',
      success: async (r) => {
        if (!r.confirm) return;
        try {
          await db.collection('records').doc(this.data.recordId).update({
            data: { status: 'confirmed', update_time: db.serverDate() }
          });
          wx.showToast({ title: '已确认', icon: 'success' });
          this.loadDetail();
        } catch (e) { wx.showToast({ title: '操作失败', icon: 'none' }); }
      }
    });
  },

  // 进入编辑模式
  handleEdit() {
    this.setData({ editing: true });
  },

  // 编辑字段输入
  onItemEdit(e) {
    const { index, field } = e.currentTarget.dataset;
    const val = e.detail.value;
    this.setData({ [`items[${index}].${field}`]: val });
  },

  // 取消编辑
  cancelEdit() {
    // 重新加载恢复原始数据
    this.setData({ editing: false });
    this.loadDetail();
  },

  // 保存编辑
  async saveEdit() {
    const items = this.data.items;
    // 校验
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.name || !it.name.trim()) { wx.showToast({ title: `第${i+1}项名称必填`, icon: 'none' }); return; }
      if (!it.count || parseInt(it.count) < 1) { wx.showToast({ title: `第${i+1}项数量至少1`, icon: 'none' }); return; }
      if (!it.price || parseFloat(it.price) <= 0) { wx.showToast({ title: `第${i+1}项单价必填`, icon: 'none' }); return; }
    }
    wx.showLoading({ title: '保存中...' });
    try {
      const processed = items.map(it => ({
        name: it.name.trim(),
        count: parseInt(it.count),
        price: parseFloat(parseFloat(it.price).toFixed(2)),
        supplier: (it.supplier || '').trim()
      }));
      await db.collection('records').doc(this.data.recordId).update({
        data: { items: processed, status: 'pending', update_time: db.serverDate() }
      });
      wx.hideLoading();
      wx.showToast({ title: '已更新', icon: 'success' });
      this.setData({ editing: false });
      this.loadDetail();
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  // 作废（申请人）
  handleVoid() {
    wx.showModal({
      title: '作废确认', content: '作废后该记录不再显示在你的列表中，管理员仍可查看。',
      confirmText: '确认作废', confirmColor: '#ee0a24',
      success: async (r) => {
        if (!r.confirm) return;
        try {
          await db.collection('records').doc(this.data.recordId).update({
            data: { voided: true, update_time: db.serverDate() }
          });
          wx.showToast({ title: '已作废', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 1000);
        } catch (e) { wx.showToast({ title: '操作失败', icon: 'none' }); }
      }
    });
  },

  // 删除（管理员）
  handleDelete() {
    wx.showModal({
      title: '删除确认', content: '确定删除？此操作不可恢复。', confirmText: '确认删除', confirmColor: '#ee0a24',
      success: async (r) => {
        if (!r.confirm) return;
        wx.showModal({
          title: '再次确认', content: '确定？', confirmText: '确认删除', confirmColor: '#ee0a24',
          success: async (r2) => {
            if (!r2.confirm) return;
            try {
              await db.collection('records').doc(this.data.recordId).remove();
              wx.showToast({ title: '已删除', icon: 'success' });
              setTimeout(() => wx.navigateBack(), 1000);
            } catch (e) { wx.showToast({ title: '删除失败', icon: 'none' }); }
          }
        });
      }
    });
  }
});
