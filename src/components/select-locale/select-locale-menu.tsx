import styles from "./select-locale.module.scss"

import React from "react";
import { observable } from "mobx";
import { cssNames, IClassName } from "../../utils";
import { observer } from "mobx-react";
import { Menu, MenuItem } from "../menu";
import { availableLocales, getLocale, Locale, setLocale } from "../../i18n";
import { Icon } from "../icon";
import { Dialog } from "../dialog";

export interface LocaleSelectProps {
  id?: string; // DOM Element.id (default: "select_locale")
  className?: IClassName;
  menuClassName?: IClassName;
  dialogClassName?: IClassName;
}

@observer
export class SelectLocaleMenu extends React.Component<LocaleSelectProps> {
  private helpDialogTitle = "Help to translate app UI intro your own language"

  private showHelpLocalizeAppDialog = observable.box(false);

  renderBringYourNativeLocalizationDialog() {
    const englishLocaleSourceUrl = "https://github.com/ixrock/XTranslate/blob/master/_locales/en.ftl";

    return (
      <Dialog
        className={cssNames(styles.BringMoreLocalesDialog, styles.important, this.props.dialogClassName)}
        contentClassName="flex column gaps"
        isOpen={this.showHelpLocalizeAppDialog.get()}
        onClose={() => this.showHelpLocalizeAppDialog.set(false)}
      >
        <h4>{this.helpDialogTitle}</h4>
        <p>1) Copy English version of localization file from <a href={englishLocaleSourceUrl} target="_blank">Github source code</a></p>
        <p>2) Translate all source texts to your native language and send back to app author (e.g. by e-mail or via Github)</p>
        <p>Thanks in advance!</p>
      </Dialog>
    )
  }

  render() {
    const { className, id = "select_locale", menuClassName } = this.props;

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
          <MenuItem spacer/>
          <MenuItem className="flex box" onClick={() => this.showHelpLocalizeAppDialog.set(true)}>
            <span>Help</span>
            <Icon className="box right" small material="help_outline" tooltip={this.helpDialogTitle}/>
          </MenuItem>
        </Menu>

        {this.renderBringYourNativeLocalizationDialog()}
      </div>
    )
  }
}
