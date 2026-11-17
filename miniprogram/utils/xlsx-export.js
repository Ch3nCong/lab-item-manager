/**
 * xlsx-export.js — 生成 HTML 表格文件(.xls)，Excel/WPS 可直接打开
 * 不依赖任何第三方库，纯字符串拼接
 */
var STATUS_TEXT = {
  pending: '已申请', confirmed: '已确认', uploaded: '已上传', finished: '已完成'
};

var HEADERS = [
  '申请日期', '申请人', '物品名称', '供货商',
  '单价(元)', '数量', '金额(元)', '状态', '备注'
];

/**
 * 转义 HTML 特殊字符
 */
function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * 构建 HTML 表格字符串
 */
function buildTable(records) {
  var html = '<table border="1" cellpadding="4" cellspacing="0">\n';
  // 表头
  html += '<tr>';
  HEADERS.forEach(function (h) {
    html += '<th>' + esc(h) + '</th>';
  });
  html += '</tr>\n';
  // 数据行
  records.forEach(function (r) {
    html += buildRecordRows(r);
  });
  html += '</table>\n';
  return html;
}

function buildRecordRows(record) {
  var items = record.items || [];
  var applicant = record.applicant || '';
  var applyDate = record.apply_date || '';
  var status = STATUS_TEXT[record.status] || record.status || '';
  var memo = record.admin_memo || '';
  var html = '';

  if (items.length === 0) {
    html += '<tr><td>' + esc(applyDate) + '</td><td>' + esc(applicant) + '</td><td></td><td></td><td></td><td></td><td></td><td>' + esc(status) + '</td><td>' + esc(memo) + '</td></tr>\n';
  } else {
    items.forEach(function (item, idx) {
      var price = item.price != null ? Number(item.price) : 0;
      var count = item.count != null ? Number(item.count) : 0;
      html += '<tr>' +
        '<td>' + (idx === 0 ? esc(applyDate) : '') + '</td>' +
        '<td>' + (idx === 0 ? esc(applicant) : '') + '</td>' +
        '<td>' + esc(item.name || '') + '</td>' +
        '<td>' + esc(item.supplier || '') + '</td>' +
        '<td>' + price + '</td>' +
        '<td>' + count + '</td>' +
        '<td>' + (price * count).toFixed(2) + '</td>' +
        '<td>' + (idx === 0 ? esc(status) : '') + '</td>' +
        '<td>' + (idx === 0 ? esc(memo) : '') + '</td>' +
        '</tr>\n';
    });
  }
  return html;
}

/**
 * 生成完整的 HTML 文档
 */
function buildHTML(records, groupBy) {
  var html = '<!DOCTYPE html>\n<html>\n<head>\n';
  html += '<meta charset="UTF-8">\n';
  html += '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">\n';
  html += '<title>申领记录</title>\n';
  html += '<style>table{border-collapse:collapse}th{background:#4a90d9;color:#fff;font-weight:bold}td,th{padding:6px 10px}</style>\n';
  html += '</head>\n<body>\n';

  if (groupBy) {
    var grouped = groupByApplicant(records);
    grouped.forEach(function (group) {
      html += '<h3>' + esc(group.applicant || '未署名') + '</h3>\n';
      html += buildTable(group.records);
      html += '<br>\n';
    });
  } else {
    html += buildTable(records);
  }

  html += '</body>\n</html>';
  return html;
}

function groupByApplicant(records) {
  var map = {};
  records.forEach(function (r) {
    var key = r.applicant || '未署名';
    if (!map[key]) map[key] = [];
    map[key].push(r);
  });
  Object.values(map).forEach(function (arr) {
    arr.sort(function (a, b) { return new Date(b.create_time) - new Date(a.create_time); });
  });
  return Object.entries(map)
    .map(function (e) { return { applicant: e[0], records: e[1] }; })
    .sort(function (a, b) { return new Date(b.records[0].create_time) - new Date(a.records[0].create_time); });
}

/**
 * 生成 .xls 文件并返回临时路径
 * @param {Array} records  待导出记录
 * @param {Object} options  { groupBy, label }
 * @returns {Promise<string>} 临时文件路径
 */
function generateXLSX(records, options) {
  return new Promise(function (resolve, reject) {
    try {
      options = options || {};
      var groupBy = options.groupBy || false;
      var label = options.label || '导出';

      var html = buildHTML(records, groupBy);

      // 写入临时文件（.xls 扩展名，Excel 会自动解析 HTML 表格）
      var ts = Date.now();
      var fileName = label + '_' + ts + '.xls';
      var filePath = wx.env.USER_DATA_PATH + '/' + fileName;

      var fs = wx.getFileSystemManager();
      fs.writeFile({
        filePath: filePath,
        data: html,
        encoding: 'utf-8',
        success: function () {
          resolve(filePath);
        },
        fail: function (err) {
          reject(new Error('写入文件失败: ' + (err.errMsg || err.message)));
        }
      });
    } catch (e) {
      reject(new Error('生成异常: ' + (e.message || String(e))));
    }
  });
}

module.exports = { generateXLSX: generateXLSX };
