/**
 * exportRecords - 导出申领记录为 XLSX 文件
 *
 * 流程：
 * 1. 接收客户端传来的记录数据
 * 2. 用 node-xlsx 生成 Excel 文件（支持按申请人分组多 sheet）
 * 3. 上传到云存储
 * 4. 返回 fileID 供客户端下载
 *
 * 参数：
 *   records: 待导出的记录数组
 *   groupBy: 是否按申请人分组（每 sheet 一个申请人）
 *   label:   文件名后缀（如 '批量导出'、'按时间'）
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 管理员 OpenID 列表
const ADMIN_OPENIDS = [
  'YOUR_OPENID_HERE'
];

// 状态中文映射
const STATUS_TEXT = {
  pending: '已申请',
  confirmed: '已确认',
  uploaded: '已上传',
  finished: '已完成'
};

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();

  if (!ADMIN_OPENIDS.includes(OPENID)) {
    return { success: false, message: '权限不足，仅主理人可导出记录' };
  }

  const { records, groupBy, label } = event;
  if (!records || !Array.isArray(records) || records.length === 0) {
    return { success: false, message: '无数据可导出' };
  }

  try {
    const xlsx = require('node-xlsx');
    const headerRow = [
      '申请日期', '申请人', '物品名称', '供货商',
      '单价(元)', '数量', '金额(元)', '状态', '备注'
    ];

    let sheets = [];

    if (groupBy) {
      // 按申请人分组，每人一个 sheet
      const grouped = groupByApplicant(records);
      grouped.forEach(group => {
        const rows = [headerRow];
        group.records.forEach(r => {
          pushRecordRows(rows, r);
        });
        sheets.push({ name: group.applicant.slice(0, 31) || '未署名', data: rows });
      });
    } else {
      // 单 sheet
      const rows = [headerRow];
      records.forEach(r => pushRecordRows(rows, r));
      sheets.push({ name: '申领记录', data: rows });
    }

    const buffer = xlsx.build(sheets);

    // 上传到云存储
    const timestamp = Date.now();
    const prefix = label || '导出';
    const cloudPath = `exports/${prefix}_${timestamp}.xlsx`;

    const uploadRes = await cloud.uploadFile({
      cloudPath: cloudPath,
      fileContent: buffer
    });

    return {
      success: true,
      fileID: uploadRes.fileID,
      cloudPath: cloudPath,
      totalRecords: records.length,
      message: '导出成功'
    };

  } catch (err) {
    console.error('exportRecords 错误:', err);
    return {
      success: false,
      message: '导出失败: ' + (err.message || '未知错误')
    };
  }
};

// 将一条记录的行推入 rows 数组
function pushRecordRows(rows, record) {
  const items = record.items || [];
  const applicant = record.applicant || '';
  const applyDate = record.apply_date || '';
  const status = STATUS_TEXT[record.status] || record.status || '';
  const memo = record.admin_memo || '';

  if (items.length === 0) {
    rows.push([applyDate, applicant, '', '', '', '', '', status, memo]);
  } else {
    items.forEach((item, idx) => {
      rows.push([
        idx === 0 ? applyDate : '',
        idx === 0 ? applicant : '',
        item.name || '',
        item.supplier || '',
        item.price != null ? item.price : '',
        item.count != null ? item.count : '',
        ((parseFloat(item.price) || 0) * (parseInt(item.count) || 0)).toFixed(2),
        idx === 0 ? status : '',
        idx === 0 ? memo : ''
      ]);
    });
  }
}

// 按申请人分组
function groupByApplicant(records) {
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
}
