# Changelog

## 0.1.3 — 2026-09-16

Verified DeepSeek Harness: `0.1.5-rc.1`.

- **局域网/非回环页面修复**：DSH 的 settings Client 对来源不是 loopback 的页面关闭 Host 持久化（官方 `dsh-client-ui-settings` README：*Non-loopback pages get no durable settings*）——`settingsScope` 直接返回 `unavailable`，且从不发送 `settings.describe`，于是手机等经局域网访问的设备上快捷栏只显示「回复库不可用，无法发送」。现在官方 scope 报告 `unavailable` 时，插件改用与官方 settings Client 相同的公开 Remote（`settings.describe` / `settings.mutate`）直连 Host 的 `quick-replies` 命名空间：回复库仍是 Host 上那一份、多设备共享，读写、可写性与 revision 栅栏语义与回环页面一致。
- 回环页面行为与线上请求完全不变：官方 scope 可用时，直连通道不会被打开（也不会多发一次 `settings.describe`）。
- 直连通道可安全降级：Remote 缺失、读取被拒或答案不合法时，仍然是诚实的 `unavailable`，绝不伪造数据；写被拒时以 Host 错误码拒绝（管理界面提示冲突），不会静默覆盖。
- 修复注入守卫：注入上下文中读取点号父级（`payload.remote`）会抛 `cannot get property "remote" without inject`，旧守卫先读它会导致整条设置接线中断；现在先读字面服务键 `payload['remote.settings']`，并把每次读取都包在容错内。
- 多设备同步：直连通道订阅 `settings/document-updated` 失效通知，并在重连后重读，局域网设备的库与另一台设备的编辑保持同步。

## 0.1.2 — 2026-09-10

Verified DeepSeek Harness: `0.1.5-rc.1`.

- Adapted the Web client half to DeepSeek Harness `0.1.5-rc.1`.
- Dropped `@deepseek-ai/dsh-client-ui-slots` from `dsh.client.inject` (it is a frozen platform module, not a boot-graph plugin).
- Read `conversation.input.dock` session identity from session-standard `sessionId` or the `InputZone` owner (`session.sessionId`).
- Declared compatibility with DSH `0.1.5-rc.1` and aligned `@deepseek-ai/dsh-settings` peer/dev pins.

## 0.1.1

- CI 只跑 Node 24，避免 jsdom/undici 在 Node 20 上失败。
- npm 发布改用 GitHub Actions OIDC Trusted Publisher，推 `v*` 标签即可发版。

## 0.1.0

- 在会话输入区提供可管理的快捷回复，点击即发送纯文本用户消息。
- 空闲时 `queue`，顶层会话运行中 `steer`；不触碰草稿、不 cancel/stop。
- 回复库保存在 DSH Host 全局设置 `quick-replies`，多设备共享。
- 窄容器自动折叠；管理弹窗支持增删改、排序、导入导出。
- 空会话（尚无历史）拒绝发送，避免误触发新会话。
