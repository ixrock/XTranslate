import * as styles from "./select-locale.module.scss"

import React from "react";
import { cssNames, IClassName } from "../../utils";
import { Menu, MenuItem } from "../menu";
import { Icon } from "../icon";
import { availableLocales, getLocale, Locale, setLocale } from "../../i18n";

export interface SelectLocaleIconProps {
  id?: string; // DOM Element.id (default: "select_locale")
  className?: IClassName;
  menuClassName?: IClassName;
}

export class SelectLocaleIcon extends React.Component<SelectLocaleIconProps> {
  render() {
    const {
      className, menuClassName,
      id = "select_locale_menu"
    } = this.props;

    return (
      <div className={cssNames(styles.SelectLocale, className)}>
        <Icon
          small
          id={id}
          material="language"
          interactive
        />

        <Menu anchorId={id} className={cssNames(styles.Menu, menuClassName)}>
          {Object.entries(availableLocales).map(([locale, { english, native }]) => {
            const isSelected = getLocale() === locale;
            return (
              <MenuItem className={styles.MenuItem} key={locale} disabled={isSelected} onClick={() => setLocale(locale as Locale)}>
                <em>{english}</em>
                <span>{english != native ? native : ""}</span>
              </MenuItem>
            );
          })}
        </Menu>
      </div>
    )
  }
}
