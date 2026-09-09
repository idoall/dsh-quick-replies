/**
 * dsh-quick-replies — tiny bilingual dictionary (zh/en).
 *
 * The plugin renders static strings from one dictionary and picks the language
 * from the browser at render time; user data (labels/bodies) is never
 * translated. {param} placeholders are interpolated without any template
 * execution.
 */
export type Lang = 'zh' | 'en'

function detectLang(): Lang {
  try {
    const raw = typeof navigator !== 'undefined' ? navigator.language : 'en'
    return raw.toLowerCase().startsWith('zh') ? 'zh' : 'en'
  } catch {
    return 'en'
  }
}

export const LANG: Lang = detectLang()

type Entry = { zh: string; en: string }
type Dict = Record<string, Entry>

export const dict: Record<string, Entry> = {
  // Bar title / collapse
  'bar.title': { zh: '快捷回复', en: 'Quick replies' },
  'bar.count': { zh: '快捷回复（{n}）', en: 'Quick replies ({n})' },
  'bar.collapsed.summary': { zh: '快捷回复（{n}），已折叠', en: 'Quick replies ({n}), collapsed' },
  'bar.expand': { zh: '展开快捷回复', en: 'Expand quick replies' },
  'bar.collapse': { zh: '收起快捷回复', en: 'Collapse quick replies' },
  'bar.add': { zh: '添加', en: 'Add' },
  'bar.manage': { zh: '管理', en: 'Manage' },
  'bar.send.aria': { zh: '发送：{label}', en: 'Send: {label}' },
  'bar.status.submitting': { zh: '正在提交…', en: 'Submitting…' },
  'bar.status.sent.queue': { zh: '已提交（队列）', en: 'Submitted (queue)' },
  'bar.status.sent.steer': { zh: '已提交（将在下一步处理；实际时机由 DSH 决定）', en: 'Submitted (handled at the next safe boundary; timing is decided by DSH)' },
  'bar.status.failure.business': { zh: '发送被会话拒绝：{detail}', en: 'The session refused the request: {detail}' },
  'bar.status.failure.unknown': { zh: '发送结果未确认，请先检查会话。插件不会自动重发。', en: 'Send outcome unconfirmed — please check the session. Nothing was auto-retried.' },
  'bar.status.failure.cancelled': { zh: '发送被取消；如不确定请先检查会话再重试。', en: 'Send was cancelled; check the session before retrying.' },
  'bar.blocked.composer': { zh: '当前输入被禁用，无法发送快捷回复', en: 'Message input is disabled — quick replies cannot be sent' },
  'bar.blocked.disconnected': { zh: '未连接到 DSH，无法发送', en: 'Not connected to DSH — cannot send' },
  'bar.note.subagent': { zh: '子代理会话不支持快捷回复', en: 'Quick replies are not supported in subagent sessions' },
  'bar.note.unavailable': { zh: '回复库不可用，无法发送', en: 'Reply library unavailable' },
  'bar.note.blank': { zh: '当前会话还没有历史消息：请先发送一条消息或切换到已有会话，再使用快捷回复', en: 'This conversation has no history yet — send a first message or switch to an existing conversation before using quick replies' },
  'bar.note.loading': { zh: '加载中…', en: 'Loading…' },
  'bar.note.storage.problem': { zh: '存储数据无效，使用最近确认的内容（只读）', en: 'Stored data is unusable — showing the last confirmed content (read-only)' },
  // Management
  'manage.title': { zh: '管理快捷回复', en: 'Manage quick replies' },
  'manage.count': { zh: '{n} 条（共 {limit}）', en: '{n} of {limit}' },
  'manage.empty': { zh: '没有条目。点击“添加”创建一条。', en: 'No replies yet. Use Add to create one.' },
  'manage.edit': { zh: '编辑', en: 'Edit' },
  'manage.delete': { zh: '删除', en: 'Delete' },
  'manage.delete.confirm': { zh: '删除“{label}”？', en: 'Delete “{label}”? ' },
  'manage.delete.confirmHint': { zh: '此操作不可撤销。', en: 'This cannot be undone.' },
  'manage.moveUp': { zh: '上移', en: 'Move up' },
  'manage.moveDown': { zh: '下移', en: 'Move down' },
  'manage.enable': { zh: '启用', en: 'Enable' },
  'manage.disable': { zh: '停用', en: 'Disable' },
  'manage.enabled.label': { zh: '已启用', en: 'Enabled' },
  'manage.disabled.label': { zh: '已停用', en: 'Disabled' },
  'manage.close': { zh: '关闭', en: 'Close' },
  'form.addTitle': { zh: '添加快捷回复', en: 'Add quick reply' },
  'form.editTitle': { zh: '编辑快捷回复', en: 'Edit quick reply' },
  'form.label': { zh: '标题', en: 'Label' },
  'form.label.hint': { zh: '1–{max} 个字符，显示在快捷栏', en: '1–{max} characters, shown in the bar' },
  'form.content': { zh: '正文（点击后原样发送）', en: 'Body (sent verbatim on click)' },
  'form.content.hint': { zh: '1–{max} 个字符', en: '1–{max} characters' },
  'form.enabled': { zh: '启用此条目', en: 'Enable this reply' },
  'form.save': { zh: '保存', en: 'Save' },
  'form.discard': { zh: '放弃未保存改动', en: 'Discard unsaved changes' },
  'form.keepEditing': { zh: '继续编辑', en: 'Keep editing' },
  'form.saveOnlyHint': { zh: '保存只添加/更新，不会发送。', en: 'Saving only adds/updates — it never sends.' },
  'form.cancel': { zh: '取消', en: 'Cancel' },
  'form.issue.label.too-long': { zh: '标题最多 {max} 个字符', en: 'Label must be at most {max} characters' },
  'form.issue.content.too-long': { zh: '正文最多 {max} 个字符', en: 'Body must be at most {max} characters' },
  'form.issue.content.blank': { zh: '正文不能为空或全空白', en: 'Body must not be blank' },
  'form.issue.label.blank': { zh: '标题不能为空', en: 'Label must not be empty' },
  'form.issue.duplicate-label': { zh: '标题已存在', en: 'A reply with this label already exists' },
  'form.saveFailed': { zh: '保存失败：{detail}', en: 'Save failed: {detail}' },
  'form.conflict.notice': { zh: '回复库已在其他设备上被修改。你的改动未保存。请查看最新列表后重新确认。', en: 'The library changed on another device. Your edit was not saved — review the latest list, then confirm again.' },
  'form.conflict.retry': { zh: '重新确认保存', en: 'Confirm and save again' },
  'form.saved.ok': { zh: '已保存', en: 'Saved' },
  'import.title': { zh: '导入快捷回复（JSON）', en: 'Import quick replies (JSON)' },
  'import.paste.hint': { zh: '粘贴导出文件的内容（UTF-8，≤1 MiB）', en: 'Paste the contents of an exported file (UTF-8, ≤ 1 MiB)' },
  'import.preview': { zh: '预览', en: 'Preview' },
  'import.review': { zh: '将导入 {in} 条，覆盖当前 {current} 条回复。', en: 'Import {in} replies, replacing the current {current}.' },
  'import.confirm.replace': { zh: '确认替换本回复库', en: 'Replace the library' },
  'import.issue.json-parse': { zh: '不是有效的 JSON', en: 'Not valid JSON' },
  'import.issue.too-large': { zh: '文件超过 1 MiB 上限', en: 'File exceeds the 1 MiB limit' },
  'import.issue.unsupported-version': { zh: '不支持的版本（{version}），只读', en: 'Unsupported schema version ({version}) — read-only' },
  'import.replaced.ok': { zh: '已替换为 {n} 条', en: 'Replaced with {n} replies' },
  'import.back': { zh: '返回', en: 'Back' },
  'export.label': { zh: '导出 JSON', en: 'Export JSON' },
  'export.done': { zh: '已导出 {n} 条', en: 'Exported {n} replies' },
  'storage.note.memory': { zh: '只读（当前浏览器为内存模式，无法持久化）', en: 'Read-only — this browser is in memory mode and cannot persist' },
  'storage.note.readonly': { zh: '只读（设置不可写）', en: 'Read-only (settings are not writable)' },
  'storage.note.unavailable': { zh: '设置服务不可用', en: 'Settings service unavailable' },
  'storage.note.unsupported-version': { zh: '库版本过新，仅可查看（只读）', en: 'Library schema version is newer — read-only' },
  'storage.note.invalid-section': { zh: '存储数据无效，仅可查看（只读）', en: 'Stored library is invalid — read-only' },
  'issue.too-many-items': { zh: '条目超过 {max} 条上限', en: 'More than {max} replies' },
  'issue.item-id-invalid': { zh: '条目 id 格式无效', en: 'An item id is invalid' },
  'issue.item-id-not-unique': { zh: '条目 id 重复', en: 'Duplicate item id' },
  'issue.item-label-invalid': { zh: '条目标题无效', en: 'Invalid item label' },
  'issue.item-content-invalid': { zh: '条目正文无效', en: 'Invalid item body' },
  'issue.item-enabled-invalid': { zh: '条目启用状态无效', en: 'Invalid item enabled flag' },
  'issue.generic': { zh: '数据不符合要求：{code}', en: 'Data does not meet the requirements: {code}' },
}

export function t(key: string, params?: Record<string, string | number>): string {
  const entry = dict[key]
  if (entry === undefined) return key
  let text = entry[LANG] ?? entry.en
  if (params !== undefined) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value))
    }
  }
  return text
}
