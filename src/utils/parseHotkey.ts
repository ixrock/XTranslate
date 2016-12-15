// Helper for working with keyboard hotkeys

export interface Hotkey {
  altKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  code?: string
  keyCode: number
}

interface HotkeyChunk {
  char: string,
  title: string
}

export function parseHotkey(hotkey: Hotkey) {
  var metaKeys: HotkeyChunk[] = [];
  if (hotkey.metaKey) metaKeys.push({ char: '⌘', title: "Cmd" });
  if (hotkey.ctrlKey) metaKeys.push({ char: '⌃', title: "Ctrl" });
  if (hotkey.altKey) metaKeys.push({ char: '⌥', title: "Alt" });
  if (hotkey.shiftKey) metaKeys.push({ char: '⇧', title: "Shift" });

  var code = normalizeKeyboardCode(hotkey.code) || String.fromCharCode(hotkey.keyCode);
  var data = metaKeys.concat({ char: code, title: code });
  return {
    code: !code.match(/Control|Meta|Alt|Shift|Tab|Enter/) ? code : null,
    metaKeys: metaKeys,
    value: data.map(d => d.char).join(""),
    title: data.map(d => d.title).join("+")
  };
}

export function getHotkey(e: KeyboardEvent) {
  var hotkey: Hotkey = {
    keyCode: e.keyCode,
    code: normalizeKeyboardCode(e.code),
  };
  if (e.altKey) hotkey.altKey = true;
  if (e.ctrlKey) hotkey.ctrlKey = true;
  if (e.metaKey) hotkey.metaKey = true;
  if (e.shiftKey) hotkey.shiftKey = true;
  return hotkey;
}

function normalizeKeyboardCode(code: string) {
  if (!code) return "";
  code = code.replace(/Key([A-Z])/, '$1');
  code = code.replace(/Digit(\d+)/, '$1');
  code = code.replace(/(Control|Alt|Shift|Meta)(Left|Right)/, '$1');
  return code;
}