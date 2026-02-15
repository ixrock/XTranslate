import React from "react";
import { action } from "mobx";
import { getMessage } from "@/i18n";
import { ReactSelect, ReactSelectOption } from "@/components/select";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { Notifications } from "@/components/notifications";

export interface SettingsUrlListProps {
  urlList: string[];
  title: string;
  infoTooltip?: React.ReactNode;
}

export function SettingsUrlList({ urlList, title, infoTooltip }: SettingsUrlListProps) {
  return (
    <div className="SettingsEditUrlList flex gaps align-center" style={{ width: "inherit" }}>
      {infoTooltip && (
        <Icon material="info_outline" tooltip={infoTooltip}/>
      )}
      <span>{title} <b>({urlList.length})</b></span>
      <ReactSelect
        value={null}
        className="box grow"
        menuNowrap={false}
        closeMenuOnSelect={false}
        placeholder={getMessage("settings_select_edit_list")}
        noOptionsMessage={() => getMessage("settings_select_empty_list")}
        options={urlList.map(value => ({ value, label: value }))}
        formatOptionLabel={({ value: url }: ReactSelectOption<string>) => <SettingsUrlListFormatLabel list={urlList} pageUrl={url}/>}
      />
      <Button
        primary
        label={getMessage("settings_select_add_url")}
        onClick={() => addUrl({ list: urlList, title })}
      />
    </div>
  )
}

export function SettingsUrlListFormatLabel(props: { pageUrl: string, list: string[] }): React.ReactNode {
  const { pageUrl, list } = props;

  const removeItem = action(() => {
    const index = list.indexOf(pageUrl);
    if (index > -1) list.splice(index, 1);
  });

  return (
    <div className="page-url-exception flex gaps align-center">
      <span className="box grow">{pageUrl}</span>
      <Icon small material="clear" onClick={removeItem}/>
    </div>
  )
}

export const addUrl = action((params: { list: string[], title: string }) => {
  const pageUrl = window.prompt(params.title);
  if (pageUrl) {
    try {
      const pageAddr = String(new URL(pageUrl));
      const alreadyExists = params.list.find(url => pageAddr === url);
      if (!alreadyExists) params.list.push(pageAddr);
    } catch (err) {
      Notifications.error(`${getMessage("settings_select_add_url_error")}: ${pageUrl}`);
    }
  }
});
