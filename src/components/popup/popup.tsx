require('./popup.scss');
import * as React from 'react';
import { autobind } from "core-decorators";
import { __i18n } from "../../extension/i18n";
import { cssNames } from "../../utils/cssNames";
import { cssColor } from "../ui/color-picker/cssColor";
import { MaterialIcon } from '../ui/icons/material-icon'
import { Theme } from '../theme-manager/theme-manager.types'
import { fontsList, loadFonts } from '../theme-manager/fonts-loader'
import { vendors, Translation, TranslationError } from "../../vendors";
import omit = require("lodash/omit");
import find = require("lodash/find");

interface Props extends React.HTMLProps<any> {
  theme?: Theme
  showPlayIcon?: boolean
  translation?: Translation
  error?: TranslationError
  position?: React.CSSProperties
}

interface State {
  cssThemeStyle?: React.CSSProperties
  boxSizeStyle?: React.CSSProperties
}

export class Popup extends React.Component<Props, State> {
  public elem: HTMLElement;
  public state: State = {};

  componentWillMount() {
    this.applyTheme();
  }

  componentWillReceiveProps(nextProps: Props) {
    this.stopPlaying();
    if (this.props.theme !== nextProps.theme) {
      this.applyTheme(nextProps.theme);
    }
  }

  @autobind()
  focus() {
    this.elem.focus();
  }

  applyTheme(theme = this.props.theme) {
    if (!theme) return;
    loadFonts(theme.fontFamily);
    var font = fontsList.filter(font => font.font === theme.fontFamily)[0];
    var cssTheme = {
      background: cssColor(theme.bgcMain),
      borderRadius: theme.borderRadius,
      fontFamily: [JSON.stringify(theme.fontFamily)].concat(font.family ? font.family : []).join(", "),
      fontSize: theme.fontSize,
      color: cssColor(theme.textColor),
      border: theme.borderWidth ? [
        theme.borderWidth + "px",
        theme.borderStyle,
        cssColor(theme.borderColor)
      ].join(" ") : "",
      textShadow: (theme.textShadowRadius || theme.textShadowOffsetX || theme.textShadowOffsetY) ? [
        theme.textShadowOffsetX + "px",
        theme.textShadowOffsetY + "px",
        theme.textShadowRadius + "px",
        cssColor(theme.textShadowColor)
      ].join(" ") : "",
      boxShadow: theme.boxShadowBlur ? [
        theme.boxShadowInner ? "inset" : "",
        0, 0, theme.boxShadowBlur + "px",
        cssColor(theme.boxShadowColor)
      ].join(" ") : ""
    };
    if (theme.bgcLinear) {
      cssTheme.background = `linear-gradient(180deg, ${cssTheme.background}, ${cssColor(theme.bgcSecondary)})`;
    }
    var { maxHeight, maxWidth, minHeight, minWidth } = theme;
    var boxSize = {
      maxWidth: !maxWidth ? "" : Math.max(maxWidth, minWidth),
      maxHeight: !maxHeight ? "" : Math.max(maxHeight, minHeight),
      minWidth: minWidth,
      minHeight: minHeight,
    };
    this.setState({
      cssThemeStyle: cssTheme,
      boxSizeStyle: boxSize
    });
  }

  @autobind()
  playText() {
    var { langDetected, langFrom, originalText, vendor } = this.props.translation;
    var vendorApi = vendors[vendor];
    if (vendorApi) vendorApi.playText(langDetected || langFrom, originalText);
  }

  @autobind()
  stopPlaying() {
    var translation = this.props.translation;
    if (translation) vendors[translation.vendor].stopPlaying();
  }

  renderResult() {
    const result = this.props.translation;
    if (!result) return null;
    const { translation, transcription, dictionary, vendor, langFrom, langTo } = result;
    const showPlayIcon = this.props.showPlayIcon;
    const boxSizeStyle = this.state.boxSizeStyle;
    const vendorApi = vendors[vendor];
    var title = __i18n("translated_with", [
      vendorApi.title,
      [langFrom, langTo].join(" → ").toUpperCase()
    ]).join("");
    return (
        <div className="translation-result" style={boxSizeStyle}>
          <div className="flex">
            {showPlayIcon ? (
                <MaterialIcon
                    name="play_circle_outline" className="play-icon"
                    title={__i18n("popup_play_icon_title")} onClick={this.playText}/>
            ) : null}
            <div className="translation" title={title}>
              <span>{translation}</span>
              {transcription ? <i className="transcription">{" "}[{transcription}]</i> : null}
            </div>
          </div>
          {dictionary.map((dict, i) =>
              <div key={i} className="dictionary">
                <div className="word-type">{dict.wordType}</div>
                <div className="word-meanings">
                  {dict.meanings.map((meaning, i, list) => {
                    var last = i === list.length - 1;
                    var title = meaning.translation.join(", ") || null;
                    return [
                      <span key={i} className="word" title={title}>
                        {meaning.word}
                      </span>,
                      !last ? ", " : null
                    ]
                  })}
                </div>
              </div>
          )}
        </div>
    );
  }

  renderError() {
    if (!this.props.error) return null;
    var { status, statusText, error } = this.props.error;
    return (
        <div className="translation-error">
          {status} - {statusText}
        </div>
    )
  }

  render() {
    var { translation, error, position } = this.props;
    var { cssThemeStyle } = this.state;
    var style = Object.assign({}, cssThemeStyle, position);
    var className = cssNames("Popup", { visible: translation || error });
    return (
        <div className={className} style={style} tabIndex={-1} ref={e => this.elem = e}>
          <div className="content">
            {error ? this.renderError() : this.renderResult()}
          </div>
        </div>
    );
  }
}

export default Popup;