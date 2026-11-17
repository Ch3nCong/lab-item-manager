/**
 * 提交申领页 - 支持新建和编辑（P1）
 */
const db = wx.cloud.database();

Page({
  data: {
    editId: '',
    isEdit: false,
    applyDate: '',
    applicant: '',
    items: [{ name: '', count: 1, price: '', supplier: '' }],
    memo: '',
    submitting: false
  },

  onLoad(options) {
    if (options.editId) {
      this.setData({ isEdit: true, editId: options.editId });
      this.loadEditData(options.editId);
    }
  },

  async loadEditData(editId) {
    try {
      const res = await db.collection('records').doc(editId).get();
      const r = res.data;
      this.setData({
        applyDate: r.apply_date || '',
        applicant: r.applicant || '',
        memo: r.admin_memo || '',
        items: (r.items && r.items.length > 0) ? r.items : [{ name: '', count: 1, price: '', supplier: '' }]
      });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onShow() {
    if (!getApp().globalData.openid) { wx.redirectTo({ url: '/pages/login/login' }); }
    if (typeof this.getTabBar === 'function') { this.getTabBar().setData({ selected: 1 }); }
    // 自动填写申请人（优先历史填写记录）
    if (!this.data.isEdit && !this.data.applicant) {
      const saved = wx.getStorageSync('_applicant') || '';
      if (saved) {
        this.setData({ applicant: saved });
      } else {
        const userInfo = wx.getStorageSync('_userInfo') || {};
        const nick = userInfo.nickName || '';
        if (nick && nick !== '微信用户') this.setData({ applicant: nick });
      }
    }
  },

  onDateChange(e) { this.setData({ applyDate: e.detail.value }); },
  onApplicantInput(e) { this.setData({ applicant: e.detail }); },
  onSupplierInput(e) { this.setData({ [`items[${e.currentTarget.dataset.index}].supplier`]: e.detail }); },

  addItem() {
    if (this.data.items.length >= 10) { wx.showToast({ title: '最多10项', icon: 'none' }); return; }
    this.data.items.push({ name: '', count: 1, price: '', supplier: '' });
    this.setData({ items: this.data.items });
  },

  removeItem(e) {
    if (this.data.items.length <= 1) { wx.showToast({ title: '至少一项', icon: 'none' }); return; }
    this.data.items.splice(e.currentTarget.dataset.index, 1);
    this.setData({ items: this.data.items });
  },

  onNameInput(e) { this.setData({ [`items[${e.currentTarget.dataset.index}].name`]: e.detail }); },
  onCountChange(e) {
    // 仅允许正整数，允许临时为空（提交时校验）
    const val = String(e.detail).replace(/\D/g, '');
    this.setData({ [`items[${e.currentTarget.dataset.index}].count`]: val });
  },
  onPriceInput(e) {
    // 仅允许数字和一个小数点
    let val = String(e.detail).replace(/[^\d.]/g, '');
    const dotIdx = val.indexOf('.');
    if (dotIdx >= 0) val = val.slice(0, dotIdx + 1) + val.slice(dotIdx + 1).replace(/\./g, '');
    this.setData({ [`items[${e.currentTarget.dataset.index}].price`]: val });
  },
  onMemoInput(e) { this.setData({ memo: e.detail }); },

  validate() {
    if (!this.data.applyDate) { wx.showToast({ title: '请选择日期', icon: 'none' }); return false; }
    if (!this.data.applicant.trim()) { wx.showToast({ title: '请填写申请人', icon: 'none' }); return false; }
    for (let i = 0; i < this.data.items.length; i++) {
      const it = this.data.items[i];
      if (!it.name || !it.name.trim()) { wx.showToast({ title: `请填写第${i+1}项名称`, icon: 'none' }); return false; }
      if (!it.count || it.count < 1) { wx.showToast({ title: `第${i+1}项数量至少1`, icon: 'none' }); return false; }
      if (!it.price || parseFloat(it.price) <= 0) { wx.showToast({ title: `请填写第${i+1}项单价`, icon: 'none' }); return false; }
    }
    return true;
  },

  async onSubmit() {
    if (!this.validate()) return;
    const app = getApp();
    if (!app.globalData.openid) { wx.showToast({ title: '请稍后重试', icon: 'none' }); return; }

    this.setData({ submitting: true });
    const processed = this.data.items.map(it => ({
      name: it.name.trim(), count: parseInt(it.count),
      price: parseFloat(parseFloat(it.price).toFixed(2)),
      supplier: (it.supplier || '').trim()
    }));

    try {
      const data = {
        apply_date: this.data.applyDate,
        applicant: this.data.applicant.trim(),
        items: processed,
        admin_memo: this.data.memo.trim() || '',
      };

      if (this.data.isEdit) {
        // 编辑模式：更新已有记录，状态改回 pending
        await db.collection('records').doc(this.data.editId).update({
          data: { ...data, status: 'pending', reject_reason: '' }
        });
        wx.showToast({ title: '已更新', icon: 'success' });
        wx.setStorageSync('_applicant', this.data.applicant.trim());
      } else {
        // 新建模式
        await db.collection('records').add({
          data: {
            ...data,
            type: 'apply',
            creator_openid: app.globalData.openid,
            receiver_info: '',
            voucher_file_id: '',
            status: 'pending',
            voided: false,
            create_time: db.serverDate()
          }
        });
        wx.showToast({ title: '提交成功', icon: 'success' });
        wx.setStorageSync('_applicant', this.data.applicant.trim());
      }

      this.resetForm();
      setTimeout(() => wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) }), 1200);

    } catch (err) {
      console.error('提交失败:', err);
      wx.showToast({ title: '提交失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  resetForm() {
    this.setData({
      editId: '', isEdit: false,
      applyDate: '', applicant: '',
      items: [{ name: '', count: 1, price: '', supplier: '' }], memo: ''
    });
  }
});
