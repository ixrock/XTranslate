import styles from "./select-voice.module.scss";
import React from "react";
import { settingsStore } from "../settings/settings.storage";

console.log(styles.SelectVoice)

export interface SelectVoiceProps {
}

// TODO: provide voice choosing in the settings and translation pages
export class SelectVoice extends React.Component<SelectVoiceProps> {
  getVoices(filterByTargetLanguage?: boolean): SpeechSynthesisVoice[] {
    const targetLang = settingsStore.data.langTo;
    const voices = speechSynthesis.getVoices();

    return voices.filter(voice => filterByTargetLanguage ? voice.lang.includes(targetLang) : true);
  }

  render() {
    return (
      <div className={styles.SelectVoice}>
        <h1>SelectVoice</h1>
      </div>
    );
  }
}