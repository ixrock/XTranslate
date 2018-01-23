import './footer.scss'
import * as React from 'react';
import { autobind } from "core-decorators";
import { prevDefault } from '../../utils'
import { __i18n, getManifest } from '../../extension'
import * as Clipboard from "clipboard";

interface ShareIcon {
  title: string
  icon: string
  url: string
}

export class Footer extends React.Component<any, any> {
  private clipboard: Clipboard;
  private manifest = getManifest();
  private storeUrl = 'https://chrome.google.com/webstore/detail/gfgpkepllngchpmcippidfhmbhlljhoo';
  private shareTags = ["chrome", "extension", "xtranslate"];

  componentDidMount() {
    this.clipboard = new Clipboard('.donate');
  }

  componentWillUnmount() {
    this.clipboard.destroy();
  }

  private shareIcons: ShareIcon[] = [
    {
      title: "VK.com",
      icon: require('../icons/vk.svg'),
      url: `http://vkontakte.ru/share.php?url=${this.storeUrl}`,
    },
    {
      title: "Facebook",
      icon: require('../icons/facebook.svg'),
      url: `https://www.facebook.com/sharer/sharer.php?u=${this.storeUrl}`,
    },
    {
      title: "Google+",
      icon: require('../icons/google-plus.svg'),
      url: `https://plus.google.com/share?url=${this.storeUrl}`,
    },
    {
      title: "Twitter",
      icon: require('../icons/twitter.svg'),
      url: [
        `https://twitter.com/intent/tweet?source=webclient`,
        `url=${this.storeUrl}`,
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
        <div className="donation">
          <b>{__i18n("footer_donate_title")} </b>
          <span className="donate" data-clipboard-text="1FuwS2M3JpwGRdZqh5kZZtcM36788xthu6">Bitcoin</span>{", "}
          <span className="donate" data-clipboard-text="0x86ef84b008cf69fa5479e87f1ae82c5d1c47164b">Ethereum</span>{", "}
          <span className="donate" data-clipboard-text="LZpBN9tpEmFSwzwV4WoxNiYK2iFBya6bqv">Litecoin</span>
          <i> {__i18n("footer_donate_click_to_copy")}</i>
        </div>
      </div>
    );
  }
}
