import * as styles from "./react-select.module.scss";
import React from "react";
import { cssNames } from "../../utils";
import ReactSelectComponent, { GroupBase, Props, PropsValue, OptionsOrGroups, SelectInstance } from "react-select";

export { FormatOptionLabelMeta } from "react-select";

export type ReactSelectGroup<T> = GroupBase<ReactSelectOption<T>>

export interface ReactSelectOption<T = unknown> {
  value: T;
  label?: React.ReactNode;
  isDisabled?: boolean;
  isSelected?: boolean;
}

export interface ReactSelectProps<Value> extends Omit<Props, "onChange"> {
  menuNowrap?: boolean; /* default: true*/
  menuPositionHorizontal?: "left" | "right" | "auto"; /*default: auto*/
  value: PropsValue<ReactSelectOption<Value>>;
  options: OptionsOrGroups<ReactSelectOption<Value>, ReactSelectGroup<Value>>;
  onChange?(value: ReactSelectOption<Value>): void;
}

export function ReactSelect<T>(props: ReactSelectProps<T>) {
  const classNamePrefixGlobal = "XTranslateReactSelect";
  const selectRef = React.useRef<SelectInstance>(null);
  const {
    className,
    classNamePrefix,
    menuNowrap = true,
    menuPositionHorizontal = "auto",
    menuPlacement = "auto",
    ...selectProps
  } = props;

  function onMenuOpen() {
    window.requestAnimationFrame(() => {
      props.onMenuOpen?.();
      scrollToSelectedOption();
      if (menuPositionHorizontal === "auto") adjustHorizontalPosition();
    });
  }

  function scrollToSelectedOption() {
    const selectedOptElem = selectRef.current.menuListRef.querySelector(`.${classNamePrefixGlobal}__option--is-selected`);
    selectedOptElem?.scrollIntoView({ block: "nearest" });
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
      menuPlacement={menuPlacement}
      className={cssNames(styles.ReactSelect, className)}
      classNamePrefix={cssNames(classNamePrefixGlobal, classNamePrefix)}
      classNames={{
        control: () => styles.control,
        menu: () => cssNames(styles.menu, {
          [styles.menuNoWrap]: menuNowrap,
          [styles.menuRight]: menuPositionHorizontal === "right",
        }),
        menuList: () => styles.menuList,
        input: () => styles.inputContainer,
        placeholder: () => styles.placeholder,
        singleValue: () => styles.singleValue,
        option: () => styles.option,
        dropdownIndicator: () => styles.dropdownIndicator,
      }}
      onMenuOpen={onMenuOpen}
      ref={selectRef}
    />
  );
}
