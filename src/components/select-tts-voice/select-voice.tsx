import styles from "./select-voice.module.scss";
import React from "react";
import { ReactSelect, ReactSelectOption } from "../select";
import { getMessage } from "../../i18n";

export interface SelectVoiceProps {
  currentIndex?: number;
  onChange?(voiceIndex: number): void;
}

export class SelectVoice extends React.Component<SelectVoiceProps> {
  static defaultProps: SelectVoiceProps = {
    currentIndex: 0,
  }

  componentDidMount() {
    // re-render a bit later since speechSynthesis.getVoices() not available immediately
    setTimeout(() => this.forceUpdate());
  }

  get selectedVoice() {
    return this.voices.find(({ value }) => value === this.props.currentIndex);
  }

  get voices(): ReactSelectOption<number>[] {
    return speechSynthesis.getVoices().map(({ name, lang }, index) => ({
      value: index,
      label: `${name} (${lang})`,
    }));
  }

  onChange = ({ value: voiceIndex }: ReactSelectOption<number>) => {
    this.props.onChange?.(voiceIndex);
  }

  render() {
    return (
      <div className={styles.SelectVoice}>
        <ReactSelect
          menuPlacement="auto"
          placeholder={getMessage("tts_select_voice_title")}
          value={this.selectedVoice}
          onChange={this.onChange}
          options={this.voices}
        />
      </div>
    );
  }
}