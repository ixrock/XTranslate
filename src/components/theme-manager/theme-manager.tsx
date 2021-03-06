import "./theme-manager.scss";

import React from "react";
import { observer } from "mobx-react";
import { __i18n } from "../../extension/i18n";
import { themeStorage, themeStore } from "./theme.storage";
import { viewsManager } from "../app/views-manager";
import { Popup } from "../popup";
import { NumberInput } from "../input";
import { Checkbox } from "../checkbox";
import { Option, Select } from "../select";
import { Slider } from "../slider";
import { Button } from "../button";
import { ColorPicker } from "../color-picker";
import { Tab } from "../tabs";

@observer
export class ThemeManager extends React.Component {
  protected formatMinMaxTitle = (value: number) => !value ? "auto" : value;

  render() {
    var theme = themeStore.data;
    var isDefault = themeStorage.isDefault(theme);
    return (
      <div className="ThemeManager flex column gaps">
        <Popup preview className="box center"/>
        <div className="theme">
          <div className="flex gaps auto">
            <div className="box">
              <span className="sub-title">{__i18n("sub_header_background")}</span>
              <div className="flex gaps align-center">
                <span className="heading">{__i18n("background_color")}</span>
                <div className="flex align-center">
                  <ColorPicker
                    value={theme.bgcMain}
                    onChange={v => theme.bgcMain = v}
                  />
                  <ColorPicker
                    value={theme.bgcSecondary}
                    onChange={v => theme.bgcSecondary = v}
                    disabled={!theme.bgcLinear}
                  />
                </div>
                <Checkbox
                  label={__i18n("background_linear_gradient")}
                  checked={theme.bgcLinear}
                  onChange={v => theme.bgcLinear = v}
                />
              </div>
            </div>
            <div className="box">
              <span className="sub-title">{__i18n("sub_header_box_shadow")}</span>
              <div className="flex gaps align-center">
                <NumberInput
                  className="box grow"
                  min={0} max={100}
                  value={theme.boxShadowBlur}
                  onChange={v => theme.boxShadowBlur = v}
                />
                <span className="heading">{__i18n("box_shadow_color")}</span>
                <ColorPicker
                  position={{ bottom: true, right: true }}
                  value={theme.boxShadowColor}
                  onChange={v => theme.boxShadowColor = v}
                />
                <Checkbox
                  label={__i18n("box_shadow_inner")}
                  checked={theme.boxShadowInner}
                  onChange={v => theme.boxShadowInner = v}
                />
              </div>
            </div>
          </div>

          <span className="sub-title">{__i18n("sub_header_text")}</span>
          <div className="flex gaps align-center">
            <span className="heading">{__i18n("text_color")}</span>
            <ColorPicker
              value={theme.textColor}
              onChange={v => theme.textColor = v}
            />
            <span className="heading">{__i18n("text_size")}</span>
            <NumberInput
              className="box grow"
              min={10} max={50}
              value={theme.fontSize}
              onChange={v => theme.fontSize = v}
            />
            <span className="heading">{__i18n("text_font_family")}</span>
            <Select className="box grow" value={theme.fontFamily} onChange={v => theme.fontFamily = v}>
              {themeStore.fonts.map(({ familyName }) => (
                <Option key={familyName} value={familyName}/>
              ))}
            </Select>
          </div>
          <div className="flex gaps align-center">
            <span className="heading">{__i18n("text_shadow")}</span>
            <NumberInput
              title={__i18n("text_shadow_size")}
              value={theme.textShadowRadius}
              onChange={v => theme.textShadowRadius = v}
            />
            <NumberInput
              title={__i18n("text_shadow_offset_x")}
              value={theme.textShadowOffsetX}
              onChange={v => theme.textShadowOffsetX = v}
            />
            <NumberInput
              title={__i18n("text_shadow_offset_y")}
              value={theme.textShadowOffsetY}
              onChange={v => theme.textShadowOffsetY = v}
            />
            <span className="heading">{__i18n("text_shadow_color")}</span>
            <ColorPicker
              position={{ bottom: true, right: true }}
              value={theme.textShadowColor}
              onChange={v => theme.textShadowColor = v}
            />
          </div>

          <span className="sub-title">{__i18n("sub_header_border")}</span>
          <div className="flex gaps align-center">
            <span className="heading">{__i18n("border_width")}</span>
            <NumberInput
              className="box grow"
              min={0} max={25}
              value={theme.borderWidth}
              onChange={v => theme.borderWidth = v}
            />
            <span className="heading">{__i18n("border_style")}</span>
            <Select className="box grow" value={theme.borderStyle} onChange={v => theme.borderStyle = v}>
              {themeStore.borderStyle.map(style => <Option key={style} value={style}/>)}
            </Select>
            <span className="heading">{__i18n("border_color")}</span>
            <ColorPicker
              position={{ bottom: true, right: true }}
              value={theme.borderColor}
              onChange={v => theme.borderColor = v}/>
          </div>
          <div className="flex gaps align-center">
            <span className="heading">{__i18n("border_radius")}</span>
            <Slider
              min={0} max={50}
              className="box grow"
              value={theme.borderRadius}
              onChange={v => theme.borderRadius = v}
            />
          </div>

          <span className="sub-title">{__i18n("sub_header_box_size")}</span>
          <div className="flex gaps align-center">
            <span className="heading">{__i18n("box_size_min_width")}</span>
            <Slider
              className="box grow"
              min={0} max={500} step={50}
              value={theme.minWidth}
              onChange={v => theme.minWidth = v}
              formatTitle={this.formatMinMaxTitle}
            />
            <span className="heading">{__i18n("box_size_min_height")}</span>
            <Slider
              className="box grow"
              min={0} max={500} step={50}
              value={theme.minHeight}
              onChange={v => theme.minHeight = v}
              formatTitle={this.formatMinMaxTitle}
            />
          </div>
          <div className="flex gaps align-center">
            <span className="heading">{__i18n("box_size_max_width")}</span>
            <Slider
              className="box grow"
              min={0} max={500} step={50}
              value={theme.maxWidth}
              onChange={v => theme.maxWidth = v}
              formatTitle={this.formatMinMaxTitle}
            />
            <span className="heading">{__i18n("box_size_max_height")}</span>
            <Slider
              className="box grow"
              min={0} max={500} step={50}
              value={theme.maxHeight}
              onChange={v => theme.maxHeight = v}
              formatTitle={this.formatMinMaxTitle}
            />
          </div>
        </div>

        <div className="reset flex center">
          <Button
            accent
            label={__i18n("reset_to_default_button_text")}
            disabled={isDefault}
            onClick={() => themeStore.reset()}
          />
        </div>
      </div>
    );
  }
}

viewsManager.registerPages("theme", {
  Tab: props => <Tab {...props} label={__i18n("tab_theme")} icon="color_lens"/>,
  Page: ThemeManager,
});
