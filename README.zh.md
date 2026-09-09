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

回复库保存在 DSH Host 全局设置命名空间 `quick-replies`，同一 Host 下多浏览器/设备共享。折叠偏好按当前浏览器分别记住。

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

安装后刷新 Web 界面。Host 半边通过 `cordis.patch.yml` 注册设置命名空间；客户端在 `conversation.input.dock` 挂载快捷栏。回复库写在 `~/.dsh/settings.yaml` 的 `quick-replies` 段，不属于插件安装目录。

## 使用

1. 打开任意已有会话（不要在空白新会话上点「继续」类条目）。
2. 输入区上方出现快捷回复栏。窄屏默认折叠，点标题或箭头展开。
3. 点击 chip 发送；空闲显示「已提交（队列）」，运行中显示将在下一步处理。
4. 点 **＋** 直接添加一条：填标题和正文，保存后栏上立刻出现。
5. 点 **⚙** 打开管理：编辑、删除、排序、导入/导出 JSON。

默认四条（可全部删掉，不会自动重生）：继续、中断了请继续、下一步该做什么？、已重启请继续。

## 兼容性

| 插件 | 验证过的 DeepSeek Harness |
| --- | --- |
| `0.1.0`–`0.1.1` | `0.1.2-rc.1` |

未列出的更新版本请自行验证。不兼容时禁用或卸载插件，不要给 DSH 核心打补丁。

## 卸载

```sh
dsh plugin --profile web remove dsh-quick-replies
```

卸载不会删除设置里的回复库。需要清库时，先在管理界面导出 JSON，再手动删除设置中的 `quick-replies` 命名空间。

## 开发

```sh
pnpm install
pnpm run test
pnpm run build
```

推送 `v*` 标签后，GitHub Actions 会跑测试、打包，并在配置了 `NPM_TOKEN` 时发布到 npm、创建 GitHub Release。

MIT，详见 [LICENSE](LICENSE)。
