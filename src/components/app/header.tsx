import "./header.scss";
import React from "react";
import { makeObservable } from "mobx";
import { observer } from "mobx-react";
import { isSystemPage } from "@/config";
import { cssNames } from "@/utils/cssNames";
import { getTranslator } from "@/providers";
import { getManifest, translateActivePage } from "@/extension";
import { activeTabStorage } from "@/background/tabs.bgc";
import { settingsStore } from '../settings/settings.storage'
import { Tabs } from "../tabs";
import { Icon } from "../icon";
import { getUrlParams, navigate, PageId } from "@/navigation";
import { pageManager } from "./page-manager";
import { formatNumber, getLocale, getMessage } from "@/i18n";
import { SelectLocaleIcon } from "../select-locale";
import { exportSettingsDialogState } from "./export-settings-dialog";
import { userSubscriptionStore } from "@/components/settings/user.storage";
import { Tooltip } from "@/components/tooltip";
import { Button } from "@/components/button";

@observer
export class Header extends React.Component {
  constructor(props: object) {
    super(props);
    makeObservable(this);
  }

  get user() {
    return userSubscriptionStore.data;
  }

  detachWindow = () => {
    chrome.windows.create({
      url: location.href,
      focused: true,
      width: 650,
      height: 700,
      left: 25,
      top: 25,
      type: "popup"
    });
  }

  private translateActivePage = async () => {
    void translateActivePage();
    window.close();
  }

  private onTabsChange = async (page: PageId) => {
    await navigate({ page });
    window.scrollTo(0, 0);
  }

  renderProUserInfo() {
    const {
      isProEnabled,
      remainTextTokens,
      remainSecondsTTSRoughly,
      subscriptionPlan,
      priceFormattedPerMonth,
      apiProvider: { subscribePageUrl },
      data: { subscription }
    } = userSubscriptionStore;

    if (isProEnabled) {
      return (
        <div className="pro flex column">
          <p>Welcome back, <em>{this.user.username}</em>!</p>
          <div className="flex align-center">
            <Icon small material="info_outline" tooltip={{
              following: true,
              children: (
                <>
                  <p>Subscription: <b>{subscriptionPlan}</b> (ends {new Date(subscription.periodEnd).toLocaleString(getLocale())})</p>
                  <p>
                    Available tokens: <b>{formatNumber({ value: remainTextTokens, locale: getLocale() })}</b> |
                    Available TTS-seconds: <b>{remainSecondsTTSRoughly}</b>
                  </p>
                </>
              )
            }}/>
            <div>PRO-status: <b>{subscription.status}</b></div>
          </div>
        </div>
      )
    }

    return (
      <div className="pro flex column inline">
        <Button
          outline
          href={subscribePageUrl}
          target="_blank" id="subscribe-pro"
          label={getMessage("pro_upgrade_button_label")}
        />
        <Tooltip anchorId="subscribe-pro" following>
          {getMessage("pro_upgrade_button_tooltip", {
            pricePerMonth: priceFormattedPerMonth
          })}
        </Tooltip>
      </div>
    )
  }

  render() {
    const { name, version } = getManifest();
    const { page: pageId } = getUrlParams();
    const activeTab = activeTabStorage.get();
    const showTranslateIcon = !isSystemPage(activeTab.url);
    const { useDarkTheme, fullPageTranslation } = settingsStore.data;
    const { provider, langTo, alwaysTranslatePages } = fullPageTranslation;
    const isAutoTranslatingPage = alwaysTranslatePages.includes(new URL(activeTab.url || location.href).origin);

    const translatePageActionTooltip = isAutoTranslatingPage
      ? getMessage("context_menu_translate_full_page_context_menu_stop", {
        site: `"${activeTab.title}" - ${activeTab.url}`,
      })
      : getMessage("context_menu_translate_full_page", {
        lang: getTranslator(provider).langTo[langTo] ?? langTo,
        pageTitle: activeTab.title,
      });

    return (
      <div className="Header">
        <header className="flex gaps align-center">
          <div className="app-title">
            {name} <sup className="app-version">{version}</sup>
          </div>
          <div className="box center">
            {this.renderProUserInfo()}
          </div>
          <div className="action-icons flex gaps box right">
            {showTranslateIcon && (
              <Icon
                small
                material="g_translate"
                active={isAutoTranslatingPage}
                tooltip={translatePageActionTooltip}
                onClick={this.translateActivePage}
              />
            )}
            <Icon
              small
              svg="moon"
              active={useDarkTheme}
              tooltip={{ nowrap: true, children: getMessage("use_dark_theme") }}
              className={cssNames("dark-theme-icon", { active: useDarkTheme })}
              onClick={() => settingsStore.data.useDarkTheme = !useDarkTheme}
            />
            <Icon
              small
              material="open_in_new"
              tooltip={{ nowrap: true, children: getMessage("open_in_window") }}
              onClick={this.detachWindow}
            />
            <Icon
              small
              material="import_export"
              tooltip={{ nowrap: true, children: getMessage("import_export_settings") }}
              onClick={() => exportSettingsDialogState.set(true)}
            />
          </div>
          <SelectLocaleIcon/>
        </header>
        <Tabs className="Tabs" value={pageId} onChange={this.onTabsChange}>
          {pageManager.getAllRegisteredPageIds().map(pageId => {
            let { Tab } = pageManager.getComponents(pageId);
            if (Tab) {
              return <Tab className="Tab" key={pageId} value={pageId}/>
            }
          })}
        </Tabs>
      </div>
    );
  }
}
