import "./footer.scss"
import React from "react";
import { observer } from "mobx-react";
import { getExtensionUrl, paypalLink } from "../../common-vars";
import { prevDefault } from '../../utils'
import { getManifest } from '../../extension'
import { getMessage } from "../../i18n";
import { Icon } from "../icon";

interface ShareIcon {
  title: string
  icon: string
  url: string
}

@observer
export class Footer extends React.Component {
  private appName = getManifest().name;
  private shareTags = ["chrome", "extension", "xtranslate", "in_place_text_translator", "ai_text_translations"];
  private shareIcons: ShareIcon[] = [
    {
      title: "X (Twitter)",
      icon: require('../icon/x.svg'),
      url: "https://twitter.com/intent/tweet?url={url}&text={title}&hashtags={tags}",
    },
  ];

  shareUrl(url: string) {
    window.open(url, "share", "width=650,height=550,resizable=1");
  }

  private makeShareUrl(socialNetworkURLMask: string) {
    const params: Record<string, string> = {
      url: getExtensionUrl(),
      title: [this.appName, getMessage("short_description")].join(' - '),
      tags: this.shareTags.join(','),
    };

    return socialNetworkURLMask.replace(/\{(.*?)}/g, (matchedParamMask, paramName) => {
      return encodeURIComponent(params[paramName]);
    });
  }

  render() {
    return (
      <div className="Footer flex gaps">
        <div className="social-icons">
          {getMessage("share_with_friends")}:
          {this.shareIcons.map((share, i) => {
            const url = this.makeShareUrl(share.url);
            return (
              <a key={i} href={url} onClick={prevDefault(() => this.shareUrl(url))}>
                <Icon small svg={share.icon} title={share.title}/>
              </a>
            )
          })}
        </div>
        <a className="support box right noshrink flex gaps align-center" href={paypalLink} target="_blank">
          <Icon material="rocket_launcher" small/>
          <span className="text">{getMessage("donate_title")}</span>
        </a>
      </div>
    );
  }
}
