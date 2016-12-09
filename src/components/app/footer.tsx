require('./footer.scss');
import * as React from 'react';
import { autobind } from "core-decorators";
import { prevDefault } from '../../utils'
import { getManifest, __i18n } from '../../extension'
import { LocaleMessage } from "../locale-message";

interface ShareIcon {
  title: string
  icon: string
  url: string
}

export class Footer extends React.Component<any, any> {
  private manifest = getManifest();
  private readonly storeUrl = 'https://chrome.google.com/webstore/detail/gfgpkepllngchpmcippidfhmbhlljhoo';
  private readonly donateLink = `https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=NDM8RZ6PG5G6S&lc=US&item_name=${this.manifest.name}%20%28browser%20extension%29&item_number=2014&currency_code=EUR&bn=PP%2dDonationsBF%3abtn_donate_LG%2egif%3aNonHosted`;
  public shareTags = ["chrome", "extension", "translator"];
  public shareIcons: ShareIcon[] = [
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
          <LocaleMessage message="footer" replacers={[
              donate => <a href={this.donateLink} target="_blank">{donate}</a>,
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