import "./footer.scss"
import React from "react";
import { observer } from "mobx-react";
import { getExtensionUrl, paypalLink } from "../../common-vars";
import { getManifest } from '../../extension'
import { getMessage } from "../../i18n";
import { Icon } from "../icon";
import { CopyToClipboardIcon } from "../copy-to-clipboard-icon";

@observer
export class Footer extends React.Component {
  private appName = getManifest().name;

  private shareTags = [
    "browser-extension", "browser-addon",
    "text-translator", "page-translator",
    "learn-languages", "productivity",
    "chrome", "ms-edge",
    this.appName.toLowerCase(),
  ];

  get shareText() {
    return [
      `${this.appName} - ${getMessage("short_description")}`,
      `${this.shareTags.map(tag => `#` + tag).join(' ')}`,
      "",
      getExtensionUrl(),
    ].join("\n");
  }

  render() {
    return (
      <div className="Footer flex gaps">
        <div className="social-icons">
          {getMessage("share_with_friends")}:{" "}
          <CopyToClipboardIcon iconName="share" content={this.shareText}/>
        </div>
        <a className="support box right noshrink flex gaps align-center" href={paypalLink} target="_blank">
          <Icon material="rocket_launcher" small/>
          <span className="text">{getMessage("donate_title")}</span>
        </a>
      </div>
    );
  }
}
