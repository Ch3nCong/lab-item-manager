/**
 * 常量定义 - 严格遵循敏感词替换规则
 *
 * 术语规范（来自敏感词替换表）：
 * - 课题组/成员 → 实验室伙伴/协作者
 * - 试剂耗材   → 实验用品/物料
 * - 报销/经费  → 预算额度/可用额度
 * - 发票       → 凭证/单据照片
 * - 发票抬头   → 接收方信息
 * - 审批       → 确认/处理
 * - 结束流程   → 归档/完成
 */

// 记录状态（已申请 → 已确认）
const STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed'
};

// 状态展示文案
const STATUS_TEXT = {
  pending: '已申请',
  confirmed: '已确认'
};

// 状态颜色
const STATUS_COLOR = {
  pending: 'warning',
  confirmed: 'primary'
};

// 记录类型
const RECORD_TYPE = {
  APPLY: 'apply',       // 申领
  CONFIRM: 'confirm',   // 确认
  UPLOAD: 'upload'      // 上传
};

// 管理员入口触发次数（关于页点击Logo）
const ADMIN_ENTRY_CLICK_COUNT = 5;

// 管理后台密码（部署时修改）
const ADMIN_PASSWORD = 'YOUR_ADMIN_PASSWORD';

// 预设接收方信息（硬编码，管理员确认时自动填入）
// 部署时替换为实际信息
const DEFAULT_RECEIVER_INFO = '请填写接收方信息（如：XX实验室 上海市XX路XX号）';

module.exports = {
  STATUS,
  STATUS_TEXT,
  STATUS_COLOR,
  RECORD_TYPE,
  ADMIN_ENTRY_CLICK_COUNT,
  ADMIN_PASSWORD,
  DEFAULT_RECEIVER_INFO
};
