import * as styles from "./select-locale.module.scss"

import React from "react";
import { cssNames, IClassName } from "../../utils";
import { Menu, MenuItem } from "../menu";
import { Icon } from "../icon";
import { availableLocales, getLocale, Locale, setLocale } from "../../i18n";

export interface LocaleSelectProps {
  id?: string; // DOM Element.id (default: "select_locale")
  className?: IClassName;
  menuClassName?: IClassName;
}

export class SelectLocale extends React.Component<LocaleSelectProps> {
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

        <Menu htmlFor={id} className={cssNames(styles.Menu, menuClassName)}>
          {Object.entries(availableLocales).map(([locale, langName]) => {
            const isSelected = getLocale() === locale;
            return (
              <MenuItem key={locale} disabled={isSelected} onClick={() => setLocale(locale as Locale)}>
                {langName}
              </MenuItem>
            );
          })}
        </Menu>
      </div>
    )
  }
}
