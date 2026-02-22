import React from "react";
import { materialIcons } from "@/config";
import { getTranslator, isTranslationResult, ITranslationResult } from "@/providers/translator";
import { cssNames, IClassName } from "@/utils";
import { getMessage } from "@/i18n";
import { Icon, IconProps } from "../icon";

export interface CopyToClipboardIconProps {
  className?: IClassName;
  iconName?: string;
  tooltip?: IconProps["tooltip"],
  content: string | ITranslationResult;
}

export function CopyToClipboardIcon(props: CopyToClipboardIconProps) {
  const [copied, setCopied] = React.useState(false);
  const {
    className,
    iconName = materialIcons.copyTranslation,
    tooltip = getMessage("copy_to_clipboard"),
    content,
  } = props;

  function copyToClipboard() {
    const textToCopy = isTranslationResult(content) ? getTranslationResultText(content) : content;
    void navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <Icon
      className={cssNames(className)}
      material={copied ? materialIcons.copiedTranslation : iconName}
      tooltip={tooltip}
      onClick={copyToClipboard}
    />
  )
}

export function getTranslationResultText(result: ITranslationResult) {
  const {
    vendor: provider,
    originalText,
    langFrom, langTo, langDetected = langFrom,
    translation, transcription, dictionary,
  } = result;

  const translator = getTranslator(provider);
  return [
    originalText,

    `${translation}${transcription ? `(${transcription})` : ""}`,

    ...dictionary.map(({ wordType, meanings }) => {
      return `${wordType}: ${meanings.map(({ word }) => word).join(", ")}`;
    }),

    getMessage("translated_with", {
      translator: translator.title,
      lang: translator.getLangPairTitle(langDetected, langTo),
    })
  ].join("\n");
}
