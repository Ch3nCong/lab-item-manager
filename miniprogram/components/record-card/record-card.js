/**
 * record-card 组件 - 通用的申领记录卡片
 * 用于首页列表和管理后台列表复用
 */
const constants = require('../../utils/constants');

Component({
  properties: {
    record: {
      type: Object,
      value: {}
    },
    // 是否显示操作按钮
    showActions: {
      type: Boolean,
      value: false
    },
    // 操作按钮类型
    actionType: {
      type: String,
      value: '' // 'confirm' | 'detail'
    }
  },

  data: {
    statusText: constants.STATUS_TEXT,
    statusColor: constants.STATUS_COLOR
  },

  methods: {
    // 点击卡片
    onTap() {
      this.triggerEvent('tap', { record: this.properties.record });
    },

    // 确认按钮
    onConfirm() {
      this.triggerEvent('confirm', { record: this.properties.record });
    }
  }
});
