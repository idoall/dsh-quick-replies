# Changelog

## 0.1.6 — 2026-09-25

Verified DeepSeek Harness: `0.1.7-rc.2`（官方最新的候选版本），同时兼容 `0.1.7-rc.1` 与 `0.1.7-alpha.2`。

**本版确认并声明对最新 `0.1.7-rc.2` 候选版本的支持。代码与 `0.1.5` 完全相同，存储模型也完全相同——从 `0.1.5` 升级无需迁移数据、无需改配置。**

- **逐包核对了 rc.1 → rc.2 的实际产物**，本插件依赖的接口都没有不兼容变更：`@deepseek-ai/dsh-settings` 的 `lib` 未变（仍无运行时 `register`，仍是 `describe` / `update` / `replace` / `mutate`）；`@deepseek-ai/dsh-client-ui-settings` 的 `lib/client.js` 未变（`ctx.configForms` 仍在，`ctx.settingsScope` 仍不存在）；`@deepseek-ai/dsh-api-settings-controller` 除 `package.json`/README 外完全一致（`settings.describe` / `settings.mutate` 未变）；`@deepseek-ai/dsh-client-connection` 的 `lib` 未变；`@deepseek-ai/dsh-api-remotes` 只有增量（新增 `schedule` 等 Remote 与凭据事件，局域网兜底依赖的 `settings/document-updated` 仍在）；`@deepseek-ai/dsh-api-session-controller` 的 `prompt` / `steer` / `queue` 面未变（仅新增 `initializeDefaultModel`）。
- **插槽契约未变**：`conversation.input.dock` 仍是 `kind: "list"`、`scope: "session"`，`quick-replies` occupant 照常注册；该插槽的 props 类型 rc.2 未改（rc.2 只在别处新增了 `stopShortcut` hook）。
- **rc.2 唯一可见的改动是设计令牌**：`@deepseek-ai/dsh-client-ui-theme` 定义 `--dsw-radius-*`（`sm/md/lg/xl/panel`）与 `--dsw-focus-ring-*`，宿主自己的 dock 面板圆角由字面 `12px` 改为 `var(--dsw-radius-lg)`（= 16px）。本插件的圆角是自持的 12px，因此与刷新后的宿主 dock 有约 4px 的观感差异；本版**刻意不改**——同一个 `--dsw-radius-lg` 在 rc.1 上也是 16px，而 rc.1 的宿主 dock 是 12px，跟随令牌只会把差异从最新版挪到旧版，属于纯观感取舍，不影响挂载、发送与存储。
- **peer 范围无需改动**：`>=0.1.7-alpha.2 <0.2.0` 在 node-semver 默认预发布规则下同时接纳 `0.1.7-alpha.2`、`0.1.7-rc.1` 与 `0.1.7-rc.2`（只要范围里有比较符写了同一个 `major.minor.patch`，该版本的预发布即被接纳）。`dsh.compatibility.dshReleases` 现同时记录三者。
- **文档**：中英文 README 在顶部与兼容性章节更新支持版本；顺带修正 README 中「配置了 `NPM_TOKEN` 才发布 npm」的过时说法——实际是 OIDC 可信发布。

## 0.1.5 — 2026-09-23

Verified DeepSeek Harness: `0.1.7-rc.1`（官方最新的候选版本），同时兼容 `0.1.7-alpha.2`。

**本版适配并验证了最新的 `0.1.7-rc.1` 候选版本。** 存储模型与 `0.1.4` 完全一致，**从 `0.1.4` 升级无需迁移数据、无需改配置**。

- **在运行中的 `0.1.7-rc.1` 实例上实测通过**：Host 侧 `Config.listConfigs` 仍把 `dsh-quick-replies` 识别为可配置的表单条目（`status: "schema"`），客户端 `conversation.input.dock` 的 `quick-replies` occupant 仍为 `active: true`，快捷栏照常渲染与读写。
- **核对过 rc.1 的实际代码与官方说明**：`ctx.configForms` 仍在、`ctx.settingsScope` 仍不存在、`dsh-settings` 仍无运行时 `register`；官方 rc.1 说明中「设置改由当前 Profile 的插件配置保存；旧 settings.yaml 仅尝试导入一次」正是 `0.1.4` 已适配的那批变更。
- **peer 范围无需改动**：`>=0.1.7-alpha.2 <0.2.0` 在 node-semver 默认预发布规则下同时接纳 `0.1.7-alpha.2` 与 `0.1.7-rc.1`（只要范围里有比较符写了同一个 `major.minor.patch`，该版本的预发布即被接纳）。`dsh.compatibility.dshReleases` 现同时记录两者。
- **清理 `0.1.4` 遗留**：删除已无调用方的 `assertSectionValid`（其注释仍引用 0.1.7 已移除的 Host registration validate hook）；两处**用户可见**的错误前缀由旧命名空间 `quick-replies:` 改为实际寻址的条目 id `dsh-quick-replies:`。
- **文档**：中英文 README 在顶部与兼容性章节明确标注已支持最新 RC。

## 0.1.4 — 2026-09-23

Verified DeepSeek Harness: `0.1.7-alpha.2`.

0.1.7 移除了本插件赖以工作的两套 API，因此这是一次必需的重写而非增量修补。**`0.1.4` 只支持 DSH `0.1.7-alpha.2`**；更早的 DSH（含 `0.1.6-alpha.2`）请继续用 `0.1.3`。

- **宿主半：`settings.register` 已不存在（致命项）**。0.1.7 的 `ctx.settings` 只投影各 Loader 条目自身 `Config` 的 **volatile** 字段，且**设置表单的命名空间就是条目 id**（`docs/subsystems/settings.md`）。原先 `sctx.settings.register(QR_NAMESPACE, schema, { base, applies, validate })` 会抛 `register is not a function` 并被容错吞掉，`quick-replies` 命名空间从此永远不存在，快捷栏在 0.1.7 上必然全灭。现在宿主半导出 `Config`（schemastery），`schemaVersion` 与 `items` 均标 `.volatile()`：库的每次编辑都提交进运行中的引用并发 `loader/volatile-update`，不会重挂载插件。原「四个内置回复」成为 `items` 的 schema 默认值（即解析后的 composition base）；用户删除全部条目写入 `items: []` 仍是用户层覆盖，不会退回内置。
- **命名空间改名**：`quick-replies` → `dsh-quick-replies`（= `cordis.patch.yml` 的 insert id）。`cordis.patch.yml` 里的 `id` 从此**就是**存储键，不可再改。
- **存储位置变更**：回复库不再写在 `~/.dsh/settings.yaml`，而是作为该条目的 `config` 落在当前 profile 的 `cordis.patch.yml`。这是 0.1.7 官方的插件偏好模型（`configEditor.edit()` 会为 bundle insert 出来的条目追加 profile override），写入仍是原子替换并保留 YAML 注释。
- **客户端：`ctx.settingsScope` 服务已不存在**。官方通道改为 `ctx.configForms.get(entryId)`（`@deepseek-ai/dsh-client-ui-settings`），新增 `configFormScope.ts` 把它投影到插件自己的 scope 契约上；`mutate` 返回 `false`（被拒）会翻译成拒绝，管理界面的冲突提示得以保留。回环页面依旧优先走官方通道，不多发线上读取；局域网页面依旧回落到 `remote.settings` 直连，跨设备共享语义不变。
- **抑制重复的自动表单页**：`Config` 出现后 DSH 会默认为该条目生成一个通用表单，与本插件自带的管理弹窗重复。按官方惯例（`ui-theme`、`ui-chat`、`ui-conversation` 同样做法）注册 `settings.configure({ auto: false })`；命名空间行本身仍留在 `settings.describe()` 中，读写不受影响。
- **`@deepseek-ai/schemastery` 由普通 dependency 改为 peer**（同时保留 devDependency）：DSH 0.1.7 只从运行安装解析 link 插件的 peer 依赖，普通依赖会在插件自己的 `node_modules` 下查找，而本仓库不提供该目录，`link:` 安装时 Host 半边会 import 失败。
- **兼容性声明修正**：`dsh.engines.dsh` 与 `dsh-settings` peer 范围改为 `>=0.1.7-alpha.2 <0.2.0`，`dsh.compatibility.dshReleases` 记 `0.1.7-alpha.2`。下界必须写这个 alpha：按 node-semver 默认预发布规则，`>=0.1.6-0 <0.2.0` 并不接纳 `0.1.7-alpha.2`。另补 `dsh.manifestVersion`，并在 `dsh.client.inject` 中补 `@deepseek-ai/dsh-api-remotes`（直连通道直接使用 `remote.settings`）。

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
