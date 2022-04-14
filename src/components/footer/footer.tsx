import styles from './footer.module.scss'
import React from 'react';
import { extensionUrl } from "../../common-vars";
import { prevDefault } from '../../utils'
import { getManifest } from '../../extension'
import { getMessage } from "../../i18n";

interface ShareIcon {
  title: string
  icon: string
  url: string
}

export class Footer extends React.Component {
  private manifest = getManifest();
  private shareTags = ["chrome", "extension", "xtranslate"];

  private shareIcons: ShareIcon[] = [
    {
      title: "Twitter",
      icon: require('../icon/twitter.svg'),
      url: [
        `https://twitter.com/intent/tweet?source=webclient`,
        `url=${extensionUrl}`,
        `text=${[this.manifest.name, getMessage("short_description")].join(' - ')}`,
        `hashtags=${this.shareTags.join(',')}`
      ].join("&")
    },
  ];

  shareUrl(url: string) {
    window.open(url, "share", "width=550,height=300,resizable=1");
  }

  render() {
    return (
      <div className={styles.Footer}>
        {getMessage("footer")}
        <span className={styles.socialIcons}>
            {this.shareIcons.map((share, i) =>
              <a key={i} href={share.url} onClick={prevDefault(() => this.shareUrl(share.url))}>
                <img src={share.icon} title={share.title} alt=""/>
              </a>
            )}
          </span>
      </div>
    );
  }
}
