import * as styles from './footer.module.scss'
import React from "react";
import { observer } from "mobx-react";
import { getExtensionUrl } from "../../common-vars";
import { prevDefault } from '../../utils'
import { getManifest } from '../../extension'
import { getMessage } from "../../i18n";
import { Icon } from "../icon";

interface ShareIcon {
  title: string
  icon: string
  url: string
}

export const shareIcons: ShareIcon[] = [
  {
    title: "X (Twitter)",
    icon: require('../icon/x.svg'),
    url: "https://twitter.com/intent/tweet?url={url}&text={title}&hashtags={tags}",
  },
  {
    title: "Facebook",
    icon: require('../icon/fb.svg'),
    url: "https://www.facebook.com/sharer/sharer.php?u={url}&title={title}&quote={tags}",
  },
  {
    title: "VK",
    icon: require('../icon/vk.svg'),
    url: "https://vk.com/share.php?url={url}&title={title}",
  },
  {
    title: "LinkedIn",
    icon: require('../icon/linked.svg'),
    url: "https://www.linkedin.com/shareArticle?url={url}",
  },
  {
    title: "Reddit",
    icon: require('../icon/reddit.svg'),
    url: "https://www.reddit.com/submit?url={url}&title={title}",
  },
];

export const shareTags = ["chrome", "extension", "xtranslate", "in_place_text_translator", "ai_text_translations"];

@observer
export class Footer extends React.Component {
  private manifest = getManifest();

  shareUrl(url: string) {
    window.open(url, "share", "width=650,height=550,resizable=1");
  }

  private makeShareUrl(socialNetworkURLMask: string) {
    const params: Record<string, string> = {
      url: getExtensionUrl(),
      title: [this.manifest.name, getMessage("short_description")].join(' - '),
      tags: shareTags.join(','),
    };

    return socialNetworkURLMask.replace(/\{(.*?)}/g, (matchedParamMask, paramName) => {
      return encodeURIComponent(params[paramName]);
    });
  }

  render() {
    return (
      <div className={styles.Footer}>
        <p>{getMessage("share_with_friends")}</p>

        <div className={styles.socialIcons}>
          {shareIcons.map((share, i) => {
            const url = this.makeShareUrl(share.url);
            return (
              <a key={i} href={url} onClick={prevDefault(() => this.shareUrl(url))}>
                <Icon small svg={share.icon} title={share.title}/>
              </a>
            )
          })}
        </div>
      </div>
    );
  }
}
