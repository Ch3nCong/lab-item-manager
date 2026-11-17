# Lab Item Manager（实验室物品管理小程序）

微信云开发个人实验室物品申领管理工具。

## 功能

- **申领提交**：多物品申领、自动记忆申请人、日期选择
- **记录管理**：申请人只看自己的记录，支持"只看自己"筛选与作废
- **管理员后台**：密码进入，按申请人分组确认/批量操作、XLSX 导出
- **凭证上传**：申领确认后上传凭证照片，管理员归档

## 技术栈

- 微信原生小程序 + Vant Weapp
- 微信云开发（云数据库 + 云函数）
- 客户端 HTML 表格方式导出 Excel（.xls，零依赖）

## 部署配置

以下位置需替换为实际值（仓库中均为占位符）：

| 位置 | 占位符 | 说明 |
|------|--------|------|
| `project.config.json` | `touristappid` | 小程序 AppID |
| `miniprogram/app.js` | `YOUR_CLOUD_ENV_ID` | 云开发环境 ID |
| `cloudfunctions/*/index.js` | `YOUR_OPENID_HERE` | 管理员 OpenID 白名单 |
| `miniprogram/utils/constants.js` | `YOUR_ADMIN_PASSWORD` | 管理后台密码 |

## 目录结构

```
├── miniprogram/          # 小程序端
│   ├── pages/            # login / index / apply / detail / admin / about
│   ├── components/       # record-card
│   ├── utils/            # 常量、导出工具
│   └── libs/             # 第三方库
├── cloudfunctions/       # 云函数
│   ├── checkAdmin/       # OpenID 白名单校验
│   ├── updateStatus/     # 状态流转（注入接收方信息）
│   ├── deleteRecord/     # 硬删除
│   └── exportRecords/    # XLSX 导出（备用，客户端方案已替代）
└── project.config.json
```

## 使用

1. 微信开发者工具导入项目，替换上述配置
2. 数据库创建 `records` 集合，权限设为所有用户可读写
3. 右键各云函数目录 →「上传并部署：云端安装依赖」
4. 管理员入口：关于页点击 Logo 5 次 → 输入密码
