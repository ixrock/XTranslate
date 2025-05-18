import React from "react";
import startCase from "lodash/startCase";
import { cssNames, prevDefault } from "../../utils";
import { getTranslator, isRTL, Translator } from "../../providers";
import { clearHistoryItem, IHistoryItem } from "./history.storage";
import { Icon } from "../icon";
import { materialIcons } from "../../common-vars";
import { isFavorite, removeFavorite } from "./favorites.storage";
import { getTranslationPageUrl, navigate } from "../../navigation";
import { saveToFavoritesAction } from "../../background/history.bgc";

export interface UserHistoryItemProps {
  item: IHistoryItem;
  showDetails: boolean;
  highlightSearch(text: string): string;
}

export function UserHistoryItem({ item, showDetails, highlightSearch }: UserHistoryItemProps) {
  const { id: itemId, vendor, from: langFrom, to: langTo, text, translation, transcription, dictionary } = item;
  const translator = getTranslator(vendor);
  const favorite = isFavorite(item);
  const providerTitle = translator?.title ?? startCase(vendor);
  const translationDirection = translator?.getLangPairTitle(langFrom, langTo) ?? Translator.getLangPairTitleShort(langFrom, langTo);

  const clearItem = prevDefault(() => {
    removeFavorite(item);
    clearHistoryItem(itemId, vendor);
  });

  const toggleFavorite = prevDefault(() => {
    void saveToFavoritesAction(item, { isFavorite: !favorite });
  });

  const sourceTextUrl = getTranslationPageUrl({ provider: vendor, from: langFrom, to: langTo, text });
  const reverseTranslationUrl = getTranslationPageUrl({ provider: vendor, from: langTo, to: langFrom, text: translation });

  return (
    <div key={vendor} className={`history-item ${cssNames({ showDetails })}`}>
      {showDetails && (
        <small className="translation-service-info">
          <span className="translation-vendor">{providerTitle} </span>
          <span className="translation-direction">{translationDirection}</span>
        </small>
      )}
      <div className="main-info flex gaps align-center">
        <div className="text box grow flex gaps align-center">
          {showDetails && (
            <Icon
              className="icons tts"
              material={materialIcons.ttsPlay}
              onClick={prevDefault(() => translator.speak(langFrom, text))}
            />
          )}
          <div className="source-text">
            <a
              href={sourceTextUrl}
              onClick={prevDefault(() => navigate(sourceTextUrl))}
              dangerouslySetInnerHTML={{ __html: highlightSearch(text) }}
            />
          </div>
          {transcription ? <span className="transcription">({transcription})</span> : null}
        </div>
        <div className={cssNames("translation box grow", { rtl: isRTL(langTo) })}>
          <a
            href={reverseTranslationUrl}
            onClick={prevDefault(() => navigate(reverseTranslationUrl))}
            dangerouslySetInnerHTML={{ __html: highlightSearch(translation) }}
          />
        </div>
        <Icon
          className="icons favorites"
          material={favorite ? materialIcons.favorite : materialIcons.unfavorite}
          onClick={toggleFavorite}
        />
        <Icon
          material="remove_circle_outline"
          className="icons remove-icon"
          onClick={clearItem}
        />
      </div>

      {showDetails && dictionary.length > 0 && (
        <div className="details flex gaps auto">
          {dictionary.map(dict => {
            var wordType = dict.wordType;
            return (
              <div key={wordType} className={cssNames("dictionary", { rtl: isRTL(item.to) })}>
                <b className="word-type">{wordType}</b>
                <div className="translations">
                  {dict.translation.map((wordTranslation, index, list) => {
                    const isLastItem = index === list.length - 1;
                    const reverseTranslationUrl = getTranslationPageUrl({
                      provider: vendor,
                      from: langTo,
                      to: langFrom,
                      text: wordTranslation,
                    });
                    return [
                      <a
                        key={wordTranslation}
                        href={reverseTranslationUrl}
                        onClick={prevDefault(() => navigate(reverseTranslationUrl))}>
                        {wordTranslation}
                      </a>,
                      !isLastItem ? ", " : "",
                    ];
                  }).flat()}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}