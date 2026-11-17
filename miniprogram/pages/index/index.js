/**
 * 首页 - 按日期分组展示申领记录
 * 主理人：查看所有记录
 * 申请人：仅查看自己的记录
 */
const exportUtil = require('../../utils/export');

Page({
  data: {
    groupedRecords: [],
    loading: true,
    isAdmin: false,
    statusFilter: 'all',
    showFilter: false,
    myOnly: false,  // 主理人只看自己的记录
    keyword: '',
    // 导出
    showExport: false,
    exportStartDate: '',
    exportEndDate: '',
    // 批量操作
    batchMode: false,
    selectedIds: {}       // { recordId: true }
  },

  // 计算选中数量
  updateSelectCount() {
    this.setData({ selectedCount: Object.keys(this.data.selectedIds).length });
  },

  onLoad() {
    const app = getApp();
    this.setData({ isAdmin: app.globalData.isAdmin });
    if (app.globalData.openid) {
      this.loadRecords();
    }
  },

  onShow() {
    if (!getApp().globalData.openid) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }
    // 退出批量模式
    this.setData({ batchMode: false, selectedIds: {}, selectedCount: 0 });
    // 同步 TabBar
    if (typeof this.getTabBar === 'function') {
      this.getTabBar().setData({ selected: 0 });
    }
    this.setData({ isAdmin: getApp().globalData.isAdmin });
    this.loadRecords();
  },

  // 加载申领记录
  async loadRecords() {
    this.setData({ loading: true });
    try {
      const db = wx.cloud.database();
      const _ = db.command;
      const app = getApp();

      let query = {};
      if (!app.globalData.isAdmin || this.data.myOnly) {
        query.creator_openid = app.globalData.openid;
        // _.neq(true) 匹配 voided !== true（包括字段不存在的情况）
        query.voided = _.neq(true);
      }
      // 状态筛选
      if (this.data.statusFilter !== 'all') {
        query.status = this.data.statusFilter;
      }

      const res = await db.collection('records')
        .where(query)
        .orderBy('create_time', 'desc')
        .limit(200)
        .get();

      // P2: 客户端关键词过滤
      let data = res.data;
      const kw = this.data.keyword.trim().toLowerCase();
      if (kw) {
        data = data.filter(r => {
          return (r.applicant && r.applicant.toLowerCase().includes(kw)) ||
                 (r.items && r.items.some(it => 
                   (it.name && it.name.toLowerCase().includes(kw)) ||
                   (it.supplier && it.supplier.toLowerCase().includes(kw))
                 ));
        });
      }

      const grouped = this.groupByDate(data);
      this.setData({ groupedRecords: grouped, loading: false });
    } catch (err) {
      console.error('加载记录失败:', err);
      this.setData({ loading: false });
    }
  },

  // 按日期分组
  groupByDate(records) {
    const groups = {};
    records.forEach(record => {
      const date = this.formatDate(record.create_time);
      if (!groups[date]) {
        groups[date] = { date, records: [] };
      }
      groups[date].records.push(record);
    });
    // 转换为数组并按日期倒序
    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  },

  // 格式化日期 YYYY-MM-DD
  formatDate(time) {
    const d = new Date(time);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  // 切换状态筛选
  onFilterChange(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ statusFilter: filter, showFilter: false });
    this.loadRecords();
  },

  // 显示/隐藏筛选
  toggleFilter() {
    this.setData({ showFilter: !this.data.showFilter });
  },

  toggleMyOnly() {
    this.setData({ myOnly: !this.data.myOnly }, () => this.loadRecords());
  },

  // P2: 搜索输入
  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  // P2: 搜索
  onSearch() {
    this.loadRecords();
  },

  // P2: 清除搜索
  clearSearch() {
    this.setData({ keyword: '' }, () => this.loadRecords());
  },

  onCardTap(e) {
    const id = e.currentTarget.dataset.id;
    if (this.data.batchMode) {
      this.toggleSelect(e);
    } else {
      wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
    }
  },

  // 查看详情
  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadRecords().then(() => wx.stopPullDownRefresh());
  },

  // === 批量操作 ===
  toggleBatchMode() {
    this.setData({ batchMode: !this.data.batchMode, selectedIds: {}, selectedCount: 0 });
  },

  toggleSelect(e) {
    const id = e.currentTarget.dataset.id;
    const selected = { ...this.data.selectedIds };
    if (selected[id]) {
      delete selected[id];
    } else {
      selected[id] = true;
    }
    this.setData({ selectedIds: selected });
    this.updateSelectCount();
  },

  getSelectedCount() {
    return Object.keys(this.data.selectedIds).length;
  },

  selectAll() {
    const sel = {};
    this.data.groupedRecords.forEach(g => g.records.forEach(r => sel[r._id] = true));
    this.setData({ selectedIds: sel, selectedCount: Object.keys(sel).length });
  },

  // 批量导出选中记录
  batchExport() {
    const ids = Object.keys(this.data.selectedIds);
    if (ids.length === 0) { wx.showToast({ title: '请先选择记录', icon: 'none' }); return; }
    const allRecords = [];
    this.data.groupedRecords.forEach(g => {
      g.records.forEach(r => { if (ids.includes(r._id)) allRecords.push(r); });
    });
    const csv = exportUtil.generateCSV(allRecords);
    const ts = new Date().toISOString().slice(0, 10);
    exportUtil.saveAndOpen(csv, `批量导出_${ts}.csv`);
    this.setData({ batchMode: false, selectedIds: {}, selectedCount: 0 });
  },

  // 批量作废/删除
  batchDelete() {
    const ids = Object.keys(this.data.selectedIds);
    if (ids.length === 0) { wx.showToast({ title: '请先选择记录', icon: 'none' }); return; }
    const isRealAdmin = getApp().globalData.isAdmin && !this.data.myOnly;
    wx.showModal({
      title: isRealAdmin ? '批量删除' : '批量作废',
      content: isRealAdmin ? `确定删除选中的 ${ids.length} 条记录？此操作不可恢复。`
        : `确定作废选中的 ${ids.length} 条记录？作废后不再显示，管理员仍可查看。`,
      confirmText: isRealAdmin ? '确认删除' : '确认作废',
      confirmColor: '#ee0a24',
      success: async (r) => {
        if (!r.confirm) return;
        wx.showModal({
          title: '再次确认',
          content: `即将${isRealAdmin ? '删除' : '作废'} ${ids.length} 条记录，确定？`,
          confirmText: isRealAdmin ? '确认删除' : '确认作废',
          confirmColor: '#ee0a24',
          success: async (r2) => {
            if (!r2.confirm) return;
            wx.showLoading({ title: isRealAdmin ? '删除中...' : '作废中...' });
            try {
              const db = wx.cloud.database();
              // 真实管理员：本人记录走作废，他人走删除
              // 申请人/myOnly模式：全部作废
              const openid = getApp().globalData.openid;
              const myIds = [], otherIds = [];
              const allRecords = [];
              this.data.groupedRecords.forEach(g => g.records.forEach(r => { if (ids.includes(r._id)) allRecords.push(r); }));
              allRecords.forEach(r => {
                if (r.creator_openid === openid) myIds.push(r._id); else otherIds.push(r._id);
              });
              const ops = [];
              myIds.forEach(id => ops.push(db.collection('records').doc(id).update({ data: { voided: true } })));
              if (isRealAdmin) otherIds.forEach(id => ops.push(db.collection('records').doc(id).remove()));
              else otherIds.forEach(id => ops.push(db.collection('records').doc(id).update({ data: { voided: true } })));
              await Promise.all(ops);
              wx.hideLoading();
              wx.showToast({ title: isRealAdmin ? `已删除${ids.length}条` : `已作废${ids.length}条`, icon: 'success' });
              this.setData({ batchMode: false, selectedIds: {}, selectedCount: 0 });
              this.loadRecords();
            } catch (err) {
              wx.hideLoading();
              wx.showToast({ title: '删除失败', icon: 'none' });
            }
          }
        });
      }
    });
  },
  openExport() {
    const now = new Date();
    this.setData({
      showExport: true,
      exportStartDate: `${now.getFullYear()}-01-01`,
      exportEndDate: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
    });
  },
  closeExport() { this.setData({ showExport: false }); },
  onStartDateChange(e) { this.setData({ exportStartDate: e.detail.value }); },
  onEndDateChange(e) { this.setData({ exportEndDate: e.detail.value }); },
  preventBubble() {},

  async doExport() {
    wx.showLoading({ title: '导出中...' });
    try {
      const app = getApp();
      const db = wx.cloud.database();
      let query = {};
      if (!app.globalData.isAdmin) {
        query.creator_openid = app.globalData.openid;
        query.voided = _.neq(true);
      }
      const res = await db.collection('records').where(query).orderBy('create_time','desc').limit(500).get();

      let data = res.data.filter(r => {
        const d = r.apply_date || '';
        return d >= this.data.exportStartDate && d <= this.data.exportEndDate;
      });
      if (data.length === 0) { wx.hideLoading(); wx.showToast({ title: '无符合条件的数据', icon: 'none' }); return; }

      data.sort((a,b) => new Date(b.create_time) - new Date(a.create_time));
      const csv = exportUtil.generateCSV(data);
      wx.hideLoading();
      exportUtil.saveAndOpen(csv, `我的申请_${new Date().toISOString().slice(0,10)}.csv`);
      this.setData({ showExport: false });
    } catch (err) { wx.hideLoading(); wx.showToast({ title: '导出失败', icon: 'none' }); }
  }
});
