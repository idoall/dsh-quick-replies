# Changelog

## 0.1.15 — 2026-10-17

Verified DeepSeek Harness: `0.2.1-rc.2`（npm dist-tag `next`；`alpha` 停在 `0.2.1-alpha.5`，`latest` 仍是 `0.2.0-rc.2`），同时保持对 `0.2.1-alpha.5`、`0.2.1-alpha.4`、`0.2.1-alpha.3`、`0.2.1-alpha.1`、`0.2.0-rc.2`、`0.2.0-rc.1` 与整条 `0.1.7` 线的兼容声明。

**本版声明支持 DSH `0.2.1-rc.2`——`0.2.1` 的首个候选版，也是本插件第一次面向 RC 而非 alpha 做声明。产品代码与 `0.1.14` 逐字节相同：没有迁移数据、没有改配置。**

- **门禁放行，但此前只靠宽松规则**：用 DSH 自带的 `evaluatePluginCompatibility` 实测，`0.1.14` 的 manifest 对 `0.2.1-rc.2` 是 ADMITTED，靠的是尾段 `>=0.2.0 <0.3.0` 在门禁的 `includePrerelease` 下接纳排序高于 `0.2.0` 的预发布；换成 node-semver 默认规则则是 **false**（预发布要放行，需要同一比较器集合里存在同 `major.minor.patch` 且带预发布标签的比较器——尾段那两个比较器的 tuple 是 `0.2.0` 与 `0.3.0`，证不到 `0.2.1`）。把 `0.2.1-rc.2` 显式加入 `dsh.engines.dsh` 与 peer `@deepseek-ai/dsh-settings` 两处范围后，它在两种规则下**都**接纳（实测 strict 也变 true）。`0.2.1-rc.1` 未实测、故意不声明，仍只由尾段在门禁侧接纳；`0.2.0`/`0.2.1` 正式版照常接纳，`0.3.0` 仍在大门外（实测 REJECTED）。
- **真实 profile 端到端**：`dsh --profile web --dump-config` 在 `0.2.1-rc.2` 上退出码 0、**stderr 零行**，`dsh-quick-replies` 行在合成树里。
- **alpha.5 → rc.2 逐包核对：这是一次纯元数据发布。** 本插件消费的六个包——`@deepseek-ai/dsh-client-ui-settings`、`dsh-settings`、`dsh-api-remotes`、`dsh-client-connection`、`dsh-api-session-controller`、`dsh-client-ui-conversation`——**每一个的整棵包树都只差 `package.json` 一个文件**，即 `lib/` 与全部类型声明与 alpha.5 逐字节相同。因此 `ctx.configForms.get(entryId)`、`ctx.settings.describe()`、`remote.settings` 的 `describe`/`mutate`、`remote.$on('settings/document-updated')`、`connection.state`/`connection/reset`、`sessions.binding`/`scope`、`composer-blocks` 的 `storeFor`、`input.for(`、`InputState.phase` 四态、以及本插件注册的槽位契约 `contract/slots.d.ts` 全部未动。这一版比 alpha.4→alpha.5 还要干净：连 `dsh-api-remotes` 那 39 字节的客户端 bundle 差异都没有了。
- **`devDependencies` 的 `@deepseek-ai/dsh-settings` 从 `0.2.1-alpha.5` 钉到 `0.2.1-rc.2`**：本仓库类型检查从「直接针对 alpha.5」升级为「直接针对 `0.2.1-rc.2`」。98 项测试全部通过，`pnpm run verify` 全绿（含 pack dry-run 产出 `0.1.15`）。
- **文档与产物一致性**：两份 README 的顶部支持声明、兼容段与兼容表各加一行 `0.1.15`（中英文同步）；`docs/releases/v0.1.15.md` 按现行版式写。发 tag 前逐项核对过 README 中英文、release notes 标题与锚点、以及"支持的 DSH 版本号"三处口径一致；发布后另取了 npm 上的 tarball 与本地构建产物逐文件比对，确认包内容同步。

## 0.1.14 — 2026-10-16

Verified DeepSeek Harness: `0.2.1-alpha.5`（npm dist-tag `alpha`；`latest`/`next` 仍是 `0.2.0-rc.2`），同时保持对 `0.2.1-alpha.4`、`0.2.1-alpha.3`、`0.2.1-alpha.1`、`0.2.0-rc.2`、`0.2.0-rc.1` 与整条 `0.1.7` 线的兼容声明。

**本版声明支持最新 DSH `0.2.1-alpha.5`：产品代码与 `0.1.13` 逐字节相同——没有迁移数据、没有改配置。`0.1.13` 其实已经能在 alpha.5 上装载，本版把已验证版本写明，并钉高类型检查所用的宿主类型面。**

- **门禁放行，但此前只靠宽松规则**：用 DSH 自带的 `evaluatePluginCompatibility` 实测，`0.1.13` 的 manifest 对 `0.2.1-alpha.5` 是 ADMITTED，靠的是尾段 `>=0.2.0 <0.3.0` 在门禁的 `includePrerelease` 下接纳排序高于 `0.2.0` 的预发布；换成 node-semver 默认规则则是 **false**。把 `0.2.1-alpha.5` 显式加入 `dsh.engines.dsh` 与 peer `@deepseek-ai/dsh-settings` 两处范围后，它在两种规则下**都**接纳（实测 strict 也变 true）。`0.3.0` 仍在大门外（实测 REJECTED）。
- **真实 profile 端到端**：`dsh --profile web --dump-config` 在 alpha.5 上退出码 0、**stderr 零行**，`dsh-quick-replies` 行在合成树里。
- **alpha.4 → alpha.5 逐包核对，本插件消费的接口全部完好**，而且这一版比上一版安静得多：
  - `@deepseek-ai/dsh-client-ui-settings`、`@deepseek-ai/dsh-settings`、`@deepseek-ai/dsh-client-connection`、`@deepseek-ai/dsh-api-session-controller`、`@deepseek-ai/dsh-client-ui-conversation` **五包都只有 `package.json` 不同**，库代码与类型声明逐字节相同 → `ctx.configForms.get(entryId)`、`ctx.settings.describe()`、`connection.state`/`connection/reset`、`sessions.binding`/`scope`、`composer-blocks` 的 `storeFor`、`input.for(`、`InputState.phase` 四态全部未动。上一版改动较多的 `ui-conversation` 这次**零代码变化**，本插件注册的槽位契约 `contract/slots.d.ts` 仍与 alpha.4 完全相同。
  - `@deepseek-ai/dsh-api-remotes` 只有 `lib/client.js` 与 manifest 变化，**类型面零 diff**（客户端 bundle 体积 1083959 → 1083920 字节，仅 −39 字节）。`settings/document-updated` 仍在 `lib/types/remote-events.d.ts` 的前向事件表里（`mode: "emit"`）、仍在宿主 `lib/index.js` 中；`$on` 仍在 4 个类型文件里。
- **`devDependencies` 的 `@deepseek-ai/dsh-settings` 从 `0.2.1-alpha.4` 钉到 `0.2.1-alpha.5`**：本仓库类型检查从「直接针对 alpha.4」升级为「直接针对 alpha.5」。98 项测试全部通过，`pnpm run verify` 全绿（含 pack dry-run 产出 `0.1.14`）。
- **文档**：两份 README 的顶部支持声明、兼容段与兼容表各加一行 `0.1.14`（中英文同步）；`docs/releases/v0.1.14.md` 按现行版式写（双语锚点 + 一句话 + 三条要点 + 升级命令）。发版前逐项核对过：README 中英文、release notes 标题与锚点、以及"支持的 DSH 版本号"三处口径一致。

## 0.1.13 — 2026-10-16

Verified DeepSeek Harness: `0.2.1-alpha.4`（npm dist-tag `alpha`；`latest`/`next` 仍是 `0.2.0-rc.2`），同时保持对 `0.2.1-alpha.3`、`0.2.1-alpha.1`、`0.2.0-rc.2`、`0.2.0-rc.1` 与整条 `0.1.7` 线的兼容声明。

**本版声明支持最新 DSH `0.2.1-alpha.4`：产品代码与 `0.1.12` 逐字节相同——没有迁移数据、没有改配置。`0.1.12` 其实已经能在 alpha.4 上装载，本版把已验证版本写明，并钉高类型检查所用的宿主类型面。**

- **门禁放行，但此前只靠宽松规则**：用 DSH 自带的 `evaluatePluginCompatibility` 实测，`0.1.12` 的 manifest 对 `0.2.1-alpha.4` 是 ADMITTED，靠的是尾段 `>=0.2.0 <0.3.0` 在门禁的 `includePrerelease` 下接纳排序高于 `0.2.0` 的预发布；换成 node-semver 默认规则则是 **false**。本版把 `0.2.1-alpha.4` 显式加入 `dsh.engines.dsh` 与 peer `@deepseek-ai/dsh-settings` 两处范围后，它在两种规则下**都**接纳。`0.2.1-alpha.2` 仍未实测、故意不声明，只由尾段在门禁侧接纳；`0.2.0`/`0.2.1` 正式版照常接纳，`0.3.0` 仍在大门外（实测 REJECTED）。
- **真实 profile 端到端**：`dsh --profile web --dump-config` 在 alpha.4 上退出码 0、**stderr 零行**，`dsh-quick-replies` 行在合成树里。
- **alpha.3 → alpha.4 逐包核对，插件消费的接口全部完好**：
  - `@deepseek-ai/dsh-client-ui-settings`、`@deepseek-ai/dsh-settings`、`@deepseek-ai/dsh-client-connection` 三包**只有 `package.json` 不同**，库代码逐字节相同 → `ctx.configForms.get(entryId)`、`ctx.settings.describe()`、`connection.state`、`connection/reset` 均未动。
  - `@deepseek-ai/dsh-api-session-controller` 只有 `typert.host.js` 与 manifest 变化，**客户端契约零 diff** → `sessions.binding`/`scope` 未动。
  - `@deepseek-ai/dsh-api-remotes` 有 7 个文件变化，但 `settings/document-updated` 在前向事件表里仍是 `mode: "emit"`（本次只是在它前面新增了一条无关的 `plugin-market/changed`），`$on` 与 settings 命名空间面都在。
  - `@deepseek-ai/dsh-client-ui-conversation` 变化最多（17 个文件），但**本插件注册的槽位契约 `contract/slots.d.ts` 零 diff**，`conversation.input.dock` 声明未动；`composer-blocks` 的 `storeFor` 与 `input.for(` 未动；`InputState.phase` 四个取值 `'plain' | 'adjudicating' | 'claimed' | 'submitting'` 逐字未变（`contract/input.d.ts:268`）。
- **alpha.4 里唯一实质的客户端改动与本插件无关**：命令 chip 模型（新增 `CommandClaim` 解析入口 `resolveClaim`，`InputEvent` 的 `draft-changed` 载荷由 `{ draft: string }` 改为 `{ command: CommandClaim | undefined }`，`beginCommand` 改走 chip）。本插件在 `src/` 里对 `InputEvent`、`draft-changed`、`resolveClaim`、`CommandClaim`、`beginCommand` 的引用**全为 0 处**——它只读输入机的 `phase`，从不订阅输入事件、也从不改写草稿（这是它既有的设计边界）。
- **`devDependencies` 的 `@deepseek-ai/dsh-settings` 从 `0.2.1-alpha.3` 钉到 `0.2.1-alpha.4`**：本仓库类型检查从「直接针对 alpha.3」升级为「直接针对 alpha.4」。98 项测试全部通过，`pnpm run verify` 全绿（含 pack dry-run 产出 `0.1.13`）。
- **文档**：两份 README 的顶部支持声明、兼容段与兼容表各加一行 `0.1.13`；`docs/releases/v0.1.13.md` 按现行版式写（双语锚点 + 一句话 + 三条要点 + 升级命令）。

## 0.1.12 — 2026-10-15

Verified DeepSeek Harness: `0.2.1-alpha.3`（与 `0.1.10` / `0.1.11` 同一目标）。

**清掉设置通道里已经死掉的 `mode` 字段——这正是 `0.1.10` 里明确记为「已知漂移、有意不修」的那一处。行为零变化，只是不再让代码假装存在第二条存储路径。**

- **背景**：DSH `0.2.1-alpha.3` 从 `@deepseek-ai/dsh-client-ui-settings` 的 `ConfigFormSnapshot` 删除了 `mode`（`'host' | 'memory'`），并整体移除客户端「非 loopback ⇒ memory 持久化」概念。本插件 `configFormScope.ts` 仍在投影该字段，运行时恒为 `undefined`：`libraryStore` 的可写判定 `snap.writable === true && snap.mode !== 'memory'` 退化成 `snap.writable === true`（结论本就相同），而 `'memory'` 那条存储提示在 alpha.1 上就已不可达（`stateOf` 被 `status === 'unavailable'` 的提前返回挡住）。
- **契约**：`SettingsScopeSnapshotLike` 去掉 `mode`；`ConfigFormSnapshotLike` 与 `configFormScope` 的投影同步去掉；模块注释改为按 `status` 说明通道选择，并写明 `mode` 已被上游在 alpha.3 删除。
- **两个通道**：`settingsChannel` 的 `LOADING_SNAPSHOT` 与 `hostDirectScope` 的三个快照构造去掉 `mode: 'host'`；两处 `sameSnapshot` 去掉 `a.mode === b.mode`（该字段对官方通道恒 `undefined`、对直连通道恒 `'host'`，从不参与有效比较）。`hostDirectScope` 的模块注释同时把「DSH 对任何非 loopback 页面关闭 Host 持久化」限定为 `0.2.1-alpha.1` 及更早，并说明 alpha.3 起该通道是休眠回退。
- **存储层与 UI**：`StorageNote` 去掉 `'memory'`；`stateOf` 的可写判定与提示简化为 `writable === true` 与 `writable ? 'ok' : 'readonly'`；`libraryStateOf` 入参类型去掉 `mode`；`i18n.ts` 删除 `storage.note.memory` 中英文案；`texts.ts` 删除对应 `case`；`shared/types.ts` 的 `LibraryStatus` 注释去掉「memory mode」措辞。
- **测试**：`library.spec.ts` 的「memory mode is read-only…」改名为「a non-writable scope is read-only…」，断言从 `note === 'memory'` 改为 `'readonly'`（这条现在覆盖的是设置不可写的真实路径）；`makeScope` 辅助函数去掉 `mode` 入参与默认值；`configFormScope.spec.ts` / `settingsChannel.spec.ts` / `dock.spec.tsx` / `manage.spec.tsx` 的全部 `mode` 夹具与断言删除，两处测试名与头注释去掉「memory-only / pinned to memory」措辞。测试数仍是 **98 项全通过**——没有丢掉覆盖，只是同一条用例换了更准确的名字。
- **验证**：`pnpm run verify` 全绿（两个 tsc + 98 测试 + build + pack dry-run）；产出的 `lib/client.js` 已不含 `storage.note.memory`。

## 0.1.11 — 2026-10-15

Verified DeepSeek Harness: `0.2.1-alpha.3`（与 `0.1.10` 同一目标；本次只改文档）。

**纯文档版：修正两份 README 里的「局域网页面」说明，业务代码与 `0.1.10` 逐字节相同——升级不改变任何行为。发这一版是因为 npm 页面展示的是已发布包里的 README，只有重新发一版才能把改对的文档送上去。**

- **旧说法在 `0.2.1-alpha.3` 上已不成立**：原文断言「DSH 对来源不是 loopback 的页面会关闭 Host 设置持久化，所有依赖设置的界面随之失效」，并把本插件的 LAN 直连通道描述成必需。核对两版客户端 bundle 后确认：`0.2.1-alpha.1` 的 `@deepseek-ai/dsh-client-ui-settings` 里有 `const persistence = ctx.remote.$host.isLoopback ? "host" : "memory"`，这个 `memory` 让共享镜像永不发 `settings.describe`、表单恒为 `unavailable`，于是 `hostDirectScope` 那条回退成为必需；`0.2.1-alpha.3` 把这一行连同整个客户端持久化概念一并删掉（该 bundle 里 `isLoopback` / `persistence` / `$host` 均 0 次出现），alpha.3 的表单只在 Host 的 describe 答案里缺该 namespace 时才 `unavailable`。Host 侧 `@deepseek-ai/dsh-settings` 的 `lib/` 在 alpha.1↔alpha.3 之间**逐字节相同**，且不含任何按来源（loopback / principal / authority / peer）的判定，所以非回环页面会照常拿到那一份共享设置。结论：LAN 直连通道在 alpha.3 上退化为休眠，读写导入导出走官方表单；对更旧的 DSH 它仍然必需。
- **两份 README 改为按 DSH 版本分开讲**：`0.2.1-alpha.1` 及更早是什么行为、`0.2.1-alpha.3` 起是什么行为，中英文逐句对应。末尾的 `window.__DSH_TRANSPORT__ = { …, ownsHost: true }` 变通保留，但措辞改为「`ctx.connection.isLoopback` 会据此为真，**仍以此为准的**界面一并恢复」——因为 alpha.3 里 `ui-settings-general` 的文档控制器等界面仍在读 `$host.isLoopback`，而共享的 `configForms` 已经不看它了；`ownsHost: true` 本身在 alpha.3 依旧有效（`dsh-client-connection` 里 `isLoopback: transport?.ownsHost === true || pageLocation === void 0 || isLoopbackHostname(...)`）。
- **兼容表补 `0.1.11` 一行**，两份 README 的顶部支持声明与兼容段落同步到 `0.1.11`。`package.json` 的 peer 范围、`dsh.engines.dsh`、`dsh.compatibility.dshReleases`、devDependency 均与 `0.1.10` 一致（都是 `0.2.1-alpha.3`）——本次没有任何兼容性改动。
- **顺手核对的两件事**：Release 正文格式与家族主流一致（双语锚点 + `⚠️ 调整` / `⚠️ Changed` + `### 升级` / `### Upgrade`，与 `dsh-session-colors` v0.1.8、`dsh-update-status` v0.4.2 同构；`dsh-lan-guard`、`dsh-notify` 用的是它们各自的 `🔌` 小节样式）；`pnpm run verify` 与 98/98 测试仍全绿。

## 0.1.10 — 2026-10-15

Verified DeepSeek Harness: `0.2.1-alpha.3`（npm dist-tag `alpha`；`latest`/`next` 仍是 `0.2.0-rc.2`），同时保持对 `0.2.1-alpha.1`、`0.2.0-rc.2`、`0.2.0-rc.1` 与整条 `0.1.7` 线的兼容声明。

**本版声明支持最新 DSH `0.2.1-alpha.3`：产品代码与 `0.1.9` 逐字节相同——没有迁移数据、没有改配置。0.1.9 那个版本其实已经能在 alpha.3 上装载，本版只是把已验证版本写明，并钉高类型检查所用的宿主类型面。**

- **门禁放行，且不依赖版本豁免**：`dsh --profile web --dump-config` 退出码 0、stderr 零警告，`dsh-quick-replies` 条目在合成树里（`config.items` 完整）。DSH 的门禁是 `@deepseek-ai/dsh-app-boot` 的 `evaluatePluginCompatibility`，它**只**比对 `@deepseek-ai/dsh-*` 前缀的 peerDependencies，且用 `semver.satisfies(..., { includePrerelease: true })`。本插件的 peer 尾段 `>=0.2.0 <0.3.0` 只在宽松规则下接纳 `0.2.1-alpha.2`/`alpha.3`（node-semver 默认规则下 `0.2.1-alpha.1` 这个「同 tuple + 预发布」比较器只能证明它自己，`alpha.3` 不在其中）；`plugin_manager list_version_exemptions` 显示本插件**没有**任何豁免，走的是原生通过——这点重要，因为精确版本豁免不跨运行时继承。
- **peer 与 `dsh.engines.dsh` 显式加入 `0.2.1-alpha.3`**：两处范围改为 `>=0.1.7-alpha.2 <0.2.0-0 || 0.2.0-rc.1 || 0.2.0-rc.2 || 0.2.1-alpha.1 || 0.2.1-alpha.3 || >=0.2.0 <0.3.0`。加入后 `0.2.1-alpha.3` 在 node-semver 默认规则与门禁的 `includePrerelease` 规则下**都**接纳；`0.2.1-alpha.2` 等未实测的预发布仍只由尾段在门禁侧接纳，`0.2.0`/`0.2.1` 正式版照常接纳，`0.3.0` 仍在大门外。只声明实测过的版本，是沿用 `0.1.9` 的做法。
- **宿主面逐字节核对**：`@deepseek-ai/dsh-settings` 的 `lib/` 在 `0.2.1-alpha.1` 与 `0.2.1-alpha.3` 之间**完全相同**（两版只差 `locale/` 与 `package.json`），所以本插件宿主半边调用的 `ctx.settings.describe()` 与 `ctx.inject(['settings'])` 未动。
- **插件消费的客户端契约逐项仍在**：`ctx.configForms.get(entryId)`、`remote.settings` 的 `describe`/`mutate`、`remote.$on('settings/document-updated')`（前向事件表里仍是 `mode: "emit"` 且未声明 `resources`，即走 `global`）、`connection.state.getSnapshot()` 三态、`connection/reset` 事件（类型声明仍在，发射方是 `dsh-api-gateway` 的浏览器半边）、`sessions.binding`/`scope`、`conversation.blocks.storeFor`、`input.for().state.getSnapshot().phase` 四态、以及 `conversation.input.dock` 槽位声明。
- **alpha.3 新增的访问控制层不挡本插件**：`dsh-client-connection` 把浏览器 peer 建成 `principal: { kind: "owner" }`，gateway 只在 `principal.kind !== "owner"` 时才征询 `remoteAccess.decide()`。实测非 loopback 页面注入的 `__DSH_REMOTE_ACCESS__` 就是 `{"type":"baseline","owner":true}`，所以手机上那条 LAN 通路上的设置读写不被收紧。
- **已知漂移（本版有意不修，记录在案）**：alpha.3 从 `ui-settings` **删除了 `ConfigFormSnapshot.mode`（`'host' | 'memory'`）**，并整体移除客户端「非 loopback ⇒ memory 持久化」的概念（该 bundle 里的 `persistence`、`remote.$host.isLoopback` 一并消失，alpha.1 曾是 `status: persistence === "host" ? "loading" : "unavailable"`）。本插件 `src/client/settings/configFormScope.ts` 仍在读 `snapshot.mode`，运行时该字段现在恒为 `undefined`。影响是**中性的**：`libraryStore` 的可写判定 `snap.writable === true && snap.mode !== 'memory'` 退化为 `snap.writable === true`（结论不变），而 `'memory'` 那条存储提示在 `stateOf` 里本来就被 `status === 'unavailable'` 的提前返回挡住、两个版本下都不可达。LAN 回退判的是 `status === 'unavailable'` 而不是 `mode`，所以 `hostDirectScope` 仍然有效；alpha.3 不再把非 loopback 页面强制钉成 unavailable，因此手机上现在多半直接走官方通路、直连通道退化为休眠回退——两条路都给同一份共享库。清理这处死代码留作后续单独的版本，不与本次声明式发版混在一起。
- **真实 profile 端到端**：门禁与合成树见上；另有运行态实测——LAN 页面（非 loopback，走 `3081`）的模块清单里含 `{"id":"dsh-quick-replies","url":"plugins/??dsh-quick-replies/client.js&rev=…"}`，该 URL 取回 200（107 KB），其声明的 5 个 inject 目标也都在该页面的客户端模块表内。
- **`devDependencies` 的 `@deepseek-ai/dsh-settings` 从 `0.2.1-alpha.1` 钉到 `0.2.1-alpha.3`**：本仓库类型检查从「直接针对 `0.2.1-alpha.1`」升级为「直接针对 `0.2.1-alpha.3`」。98 项测试全部通过（含按 harness 方式装载 `lib/` 产物的 lane），`pnpm run verify` 全绿。
- **文档**：两份 README 的顶部支持声明、兼容段与兼容表各加一行 `0.1.10`；`docs/releases/v0.1.10.md` 按现行版式写（双语锚点 + 一句话 + 三条要点 + 升级命令）。

## 0.1.9 — 2026-10-08

Verified DeepSeek Harness: `0.2.1-alpha.1`（2026-10-03 发布），同时保持对 `0.2.0-rc.2`、`0.2.0-rc.1` 与整条 `0.1.7` 线的兼容声明。

**本版声明支持最新 DSH `0.2.1-alpha.1`：接口零破坏，业务代码与 `0.1.8` 完全相同——升级无需迁移数据、无需改配置。改动只有兼容声明、文档与开发依赖的钉版。同时把两份 README 从「实现说明」重写为「讲重点」，删去三段长篇接口论证。**

- **门禁放行**：用 DSH 自带的门禁函数（`@deepseek-ai/dsh-app-boot` 的 `evaluatePluginCompatibility`）实测 `0.1.8`/`0.1.9` 的 manifest → 通过。`0.1.8` 的范围其实已经能装载 `0.2.1-alpha.1`（尾段 `>=0.2.0 <0.3.0` 在门禁的 `includePrerelease: true` 下把排序高于 `0.2.0` 的预发布一并接纳），所以这次不是修 bug，而是把已验证版本写明。
- **peer 范围显式加入 `0.2.1-alpha.1`**：`dsh.engines.dsh` 与 `peerDependencies['@deepseek-ai/dsh-settings']` 改为 `>=0.1.7-alpha.2 <0.2.0-0 || 0.2.0-rc.1 || 0.2.0-rc.2 || 0.2.1-alpha.1 || >=0.2.0 <0.3.0`。加入后 `0.2.1-alpha.1` 在 node-semver 默认规则与门禁的 `includePrerelease` 规则下**都**接纳（此前只靠后者）；`0.2.1-alpha.2` 等后续预发布仍由尾段在门禁侧接纳，`0.2.0`/`0.2.1` 正式版照常接纳，`0.3.0` 仍在大门外。
- **真实 profile 端到端实测**：`dsh --profile web --dump-config` 退出码 0、**stderr 零 skip 警告**；`dsh-quick-replies` 条目存在且未被禁用，`config.items` 完整呈现用户自定义条目，说明宿主半边被 import 且 schemastery Config 解析成功（profile 里当时装的是 `0.1.8`）。
- **rc.2 → 0.2.1-alpha.1 源码逐项核对，插件消费的契约全部未变**：`ui-conversation` 的 `contract/slots.ts` 里 `conversation.input.dock` 声明未变（`kind:'list'`、`scope:'session'`、owner `InputZone`）；`packages/client/web/src/seed.ts` 的客户端静态模块表未变，仍与 `tsdown.config.ts` 的 9 个平台模块一一对应；`input/service.ts` 的 `prompt(content, mode, signal, requestId)` 调用点未变；`InputState.phase` 四个取值逐字未变；`SessionInput.state`、`contract/composer-blocks.ts` 的 `storeFor(sessionId)` 未变；`packages/settings/settings` 与 `ui-settings` 只改 README；`settings.configure(presentation, owner)` 两版同在 `settings/src/index.ts:266`；harness 的 `packages/client/tsdown.client.ts` 的 banner/intro/footer 契约未变（只改了一处文档注释），插件 client bundle 的 `window.__ModuleLoader__.load({id, factory})` + `var module = { exports: {} }` 写法仍成立。
- **本版唯一的破坏性客户端契约改动不影响本插件**：新增草稿文档模型（`DraftSnapshot`/`DraftInput`/`DraftReference`），并把 `ConversationSessionInjected.bindDraftMirror(write:(text)=>void)` 改名为 `bindDraftPersistence(write:(draft: DraftSnapshot)=>void)`、`ConversationStoreState.draft` 由 `string` 变 `DraftInput`——这些都在 session-injected 插槽契约上，而本插件只注册 `conversation.input.dock`、从不改写草稿，公开的 `SessionInput.setDraft(text: string)` 签名也未变。官方另两条「需更新」说明同样不适用：移除运行时 invariant 插件与 `./invariant` 导出（本插件无此入口）、输入区统计拆为 `activity`/`usage`（本插件不注册 `stats` 行）。
- **样式认领修复（「启停插件时其他插件样式被移除」）对本插件安全**：`modules/src/client/system.ts` 的 `claimStyles` 现在只认领「factory 运行前不存在」的 `style:not([data-plugin])`；本插件 `installStyles()` 自建标签时立即写 `data-plugin`，属预标记，走 `style[data-plugin="<id>"]` 的 owned 路径，新旧行为一致。
- **文档**：两份 README 重写为短句讲重点（删掉 `0.1.7` 在 `rc.2` 上的长篇归因、逐字节契约论证与规则矩阵），兼容表每行一句话；`docs/releases/v0.1.9.md` 按现行版式写（双语锚点 + 一句话 + 三条要点 + 升级命令）。
- **`devDependencies` 的 `@deepseek-ai/dsh-settings` 钉到 `0.2.1-alpha.1`**：本仓库类型检查从「直接针对 `0.2.0-rc.2`」升级为「直接针对 `0.2.1-alpha.1`」。98 项测试全部通过（含按 harness 方式装载 `lib/` 产物的 lane）。

## 0.1.8 — 2026-09-30

Verified DeepSeek Harness: `0.2.0-rc.2`（2026-09-30 发布；npm dist-tag `next`），同时保持对 `0.2.0-rc.1` 与整条 `0.1.7` 线（`0.1.7-rc.2` / `0.1.7-rc.1` / `0.1.7-alpha.2`）的兼容声明。

**本版适配 DSH `0.2.0-rc.2`：运行时接口对本插件零破坏，业务代码与 `0.1.7` 完全相同——从 `0.1.7` 升级无需迁移数据、无需改配置。改动只有版本声明与文档。同时修掉了 `0.1.7` 在 `rc.2` 上被 profile 门禁拒载（快捷栏消失）的问题。**

- **问题定位：坏掉的是 npm 上的 `latest`，不是 profile 里那份旧版。** `0.1.7` 的 peer 上界 `<0.2.0-0` 是当时刻意用来挡未经验证的 `0.2.0-rc.2` 的；DSH 升到 `0.2.0-rc.2` 后，`0.2.0-rc.2` 既不等于 `0.2.0-rc.1` 也不小于 `0.2.0-0`，`@deepseek-ai/dsh-settings` 这个 peer 判定不满足，整个 bundle 被跳过。而本机 profile 里锁的是 `0.1.6`（范围 `>=0.1.7-alpha.2 <0.2.0`），它的通过**只是因为门禁用 `semver.satisfies(..., { includePrerelease: true })` 比对，该规则下 `<0.2.0` 会接纳 `0.2.0-rc.2`**；换成 node-semver 默认规则同样不接纳。所以任何 `pnpm update` 或新装拿到 `0.1.7` 的用户都会丢插件。
- **peer 范围显式加入 `0.2.0-rc.2`**。`dsh.engines.dsh` 与 `peerDependencies['@deepseek-ai/dsh-settings']` 改为 `>=0.1.7-alpha.2 <0.2.0-0 || 0.2.0-rc.1 || 0.2.0-rc.2 || >=0.2.0 <0.3.0`。**新范围的接纳表在 node-semver 默认规则与门禁的 `includePrerelease` 规则下完全一致**——这是相对 `0.1.6`（只在宽松规则下接纳 `rc.2`）与 `0.1.7`（两种规则下都不接纳 `rc.2`）的实质改进，声明终于与事实对齐。`0.2.0-rc.3` 等未验证预发布仍留在门外（`❌/❌`），`0.2.0` 正式版及 `0.2.x` 仍接纳。
- **用 DSH 自带的门禁函数实测**（`@deepseek-ai/dsh-app-boot` 的 `evaluatePluginCompatibility`，不是复刻逻辑）：`0.1.8` 的 manifest → 通过；npm 上 `0.1.7` 的 manifest → 判定不兼容（复现本次要修的现象）。
- **rc.1 → rc.2 源码逐项核对，本插件依赖的接口都没有不兼容变更**：`ui-conversation` 的 `contract/` 目录**零 diff**（`conversation.input.dock` 插槽契约不变）；`packages/client/web/src/seed.ts` 的 9 个平台模块表**零 diff**（与 `tsdown.config.ts` 基线一一对应，`window.__ModuleLoader__` 协议不变）；`ctx.configForms` 仍是官方设置通道且 `ui-settings` 的 `src/` 零 diff（`settingsScope` 仍不存在）；`settings/document-updated` 仍在发、仍在事件表里；会话 `prompt(content, mode, signal, requestId)` 的调用点与 `api/session-controller` 的 `src/` 均未变；`api/remotes` 只有增量（新增 `userQuestionsRemote`）。平台基线里唯一实质改动是 `ui-primitives`（`Input` 改 `forwardRef`、新增 `MenuGroup`、一处图标画法微调），本插件客户端半边不 import 这些模块（只用注入的平台 `require`），且 `forwardRef` 化对既有调用方向后兼容。
- **`dsh.compatibility.dshReleases` 记录 `0.2.0-rc.2`**，保留原有四条记录。
- **`devDependencies` 的 `@deepseek-ai/dsh-settings` 钉到 `0.2.0-rc.2`**：本仓库类型检查从「直接针对 `0.2.0-rc.1`」升级为「直接针对 `0.2.0-rc.2`」。98 项测试全部通过（含按 harness 方式装载 `lib/` 产物的 lane），`pnpm build` 产出三件套。
- **本次未做端到端装载实测**：`dsh --profile web --dump-config` 看到本条目无 skipping、快捷栏真的渲染出来，需要 profile（`~/.dsh`）里装到 `0.1.8` 之后才能做，改动 `~/.dsh` 不在本仓库范围内；上面那条门禁实测用的是 DSH 自己的判定函数，结论等价。`docs/releases/v0.1.8.md` 里对此有明确标注。

## 0.1.7 — 2026-09-29

Verified DeepSeek Harness: `0.2.0-rc.1`（2026-09-28 发布），同时保持对 `0.1.7-rc.2` / `0.1.7-rc.1` / `0.1.7-alpha.2` 的兼容声明。

**本版适配 DSH `0.2.0-rc.1`：运行时接口对本插件零破坏，代码与 `0.1.6` 完全相同——从 `0.1.6` 升级无需迁移数据、无需改配置。改动只有版本声明与文档。**

- **逐项核对了 0.2.0-rc.1 的实际产物与源码**，本插件依赖的接口都没有不兼容变更：
  - `conversation.input.dock` 插槽仍是 `kind: "list"`、`scope: "session"`、owner `InputZone`（`ui-conversation` 的 `contract/slots.ts`）；
  - 客户端静态模块表（`packages/client/web/src/seed.ts`）与本插件 `tsdown.config.ts` 的 9 个平台模块逐一对应（react / react-dom / cordis / client-store / ui-slots / ui-primitives / ui-dockkit 等），`window.__ModuleLoader__` 注册协议不变；
  - `ctx.configForms` 仍是官方设置通道（`ui-settings` 包仍在使用），`@deepseek-ai/dsh-settings` 的 `SettingsNamespace` / `volatile` / `SettingsProvider.configure` 类型契约未变（本仓库 typecheck 直接针对 `0.2.0-rc.1` 通过）；
  - `settings/document-updated` 事件仍在 settings 包事件表中，局域网兜底不受影响；
  - 会话 `session.prompt(content, mode, signal, requestId)` 签名未变（`ui-conversation` 的 `service.ts` 仍以相同参数调用）。
- **profile 门禁实测通过**：`dsh --profile web --dump-config` 中 `dsh-quick-replies` 0.1.6 正常装载，无 skipping 警告（0.2.0-rc.1 起门禁以 `semver.satisfies(..., { includePrerelease: true })` 检查 `@deepseek-ai/dsh-*` peer）。
- **peer 范围显式声明 0.2 线**。`dsh.engines.dsh` 与 `peerDependencies['@deepseek-ai/dsh-settings']` 从 `>=0.1.7-alpha.2 <0.2.0` 扩为 `>=0.1.7-alpha.2 <0.2.0-0 || 0.2.0-rc.1 || >=0.2.0 <0.3.0`：旧范围在 node-semver 默认预发布规则下并不接纳 `0.2.0-rc.1`（没有比较符写 `0.2.0` 元组），只是 DSH 门禁的 `includePrerelease` 放行了它；新范围把意图写明——显式接纳已验证的 `0.2.0-rc.1` 与将来的 `0.2.x` 正式版，同时用 `<0.2.0-0` 挡住未经验证的 `0.2.0-rc.2` 等预发布。`0.1.7` 线的接纳行为与之前完全一致（已用 semver 逐版本验证）。
- **`dsh.compatibility.dshReleases` 记录 `0.2.0-rc.1`**，保留原有三条 `0.1.7` 线记录。
- **`devDependencies` 的 `@deepseek-ai/dsh-settings` 钉到 `0.2.0-rc.1`**：本仓库类型检查从「等价于 rc.2」升级为「直接针对 0.2.0-rc.1」。98 项测试全部通过。

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
