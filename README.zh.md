<h1 align="center">DSH Quick Replies</h1>

<p align="center">在 DeepSeek Harness 会话输入区提供可管理的快捷回复，一点即发。</p>

<p align="center">
  <a href="https://www.npmjs.com/package/dsh-quick-replies"><img src="https://img.shields.io/npm/v/dsh-quick-replies?label=npm&color=CB3837" alt="npm 版本"></a>
  <a href="https://github.com/idoall/dsh-quick-replies/actions/workflows/ci.yml"><img src="https://github.com/idoall/dsh-quick-replies/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-0F172A" alt="MIT"></a>
</p>

<p align="center"><a href="README.md">English</a> | 中文</p>

<p align="center">
  <a href="#能做什么">能做什么</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="#使用">使用</a> ·
  <a href="#卸载">卸载</a> ·
  <a href="CHANGELOG.md">更新记录</a>
</p>

> DSH Quick Replies 是 DeepSeek Harness 社区插件，挂在当前会话输入区上方，不修改 DSH 源码。

在输入框上方显示一排快捷文本。点击后作为普通用户消息发送：会话空闲时进入队列（`queue`），顶层会话运行中则走 steer（下一步安全边界处理）。不改草稿、不 cancel、不 stop。

回复库保存在 DSH Host 的设置条目 `dsh-quick-replies`（插件自身的 loader 条目，持久化在 profile patch 中），同一 Host 下多浏览器/设备共享。折叠偏好按当前浏览器分别记住。

<p align="center">
  <img src="./assets/ui.png" width="100%" alt="DeepSeek Harness 输入区上方的快捷回复栏：继续等 chip、添加与管理按钮，以及消息输入框">
</p>

## 能做什么

- **一点即发**：把常用短句（如「继续」「已重启请继续」）存成 chip，点击直接发送。
- **空闲 queue、运行中 steer**：运行中不会声称「已打断」；实际时机由 DSH 决定。
- **不碰草稿**：发送走会话公开 `prompt`，草稿、引用、图片、光标都保持原样。
- **可管理**：添加、编辑、删除、启用/停用、排序、JSON 导入导出。
- **窄屏折叠**：窄容器默认折叠为一行；展开高度受限，条目多时在栏内滚动。
- **空会话保护**：尚无历史消息的新会话拒绝发送，避免误点快捷回复开出废会话。

## 快速开始

要求：

- 带 Web profile 的 DeepSeek Harness
- Node.js 20 或更新版本
- 已验证的 DSH 版本：`0.1.7-alpha.2`（插件 `0.1.4`）

已经安装 `dsh` 命令：

```sh
dsh plugin --profile web add dsh-quick-replies@latest
```

直接使用 DeepSeek Harness 源码：

```sh
corepack enable; pnpm install
pnpm dsh plugin --profile web add dsh-quick-replies@latest
```

也可以通过插件市场安装（可选）：

```sh
dsh plugin --profile web add dshmarket
```

重启 DSH 后，在 **设置 → 插件市场** 里搜索 dsh-quick-replies，一键安装即可。

本地开发（link 到本仓库）：

```sh
pnpm install
pnpm run build
dsh plugin --profile web add "link:$(pwd)"
```

安装后刷新 Web 界面。Host 半边把回复库声明为自己的 `Config`——DSH 0.1.7 中设置表单的命名空间就是 loader 条目 id，所以这个 `Config` 就是 `dsh-quick-replies` 设置表单；客户端在 `conversation.input.dock` 挂载快捷栏。回复库写在该条目 `config` 里，落在当前 profile 的 `cordis.patch.yml`（`~/.dsh/profiles/<profile>/cordis.patch.yml`），不属于插件安装目录。

## 使用

1. 打开任意已有会话（不要在空白新会话上点「继续」类条目）。
2. 输入区上方出现快捷回复栏。窄屏默认折叠，点标题或箭头展开。
3. 点击 chip 发送；空闲显示「已提交（队列）」，运行中显示将在下一步处理。
4. 点 **＋** 直接添加一条：填标题和正文，保存后栏上立刻出现。
5. 点 **⚙** 打开管理：编辑、删除、排序、导入/导出 JSON。

默认四条（可全部删掉，不会自动重生）：继续、中断了请继续、下一步该做什么？、已重启请继续。

### 局域网（非回环页面）访问

DSH 对来源不是 loopback（`localhost` / `127.0.0.1`）的页面会关闭 Host 设置持久化（官方 `dsh-client-ui-settings` README 原文：*Non-loopback pages get no durable settings*）：所有按条目寻址的设置表单（`ctx.configForms.get(id)`，DSH 0.1.7 中已移除的 `settingsScope` 的继任者）此时被固定为 `memory`，直接返回 `unavailable`，并且从此不发 `settings.describe`。于是经局域网转发插件（`dsh-lan-proxy`、`dsh-bridge`、`dsh-mobile` 等）从另一台设备访问时，所有依赖 Host 设置的界面都会失效——本插件表现为「回复库不可用，无法发送」。

插件会改用与官方 settings Client 相同的公开 Remote（`settings.describe` / `settings.mutate`）直连 Host 上那份 `dsh-quick-replies` 条目。因此局域网设备上的读取、编辑、导入导出与回环页面一致，回复库仍是 Host 上共享的那一份；写入仍受 revision 栅栏保护，冲突会明确提示而不会静默覆盖。回环页面继续走官方表单（共享同一份 describe mirror、官方写队列），不会多一次线上读取。

若你希望保持 DSH 官方策略（非回环页面完全不落地设置），请停留在 `0.1.2`；或让转发侧声明宿主身份：在返回的 HTML 中、`__DSH_BOOT__` 之前注入 `window.__DSH_TRANSPORT__ = { fetch: (input, init) => window.fetch(input, init), ownsHost: true }`。DSH 的 loopback 判定会据此为真，所有依赖设置的界面（含「设置」页）一并恢复；`dsh-mobile` 网关正是这么做的。

## 兼容性

当前发布：插件 **`0.1.4`** 已针对 DeepSeek Harness **`0.1.7-alpha.2`** 验证。

| 插件 | 验证过的 DeepSeek Harness | 说明 |
| --- | --- | --- |
| `0.1.0`–`0.1.1` | `0.1.2-rc.1` | 已发布 |
| `0.1.2` | `0.1.5-rc.1` | 已发布 |
| `0.1.3` | `0.1.5-rc.1` | 已发布；局域网/非回环兜底 |
| **`0.1.4`** | `0.1.7-alpha.2` | 适配 DSH 0.1.7：回复库就是插件的 volatile `Config`（设置表单命名空间 = loader 条目 id），官方客户端通道改为 `ctx.configForms`，`@deepseek-ai/schemastery` 改为 peer。 |

DSH `0.1.7-alpha.2` 请使用 `0.1.4`。**`0.1.4` 只支持 DSH `0.1.7-alpha.2`。** DSH `0.1.7` 移除了本插件赖以工作的运行时 `ctx.settings.register(...)` API 与 `ctx.settingsScope` 服务，因此该版本线上只有 `0.1.4` 能把回复库存下来；仍在更早的 DSH（含 `0.1.6-alpha.2`）上时，请继续使用插件 **`0.1.3`**。更高 DSH 版本不会被自动宣称为兼容。不兼容时禁用或卸载插件，不要给 DSH 核心打补丁。

有两处声明支撑这一点，并由测试守住：

- `dsh.engines.dsh` 与 `peerDependencies['@deepseek-ai/dsh-settings']` 都声明 `>=0.1.7-alpha.2 <0.2.0`。下界特意写成这个 alpha：按 node-semver 默认的预发布规则，`>=0.1.6-0 <0.2.0` 这样的范围**并不接纳** `0.1.7-alpha.2`。
- `@deepseek-ai/schemastery` 是 **peer**，不是普通依赖：DSH 0.1.7 只从运行安装解析 link 插件的 peer 依赖，否则 `link:` 安装会连 Host 半边都 import 失败。

## 卸载

```sh
dsh plugin --profile web remove dsh-quick-replies
```

卸载不会删除设置里的回复库。需要清库时，先在管理界面导出 JSON，再手动删除当前 profile 的 `cordis.patch.yml` 中 `dsh-quick-replies` 条目的 `config`。

## 开发

```sh
pnpm install
pnpm run test
pnpm run build
```

`pnpm run test` 会跑 `tsc --noEmit` 以及全部 vitest 项目：共享/Host 逻辑、客户端逻辑与 jsdom UI 用例，还有一条会按 DSH 的方式加载 `lib/index.js`、`lib/client.js` 的构建产物用例。产物用例需要有东西可跑，所以先执行一次 `pnpm run build`。

推送 `v*` 标签后，GitHub Actions 会跑测试、打包，并在配置了 `NPM_TOKEN` 时发布到 npm、创建 GitHub Release。

MIT，详见 [LICENSE](LICENSE)。
