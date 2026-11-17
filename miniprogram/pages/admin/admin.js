/**
 * 管理后台 - 按申请人姓名归类，支持 XLSX 导出
 */
const db = wx.cloud.database();
const xlsxExport = require('../../utils/xlsx-export');

Page({
  data: {
    groups: [],
    loading: false,
    activeTab: 'pending',
    keyword: '',
    // 导出
    showExport: false,
    exportStartDate: '',
    exportEndDate: '',
    exportGroupBy: true,
    // 批量
    batchMode: false,
    selectedIds: {},
    selectedCount: 0
  },

  onLoad() {
    if (!getApp().globalData.openid) { wx.redirectTo({ url: '/pages/login/login' }); return; }
    this.checkAdminPermission();
  },

  onShow() {
    if (!getApp().globalData.openid) { wx.redirectTo({ url: '/pages/login/login' }); return; }
    this.setData({ batchMode: false, selectedIds: {}, selectedCount: 0 });
    if (getApp().globalData.isAdmin) this.loadRecords();
  },

  async checkAdminPermission() {
    const app = getApp();
    if (!app.globalData.openid) { setTimeout(() => this.checkAdminPermission(), 500); return; }
    // 密码已验证通过，跳过云端校验
    if (wx.getStorageSync('_isAdmin')) {
      app.globalData.isAdmin = true;
      this.loadRecords();
      return;
    }
    const isAdmin = await app.checkIsAdmin();
    if (!isAdmin) {
      wx.showModal({
        title: '无权访问', content: '仅主理人可访问管理后台', showCancel: false,
        success: () => wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) })
      });
      return;
    }
    this.loadRecords();
  },

  switchFilterTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab }, () => this.loadRecords());
  },

  async loadRecords() {
    this.setData({ loading: true });
    try {
      let query = db.collection('records');
      const tab = this.data.activeTab;
      if (tab === 'pending') query = query.where({ status: 'pending' });
      else if (tab === 'confirmed') query = query.where({ status: 'confirmed' });
      const res = await query.orderBy('create_time', 'desc').limit(500).get();

      let data = res.data;
      const kw = this.data.keyword.trim().toLowerCase();
      if (kw) {
        data = data.filter(r =>
          (r.applicant && r.applicant.toLowerCase().includes(kw)) ||
          (r.items && r.items.some(it =>
            (it.name && it.name.toLowerCase().includes(kw)) ||
            (it.supplier && it.supplier.toLowerCase().includes(kw))
          ))
        );
      }
      this.setData({ groups: this.groupByApplicant(data), loading: false });
    } catch (err) { this.setData({ loading: false }); }
  },

  groupByApplicant(records) {
    const map = {};
    records.forEach(r => {
      const key = r.applicant || '未署名';
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    Object.values(map).forEach(arr => arr.sort((a, b) => new Date(b.create_time) - new Date(a.create_time)));
    return Object.entries(map)
      .map(([applicant, records]) => ({ applicant, records }))
      .sort((a, b) => new Date(b.records[0].create_time) - new Date(a.records[0].create_time));
  },

  async handleConfirm(e) {
    wx.showModal({
      title: '确认操作', content: '确认该申请？',
      success: async (r) => {
        if (!r.confirm) return;
        try {
          await db.collection('records').doc(e.currentTarget.dataset.id).update({
            data: { status: 'confirmed', update_time: db.serverDate() }
          });
          wx.showToast({ title: '已确认', icon: 'success' });
          this.loadRecords();
        } catch (err) { wx.showToast({ title: '操作失败', icon: 'none' }); }
      }
    });
  },

  // 删除单条记录（管理员后台）
  async handleDeleteCard(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除确认', content: '确定删除？此操作不可恢复。', confirmText: '确认删除', confirmColor: '#ee0a24',
      success: async r => {
        if (!r.confirm) return;
        try {
          await db.collection('records').doc(id).remove();
          wx.showToast({ title: '已删除', icon: 'success' });
          this.loadRecords();
        } catch (e) { wx.showToast({ title: '删除失败', icon: 'none' }); }
      }
    });
  },

  onCardTap(e) {
    const id = e.currentTarget.dataset.id;
    if (this.data.batchMode) {
      this.toggleSelect(e);
    } else {
      wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
    }
  },

  goDetail(e) { wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` }); },

  // 搜索
  onSearchInput(e) { this.setData({ keyword: e.detail.value }); },
  onSearch() { this.loadRecords(); },
  clearSearch() { this.setData({ keyword: '' }, () => this.loadRecords()); },

  // === CSV 导出 ===
  openExport() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    this.setData({
      showExport: true,
      exportStartDate: `${y}-01-01`,
      exportEndDate: `${y}-${m}-${String(now.getDate()).padStart(2, '0')}`
    });
  },

  closeExport() { this.setData({ showExport: false }); },

  onStartDateChange(e) { this.setData({ exportStartDate: e.detail.value }); },
  onEndDateChange(e) { this.setData({ exportEndDate: e.detail.value }); },
  onGroupByChange() { this.setData({ exportGroupBy: !this.data.exportGroupBy }); },

  async doExport() {
    wx.showLoading({ title: '导出中...' });
    try {
      // 加载全部数据
      const res = await db.collection('records').orderBy('create_time', 'desc').limit(500).get();

      // 按日期筛选
      let data = res.data.filter(r => {
        const d = r.apply_date || '';
        return d >= this.data.exportStartDate && d <= this.data.exportEndDate;
      });

      if (data.length === 0) {
        wx.hideLoading();
        wx.showToast({ title: '无符合条件的数据', icon: 'none' });
        return;
      }

      const groupBy = this.data.exportGroupBy;
      const label = groupBy ? '按人' : '按时间';

      // 客户端直接生成 XLSX
      const filePath = await xlsxExport.generateXLSX(data, { groupBy, label });

      wx.hideLoading();

      // 用系统应用打开 XLSX
      wx.openDocument({
        filePath: filePath,
        fileType: 'xls',
        showMenu: true,
        success: () => { wx.showToast({ title: '导出成功', icon: 'success' }); },
        fail: (err) => {
          console.error('openDocument fail:', err);
          wx.showToast({ title: '请安装 WPS/Office 打开', icon: 'none' });
        }
      });

      this.setData({ showExport: false });

    } catch (err) {
      wx.hideLoading();
      console.error('导出失败:', err);
      wx.showToast({ title: '导出失败: ' + (err.message || '未知错误'), icon: 'none' });
    }
  },

  preventBubble() {},

  // === 批量操作 ===
  toggleBatchMode() {
    this.setData({ batchMode: !this.data.batchMode, selectedIds: {}, selectedCount: 0 });
  },

  toggleSelect(e) {
    const id = e.currentTarget.dataset.id;
    const sel = { ...this.data.selectedIds };
    sel[id] ? delete sel[id] : sel[id] = true;
    this.setData({ selectedIds: sel, selectedCount: Object.keys(sel).length });
  },

  selectAll() {
    const sel = {};
    this.data.groups.forEach(g => g.records.forEach(r => sel[r._id] = true));
    this.setData({ selectedIds: sel, selectedCount: Object.keys(sel).length });
  },

  batchConfirm() {
    const ids = Object.keys(this.data.selectedIds);
    if (!ids.length) { wx.showToast({ title: '请先选择', icon: 'none' }); return; }

    const pendingIds = [];
    this.data.groups.forEach(g => g.records.forEach(r => {
      if (ids.includes(r._id) && r.status === 'pending') pendingIds.push(r._id);
    }));

    if (!pendingIds.length) { wx.showToast({ title: '所选记录无待确认项', icon: 'none' }); return; }

    wx.showModal({
      title: '批量确认', content: `确认选中的 ${pendingIds.length} 条记录？`,
      success: async r => {
        if (!r.confirm) return;
        wx.showLoading({ title: '确认中...' });
        try {
          await Promise.all(pendingIds.map(id =>
            db.collection('records').doc(id).update({ data: { status: 'confirmed', update_time: db.serverDate() } })
          ));
          wx.hideLoading();
          wx.showToast({ title: `已确认${pendingIds.length}条`, icon: 'success' });
          this.setData({ batchMode: false, selectedIds: {}, selectedCount: 0 });
          this.loadRecords();
        } catch (e) { wx.hideLoading(); wx.showToast({ title: '操作失败', icon: 'none' }); }
      }
    });
  },

  async batchExport() {
    const ids = Object.keys(this.data.selectedIds);
    if (!ids.length) { wx.showToast({ title: '请先选择', icon: 'none' }); return; }
    const all = [];
    this.data.groups.forEach(g => g.records.forEach(r => { if (ids.includes(r._id)) all.push(r); }));

    wx.showLoading({ title: '导出中...' });
    try {
      const filePath = await xlsxExport.generateXLSX(all, { groupBy: false, label: '批量导出' });

      wx.hideLoading();

      wx.openDocument({
        filePath: filePath,
        fileType: 'xls',
        showMenu: true,
        success: () => { wx.showToast({ title: '导出成功', icon: 'success' }); },
        fail: (err) => {
          console.error('openDocument fail:', err);
          wx.showToast({ title: '请安装 WPS/Office 打开', icon: 'none' });
        }
      });

      this.setData({ batchMode: false, selectedIds: {}, selectedCount: 0 });
    } catch (err) {
      wx.hideLoading();
      console.error('批量导出失败:', err);
      wx.showToast({ title: '导出失败: ' + (err.message || '未知错误'), icon: 'none' });
    }
  },

  batchDelete() {
    const ids = Object.keys(this.data.selectedIds);
    if (!ids.length) { wx.showToast({ title: '请先选择', icon: 'none' }); return; }
    wx.showModal({
      title: '批量删除', content: `删除选中 ${ids.length} 条记录？`, confirmText: '确认删除', confirmColor: '#ee0a24',
      success: r => {
        if (!r.confirm) return;
        wx.showModal({
          title: '再次确认', content: `即将删除 ${ids.length} 条，确定？`, confirmText: '确认删除', confirmColor: '#ee0a24',
          success: async r2 => {
            if (!r2.confirm) return;
            wx.showLoading({ title: '删除中...' });
            try {
              await Promise.all(ids.map(id => db.collection('records').doc(id).remove()));
              wx.hideLoading(); wx.showToast({ title: `已删除${ids.length}条`, icon: 'success' });
              this.setData({ batchMode: false, selectedIds: {}, selectedCount: 0 });
              this.loadRecords();
            } catch (e) { wx.hideLoading(); wx.showToast({ title: '删除失败', icon: 'none' }); }
          }
        });
      }
    });
  }
});
