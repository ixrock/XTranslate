import "./theme-manager.scss";

import React from "react";
import { observer } from "mobx-react";
import { action } from "mobx";
import { customFont, CustomFontStorageModel, themeStorage, ThemeStorageModel, themeStore } from "./theme.storage";
import { pageManager } from "../app/page-manager";
import { Popup } from "../popup";
import { FileInput, ImportingFile, NumberInput } from "../input";
import { Checkbox } from "../checkbox";
import { ReactSelect, ReactSelectOption } from "../select";
import { Slider } from "../slider";
import { Button } from "../button";
import { SubTitle } from "../sub-title";
import { ColorPicker } from "../color-picker";
import { Tab } from "../tabs";
import { getMessage } from "../../i18n";
import { Icon } from "../icon";
import { base64Encode } from "../../utils";

@observer
export class ThemeManager extends React.Component {
  protected customFontInput: FileInput;
  protected formatMinMaxTitle = (value: number) => !value ? "auto" : value;

  get theme(): ThemeStorageModel {
    return themeStore.data;
  }

  get customFont(): CustomFontStorageModel {
    return customFont.get();
  }

  renderFontsSelect() {
    const bundledFonts: ReactSelectOption<string>[] = themeStore.bundledFonts.map(({ familyName }) => {
      return { value: familyName, label: familyName, }
    });

    const selectCustomFontLabel = (
      <div className="flex align-center">
        <Icon material="folder_open" small/>
        <em>&lt;{getMessage("custom_font_select")}&gt;</em>
      </div>
    );

    const customFontOpt: ReactSelectOption<string> = {
      value: this.customFont.fileName,
      label: this.customFont.fileName ? <em>{this.customFont.fileName}</em> : selectCustomFontLabel,
    };

    const options = [
      customFontOpt,
      ...bundledFonts,
    ];

    const onChange = action(({ value }: ReactSelectOption<string>) => {
      const customFontName = this.customFont.fileName;
      const openDialog = !value || value == customFontName && this.theme.fontFamily === customFontName;
      if (openDialog) {
        this.customFontInput.selectFiles();
        return;
      }
      this.theme.fontFamily = value;
    });

    return (
      <ReactSelect<string>
        options={options}
        value={options.find(opt => opt.value === this.theme.fontFamily)}
        onChange={onChange}
      />
    );
  }

  onImportCustomFont = async ([{ file }]: ImportingFile[]) => {
    const fileBuffer = await file.arrayBuffer();

    this.customFont.fileName = file.name.split(".")[0];
    this.customFont.type = file.type;
    this.customFont.fontDataBase64 = base64Encode(fileBuffer);
    this.theme.fontFamily = this.customFont.fileName; // save as current font
  };

  renderPopupBorderStyles() {
    const theme = themeStore.data;

    const options: ReactSelectOption<string>[] = themeStore.borderStyle.map(style => {
      return { value: style, label: style }
    });

    return (
      <ReactSelect<string>
        formatOptionLabel={({ label, value }: ReactSelectOption<string>) => (
          <div className="flex gaps align-center">
            <span>{label}</span>
            <span className="box grow" style={{ height: 0, borderTop: `${theme.borderWidth}px ${value}` }}/>
          </div>
        )}
        options={options}
        value={options.find(opt => opt.value === theme.borderStyle)}
        onChange={({ value }) => theme.borderStyle = value}
      />
    )
  }

  render() {
    const theme = themeStore.data;
    const isDefault = themeStorage.isDefaultValue(theme) && customFont.isDefaultValue(this.customFont);
    return (
      <div className="ThemeManager flex column gaps">
        <Popup previewMode translation={Popup.translationMock}/>
        <div className="theme">
          <div className="flex gaps auto">
            <div className="box">
              <SubTitle>{getMessage("sub_header_background")}</SubTitle>
              <div className="flex gaps align-center">
                <span className="heading">{getMessage("background_color")}</span>
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
                  label={getMessage("background_linear_gradient")}
                  checked={theme.bgcLinear}
                  onChange={v => theme.bgcLinear = v}
                />
              </div>
            </div>
            <div className="box">
              <SubTitle>{getMessage("sub_header_box_shadow")}</SubTitle>
              <div className="flex gaps align-center">
                <NumberInput
                  className="box grow"
                  min={0} max={100}
                  value={theme.boxShadowBlur}
                  onChange={v => theme.boxShadowBlur = v}
                />
                <span className="heading">{getMessage("box_shadow_color")}</span>
                <ColorPicker
                  position={{ bottom: true, right: true }}
                  value={theme.boxShadowColor}
                  onChange={v => theme.boxShadowColor = v}
                />
                <Checkbox
                  label={getMessage("box_shadow_inner")}
                  checked={theme.boxShadowInner}
                  onChange={v => theme.boxShadowInner = v}
                />
              </div>
            </div>
          </div>

          <SubTitle>{getMessage("sub_header_text")}</SubTitle>

          <div className="flex gaps align-center">
            <span className="heading">{getMessage("text_color")}</span>
            <ColorPicker
              value={theme.textColor}
              onChange={v => theme.textColor = v}
            />
            <span className="heading">{getMessage("text_size")}</span>
            <NumberInput
              className="box grow"
              min={10} max={50}
              value={theme.fontSize}
              onChange={v => theme.fontSize = v}
            />
            <span className="heading">{getMessage("text_font_family")}</span>
            {this.renderFontsSelect()}
          </div>
          <div className="flex gaps align-center">
            <span className="heading">{getMessage("text_shadow")}</span>
            <NumberInput
              title={getMessage("text_shadow_size")}
              value={theme.textShadowRadius}
              onChange={v => theme.textShadowRadius = v}
            />
            <NumberInput
              title={getMessage("text_shadow_offset_x")}
              value={theme.textShadowOffsetX}
              onChange={v => theme.textShadowOffsetX = v}
            />
            <NumberInput
              title={getMessage("text_shadow_offset_y")}
              value={theme.textShadowOffsetY}
              onChange={v => theme.textShadowOffsetY = v}
            />
            <span className="heading">{getMessage("text_shadow_color")}</span>
            <ColorPicker
              position={{ bottom: true, right: true }}
              value={theme.textShadowColor}
              onChange={v => theme.textShadowColor = v}
            />
          </div>

          <SubTitle>{getMessage("sub_header_border")}</SubTitle>

          <div className="flex gaps align-center">
            <span className="heading">{getMessage("border_width")}</span>
            <NumberInput
              className="box grow"
              min={0} max={25}
              value={theme.borderWidth}
              onChange={v => theme.borderWidth = v}
            />
            <span className="heading">{getMessage("border_style")}</span>
            {this.renderPopupBorderStyles()}
            <span className="heading">{getMessage("border_color")}</span>
            <ColorPicker
              position={{ bottom: true, right: true }}
              value={theme.borderColor}
              onChange={v => theme.borderColor = v}/>
          </div>
          <div className="flex gaps align-center">
            <span className="heading">{getMessage("border_radius")}</span>
            <Slider
              min={0} max={50}
              className="box grow"
              value={theme.borderRadius}
              onChange={v => theme.borderRadius = v}
            />
          </div>

          <SubTitle>{getMessage("sub_header_box_size")}</SubTitle>

          <div className="flex gaps align-center">
            <span className="heading">{getMessage("box_size_min_width")}</span>
            <Slider
              className="box grow"
              min={0} max={500} step={50}
              value={theme.minWidth}
              onChange={v => theme.minWidth = v}
              formatTitle={this.formatMinMaxTitle}
            />
            <span className="heading">{getMessage("box_size_min_height")}</span>
            <Slider
              className="box grow"
              min={0} max={500} step={50}
              value={theme.minHeight}
              onChange={v => theme.minHeight = v}
              formatTitle={this.formatMinMaxTitle}
            />
          </div>
          <div className="flex gaps align-center">
            <span className="heading">{getMessage("box_size_max_width")}</span>
            <Slider
              className="box grow"
              min={0} max={500} step={50}
              value={theme.maxWidth}
              onChange={v => theme.maxWidth = v}
              formatTitle={this.formatMinMaxTitle}
            />
            <span className="heading">{getMessage("box_size_max_height")}</span>
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
          <FileInput
            accept=".ttf,.otf,.woff,.woff2"
            onImport={this.onImportCustomFont}
            ref={instance => this.customFontInput = instance}
          />
          <Button
            accent
            label={getMessage("reset_to_default_button_text")}
            disabled={isDefault}
            onClick={() => themeStore.reset()}
          />
        </div>
      </div>
    );
  }
}

pageManager.registerComponents("theme", {
  Tab: props => <Tab {...props} label={getMessage("tab_theme")} icon="color_lens"/>,
  Page: ThemeManager,
});
