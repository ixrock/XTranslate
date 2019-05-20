import './footer.scss'

import * as React from 'react';
import { autobind, prevDefault } from '../../utils'
import { __i18n, getManifest } from '../../extension'
import { config } from "../../config";

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
      title: "VK.com",
      icon: require('../icon/vk.svg'),
      url: `http://vkontakte.ru/share.php?url=${config.storeUrl}`,
    },
    {
      title: "Facebook",
      icon: require('../icon/facebook.svg'),
      url: `https://www.facebook.com/sharer/sharer.php?u=${config.storeUrl}`,
    },
    {
      title: "Twitter",
      icon: require('../icon/twitter.svg'),
      url: [
        `https://twitter.com/intent/tweet?source=webclient`,
        `url=${config.storeUrl}`,
        `text=${[this.manifest.name, __i18n("short_description")].join(' - ')}`,
        `hashtags=${this.shareTags.join(',')}`
      ].join("&")
    },
  ];

  @autobind()
  share(url: string) {
    window.open(url, "share", "width=550,height=300,resizable=1");
  }

  render() {
    return (
      <div className="Footer">
        {__i18n("footer")}
        <span className="social-icons">
            {this.shareIcons.map((share, i) =>
              <a key={i} href={share.url} onClick={prevDefault(() => this.share(share.url))}>
                <img src={share.icon} title={share.title}/>
              </a>
            )}
          </span>
      </div>
    );
  }
}
