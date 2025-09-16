import "./footer.scss"
import React from "react";
import { observer } from "mobx-react";
import { getExtensionUrl } from "@/config";
import { getManifest } from '@/extension'
import { getMessage } from "@/i18n";
import { Icon } from "../icon";
import { CopyToClipboardIcon } from "../copy-to-clipboard-icon";
import { mellowtelDialogVisibility } from "../../../mellowtel";

@observer
export class Footer extends React.Component {
  private appName = getManifest().name;

  private shareTags = [
    "ChromeExtension", "BrowserAddon", "TextTranslator", "PageTranslator",
    "BrowserExtension", "LearnLanguages", "TextToSpeech",
    "GoogleTranslate", "BingTranslator", "AILanguageTranslation",
    this.appName,
  ];

  get shareText() {
    return [
      `${this.appName} - ${getMessage("short_description")}`,
      "",
      `${this.shareTags.map(tag => `#` + tag).join(' ')}`,
      "",
      getExtensionUrl(),
    ].join("\n");
  }

  supportDevelopers(){
    mellowtelDialogVisibility.set(true);
  }

  render() {
    return (
      <div className="Footer flex gaps">
        <div className="social-icons">
          {getMessage("share_with_friends")}:{" "}
          <CopyToClipboardIcon iconName="share" content={this.shareText}/>
        </div>
        <a className="support box right noshrink flex gaps align-center" onClick={this.supportDevelopers}>
          <Icon material="rocket_launcher" small/>
          <span className="text">{getMessage("support_developers")}</span>
        </a>
      </div>
    );
  }
}