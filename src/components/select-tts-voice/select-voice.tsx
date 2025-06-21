import * as styles from "./select-voice.module.scss";
import React from "react";
import { makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import { ReactSelect, ReactSelectOption } from "../select";
import { getMessage } from "@/i18n";
import { getTTSVoices, TTSVoice } from "@/tts";
import { cssNames, IClassName } from "@/utils";

export interface SelectVoiceProps {
  className?: IClassName;
  currentIndex?: number;
  onChange?(voiceIndex: number): void;
}

@observer
export class SelectVoice extends React.Component<SelectVoiceProps> {
  static defaultProps: SelectVoiceProps = {
    currentIndex: 0,
  }

  voices = observable.array<TTSVoice>([], { deep: false });

  constructor(props: SelectVoiceProps) {
    super(props);
    makeObservable(this);
  }

  async componentDidMount() {
    this.voices.replace(await getTTSVoices()); // get available system voices
  }

  get selectedVoice() {
    return this.voicesOptions.find(({ value }) => value === this.props.currentIndex);
  }

  get voicesOptions(): ReactSelectOption<number>[] {
    return this.voices.map(({ name, lang }, index) => ({
      value: index,
      label: `${name} (${lang})`,
    }));
  }

  onChange = ({ value: voiceIndex }: ReactSelectOption<number>) => {
    this.props.onChange?.(voiceIndex);
  }

  render() {
    const { className } = this.props;

    return (
      <div className={cssNames(styles.SelectVoice, className)}>
        <ReactSelect
          menuPlacement="auto"
          placeholder={getMessage("tts_select_voice_title")}
          value={this.selectedVoice}
          onChange={this.onChange}
          options={this.voicesOptions}
        />
      </div>
    );
  }
}