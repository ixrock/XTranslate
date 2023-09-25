import styles from "./search-input.module.scss";

import React from "react";
import { observer } from "mobx-react";
import { Input, InputProps } from "./input";
import { Icon } from "../icon";
import { bindGlobalHotkey, cssNames, disposer, isHotkeyPressed, SimpleHotkey } from "../../utils";

export interface SearchInputProps extends InputProps {
  showSearchIcon?: boolean;
  globalHotkey?: SimpleHotkey | false;
  clearHotkey?: SimpleHotkey | false;
  onGlobalHotkey?(evt: KeyboardEvent): void;
  onClear?(evt: React.KeyboardEvent<any>): void;
}

const defaultProps: Partial<SearchInputProps> = {
  autoFocus: true,
  showSearchIcon: false,
  placeholder: "Search...",
  clearHotkey: { key: "Escape" },
  globalHotkey: {
    ctrlOrCmd: true,
    key: "KeyF",
  },
};

@observer
export class SearchInput extends React.Component<SearchInputProps> {
  static defaultProps = defaultProps as object as SearchInputProps;

  public input?: Input;
  private dispose = disposer();

  constructor(props: SearchInputProps) {
    super(props);
  }

  componentDidMount() {
    this.dispose.push(
      this.bindGlobalHotkey(),
    );
  }

  componentWillUnmount() {
    this.dispose();
  }

  private bindGlobalHotkey() {
    const { globalHotkey } = this.props;
    if (!globalHotkey) return;

    return bindGlobalHotkey(globalHotkey, (evt: KeyboardEvent) => {
      this.input?.focus();
      this.props.onGlobalHotkey?.(evt);
    });
  };

  onClear = (evt: React.KeyboardEvent<any>) => {
    this.props.onKeyDown?.(evt);

    const { clearHotkey, onClear } = this.props;

    if (!clearHotkey) {
      return;
    }

    if (isHotkeyPressed(clearHotkey, evt.nativeEvent)) {
      onClear?.(evt);
      this.clear();
      evt.stopPropagation();
    }
  };

  clear = () => {
    this.input?.setValue("");
  };

  bindRef = (inputRef: Input) => {
    this.input = inputRef;
  };

  render() {
    const {
      className,
      onClear,
      showSearchIcon,
      clearHotkey,
      globalHotkey,
      onGlobalHotkey,
      value,
      ...inputProps
    } = this.props;
    let rightIcon = showSearchIcon && <Icon className={styles.Icon} small material="search"/>;

    if (clearHotkey && value) {
      rightIcon = <Icon small className={styles.Icon} material="close" onClick={this.clear}/>;
    }

    return (
      <Input
        {...inputProps}
        className={cssNames(styles.SearchInput, className)}
        value={value}
        onKeyDown={this.onClear}
        iconRight={rightIcon}
        ref={this.bindRef}
      />
    );
  }
}
