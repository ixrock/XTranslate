import React from "react";
import { materialIcons } from "../../common-vars";
import { getTranslator, ITranslationResult } from "../../providers/translator";
import { cssNames, IClassName } from "../../utils";
import { getMessage } from "../../i18n";
import { Icon, IconProps } from "../icon";

export interface CopyToClipboardIconProps {
  className?: IClassName;
  iconName?: string;
  tooltip?: IconProps["tooltip"],
  content: string | CopyTranslationObject;
}

export interface CopyTranslationObject {
  obj: ITranslationResult;
  copyOriginalText?: boolean; /* default: true */
}

export function CopyToClipboardIcon(props: CopyToClipboardIconProps) {
  const [copied, setCopied] = React.useState(false);
  const {
    className,
    iconName = materialIcons.copyTranslation,
    tooltip,
    content,
  } = props;

  function copyToClipboard() {
    let text = content as string;

    if (typeof content !== "string") {
      const { copyOriginalText, obj } = content;
      text = getTranslationResultText(obj, { withOriginalText: copyOriginalText })
    }

    void navigator.clipboard.writeText(text);
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

export function getTranslationResultText(result: ITranslationResult, { withOriginalText = true } = {}) {
  const {
    vendor: provider,
    originalText,
    langFrom, langTo, langDetected = langFrom,
    translation, transcription, dictionary,
  } = result;

  const translator = getTranslator(provider);
  return [
    withOriginalText ? originalText : "",

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
