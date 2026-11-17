/**
 * CSV 导出工具
 * 支持按时间范围、按人分组导出
 */

// 生成 CSV 字符串
function generateCSV(records, groupBy) {
  const BOM = '\uFEFF'; // UTF-8 BOM，确保 Excel 正确识别中文
  const headers = ['申请人', '日期', '物品名称', '供货商', '单价', '数量', '总价', '状态', '备注'];
  let csv = BOM + headers.join(',') + '\n';

  records.forEach(r => {
    const status = r.status === 'pending' ? '已申请' : '已确认';
    const applicant = escapeCSV(r.applicant || '');
    const date = r.apply_date || '';
    const memo = escapeCSV(r.admin_memo || '');

    if (r.items && r.items.length > 0) {
      r.items.forEach(it => {
        const total = (parseFloat(it.price) || 0) * (parseInt(it.count) || 0);
        csv += [
          applicant, date,
          escapeCSV(it.name || ''),
          escapeCSV(it.supplier || ''),
          it.price || '0', it.count || '1',
          total.toFixed(2), status, memo
        ].join(',') + '\n';
      });
    } else {
      csv += [applicant, date, '', '', '0', '0', '0', status, memo].join(',') + '\n';
    }
  });

  return csv;
}

// CSV 字段转义
function escapeCSV(str) {
  if (!str) return '';
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// 按申请人分组生成 CSV（每个申请人一个 sheet 概念，实际合并到一个文件）
function generateGroupedCSV(groups) {
  const BOM = '\uFEFF';
  const headers = ['申请人', '日期', '物品名称', '供货商', '单价', '数量', '总价', '状态', '备注'];
  let csv = BOM + headers.join(',') + '\n';

  groups.forEach(group => {
    group.records.forEach(r => {
      const status = r.status === 'pending' ? '已申请' : '已确认';
      const applicant = escapeCSV(group.applicant);
      const date = r.apply_date || '';
      const memo = escapeCSV(r.admin_memo || '');

      if (r.items && r.items.length > 0) {
        r.items.forEach(it => {
          const total = (parseFloat(it.price) || 0) * (parseInt(it.count) || 0);
          csv += [
            applicant, date,
            escapeCSV(it.name || ''),
            escapeCSV(it.supplier || ''),
            it.price || '0', it.count || '1',
            total.toFixed(2), status, memo
          ].join(',') + '\n';
        });
      }
    });
  });

  return csv;
}

// 保存并导出 CSV（直接复制到剪贴板）
function saveAndOpen(csvContent, filename) {
  // 去除 BOM 用于预览
  const preview = csvContent.length > 800
    ? csvContent.replace('\uFEFF', '').slice(0, 800) + '\n…（共 ' + csvContent.split('\n').length + ' 行）'
    : csvContent.replace('\uFEFF', '');

  wx.showModal({
    title: '导出 CSV',
    content: `${filename}\n\n点击"复制全部"将表格数据复制到剪贴板，\n然后粘贴到 Excel / Numbers / WPS 中即可。\n\n${preview}`,
    confirmText: '复制全部',
    cancelText: '关闭',
    success: (res) => {
      if (res.confirm) {
        wx.setClipboardData({
          data: csvContent,
          success: () => {
            wx.showToast({ title: '已复制！打开 Excel 粘贴即可', icon: 'success', duration: 2500 });
          },
          fail: () => {
            wx.showToast({ title: '复制失败，请重试', icon: 'none' });
          }
        });
      }
    }
  });
}

module.exports = { generateCSV, generateGroupedCSV, saveAndOpen };
