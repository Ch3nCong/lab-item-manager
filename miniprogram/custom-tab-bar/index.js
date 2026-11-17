/**
 * 自定义 TabBar — 统一菜单
 */
Component({
  data: {
    selected: 0,
    list: [
      { pagePath: 'pages/index/index', text: '记录', iconPath: '/images/tab-record.png', selectedIconPath: '/images/tab-record-active.png' },
      { pagePath: 'pages/apply/apply', text: '提交申领', iconPath: '/images/tab-apply.png', selectedIconPath: '/images/tab-apply-active.png' },
      { pagePath: 'pages/about/about', text: '关于', iconPath: '/images/tab-about.png', selectedIconPath: '/images/tab-about-active.png' }
    ]
  },

  pageLifetimes: {
    show() {
      const pages = getCurrentPages();
      if (pages.length > 0) {
        const route = pages[pages.length - 1].route;
        const idx = this.data.list.findIndex(item => item.pagePath === route);
        if (idx >= 0) this.setData({ selected: idx });
      }
    }
  },

  methods: {
    switchTab(e) {
      const { index, path } = e.currentTarget.dataset;
      this.setData({ selected: index });
      wx.switchTab({ url: '/' + path });
    }
  }
});
