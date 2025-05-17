import * as styles from "./react-select.module.scss";
import React from "react";
import { cssNames } from "../../utils";
import ReactSelectComponent, { GroupBase, Props, SelectInstance } from "react-select";

export { FormatOptionLabelMeta } from "react-select";

export type ReactSelectGroup<T> = GroupBase<ReactSelectOption<T>>

export interface ReactSelectOption<T = unknown> {
  value: T;
  label?: React.ReactNode;
  isDisabled?: boolean;
  isSelected?: boolean;
  isFocused?: boolean;
}

export interface ReactSelectProps<T> extends Omit<Props, "onChange"> {
  menuPositionHorizontal?: "auto" /*default*/ | "left" | "right";
  onChange?(value: ReactSelectOption<T>): void;
}

export function ReactSelect<T>(props: ReactSelectProps<T>) {
  const selectRef = React.useRef<SelectInstance>(null);
  const {
    className,
    classNamePrefix,
    menuPositionHorizontal = "auto",
    ...selectProps
  } = props;

  function onMenuOpen() {
    props.onMenuOpen?.();
    if (menuPositionHorizontal === "auto") {
      window.requestAnimationFrame(adjustHorizontalPosition);
    }
  }

  function adjustHorizontalPosition() {
    const menuElem = selectRef.current.menuListRef.closest(`.${styles.menu}`);
    const menuPos = menuElem.getBoundingClientRect();
    const isOutOfX = menuPos.right >= window.innerWidth;
    menuElem.classList.toggle(styles.menuRight, isOutOfX);
  }

  return (
    <ReactSelectComponent
      {...selectProps}
      className={cssNames(styles.ReactSelect, className)}
      classNamePrefix={cssNames("XTranslateReactSelect", classNamePrefix)}
      classNames={{
        control: () => styles.control,
        menu: () => cssNames(styles.menu, {
          [styles.menuRight]: menuPositionHorizontal === "right"
        }),
        menuList: () => styles.menuList,
        input: () => styles.inputContainer,
        singleValue: () => styles.singleValue,
        option: () => styles.option,
        dropdownIndicator: () => styles.dropdownIndicator,
      }}
      onMenuOpen={onMenuOpen}
      ref={selectRef}
    />
  );
}
