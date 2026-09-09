# Changelog

## 0.1.1

- CI 只跑 Node 24，避免 jsdom/undici 在 Node 20 上失败。
- npm 发布改用 GitHub Actions OIDC Trusted Publisher，推 `v*` 标签即可发版。

## 0.1.0

- 在会话输入区提供可管理的快捷回复，点击即发送纯文本用户消息。
- 空闲时 `queue`，顶层会话运行中 `steer`；不触碰草稿、不 cancel/stop。
- 回复库保存在 DSH Host 全局设置 `quick-replies`，多设备共享。
- 窄容器自动折叠；管理弹窗支持增删改、排序、导入导出。
- 空会话（尚无历史）拒绝发送，避免误触发新会话。
