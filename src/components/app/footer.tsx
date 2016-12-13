require('./footer.scss');
import * as React from 'react';
import { autobind } from "core-decorators";
import { prevDefault } from '../../utils'
import { getManifest, __i18n } from '../../extension'
import { LocaleMessage } from "../locale-message";
import { DonationDialog } from "./donation-dialog";

interface ShareIcon {
  title: string
  icon: string
  url: string
}

export class Footer extends React.Component<any, any> {
  private manifest = getManifest();
  private donationDialog: DonationDialog;
  private storeUrl = 'https://chrome.google.com/webstore/detail/gfgpkepllngchpmcippidfhmbhlljhoo';
  private shareTags = ["chrome", "extension", "translator"];

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
          <DonationDialog ref={e => this.donationDialog = e}/>
          <LocaleMessage message="footer" replacers={[
              donate => <a href="#" onClick={() => this.donationDialog.open()}>{donate}</a>,
              review => <a href={this.storeUrl + "/reviews"} target="_blank">{review}</a>,
          ]}/>
          <div className="social-icons">
            {this.shareIcons.map((share, i) =>
                <a key={i} href={share.url} onClick={prevDefault(() => this.share(share.url))}>
                  <img src={share.icon} title={share.title}/>
                </a>
            )}
          </div>
        </div>
    );
  }
}

export default Footer;