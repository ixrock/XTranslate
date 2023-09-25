// Helper for working with keyboard hotkeys
import type React from "react";

export interface Hotkey {
  code: string
  altKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  /**
   * @deprecated
   */
  keyCode?: number;
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

  var code = normalizeKeyboardCode(hotkey.code);
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

export interface SimpleHotkey {
  ctrlOrCmd?: boolean; // for mac envs "cmd" key used instead
  shift?: boolean;
  alt?: boolean;
  key: string; // e.g. "KeyF"
}

export function isHotkeyPressed(hotkey: SimpleHotkey, evt: KeyboardEvent | React.KeyboardEvent): boolean {
  const { ctrlOrCmd, alt, shift, key } = hotkey;
  const conditions = [
    () => (ctrlOrCmd ? (evt.metaKey /*mac*/ || evt.ctrlKey) : true),
    () => (alt ? evt.altKey : true),
    () => (shift ? evt.shiftKey : true),
    () => evt.code.toLowerCase() === key.toLowerCase(),
  ];

  return conditions.map((check) => check()).every(Boolean);
}

export function bindGlobalHotkey(hotkey: SimpleHotkey, callback?: (evt: KeyboardEvent) => void) {
  if (!hotkey) return Function; // noop

  const onGlobalKey = (evt: KeyboardEvent) => {
    if (isHotkeyPressed(hotkey, evt)) {
      callback?.(evt);
      evt.preventDefault();
    }
  };

  window.addEventListener("keydown", onGlobalKey);

  return () => window.removeEventListener("keydown", onGlobalKey);
}
