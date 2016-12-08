// Helper for working with keyboard hotkeys

export interface Hotkey {
  altKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
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

  var key = String.fromCharCode(hotkey.keyCode);
  var data = metaKeys.concat({ char: key, title: key });
  return {
    key: key,
    metaKeys: metaKeys,
    value: data.map(d => d.char).join(""),
    title: data.map(d => d.title).join("+")
  };
}

export function getHotkey(e: KeyboardEvent) {
  var hotkey: Hotkey = { keyCode: e.keyCode };
  if (e.altKey) hotkey.altKey = true;
  if (e.ctrlKey) hotkey.ctrlKey = true;
  if (e.metaKey) hotkey.metaKey = true;
  if (e.shiftKey) hotkey.shiftKey = true;
  return hotkey;
}