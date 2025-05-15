# Localization file for chrome extension
# URL: https://chrome.google.com/webstore/detail/xtranslate/gfgpkepllngchpmcippidfhmbhlljhoo
# Authors:
#				- https://github.com/Sijera
#				- Radoš Milićev (https://github.com/rammba)

-app-brand-name = XTranslate

# common
short_description = Лако преведите текст на веб страницама
description = Преведите текст са веб странице, прилагодите изглед искачућег прозора и још много тога.

# header
open_in_window = Отвори у засебном прозору
tab_settings = Подешавања
tab_theme = Искачући прозор
tab_text_input = Превод
tab_history = Историја

# settings
setting_title_common = Опште
setting_title_text_input = Превод
setting_title_popup = Искачући прозор
setting_title_translator_service = Преводилац
settings_title_tts = Претварање текста у говор (Text-to-speech, TTS)
settings_title_appearance = Изглед
auto_play_tts = Аутоматски репродукуј претварање текста у говор
use_chrome_tts = Користи Chrome механизам за претварање текста у говор
use_chrome_tts_tooltip_info = Ова опција је аутоматски омогућена када преводилац нема доступан TTS механизам
use_dark_theme = Промени тему
tts_default_system_voice = Подразумевани системски глас
tts_select_voice_title = Изабери глас
tts_play_demo_sound = Пусти демо глас
tts_play_demo_sound_edit = Промени текст за звучни демо
import_export_settings = Import/Export подешавања
export_settings_button_label = Export подешавања
import_settings_button_label = Import подешавања
import_incorrect_file_format = Неисправан формат (требало би да буде { $fileNameJson })
imported_setting_successful = Подешавања са кључем { $key } су успешно import-ована
display_icon_near_selection = Прикажи иконицу поред изабраног текста
show_tts_icon_inside_popup = Прикажи иконицу за претварање текста у говор
show_next_vendor_icon_in_popup = Прикажи иконицу следећег преводиоца
show_copy_translation_icon = Прикажи иконицу за копирање превода
show_save_as_favorite_icon = Прикажи иконицу за чување у омиљено
show_close_popup_button = Прикажи иконицу за затварање искачућег прозора у десном углу
show_close_popup_button_title = Затвори
show_detected_language_block = Прикажи откривени језик
display_on_click_by_selected_text = Прикажи кликом на изабрани текст
display_popup_after_text_selected = Прикажи након избора текста
display_popup_on_double_click = Прикажи двокликом на реч
display_popup_on_hotkey = Прикажи притиском пречице
remember_last_typed_text = Запамти последњи укуцани текст
sub_header_quick_access_hotkey = Подеси пречицу
quick_access_configure_link = Подешавање пречице на тастатури за брзи приступ овом прозору
swap_languages = Замени језике
popup_position_title = Положај
popup_position_auto = Аутоматски (поравнато са текстом)
popup_position_left_top = Горњи леви угао
popup_position_right_top = Горњи десни угао
popup_position_left_bottom = Доњи леви угао
popup_position_right_bottom = Доњи десни угао
translation_delay = Кашњење превода
translation_delay_info = Ако често наилазите на блокирање (грешка 503) од Google-а или других сервиса, поставите већу вредност кашњења
reverse_translate_select_placeholder = Језик за обрнути превод
reverse_translate_add_action = Додај језик за обрнути превод: { $lang } -> ? (применљиво само кад је "Откривање језика" укључено)
reverse_translate_delete_action = Обриши језик за обрнути превод
skip_translation_vendor_in_rotation = Прескочи { $vendor }-преводе у ротацији преко иконице стрелице или стрелица на тастатури (у искачућем прозору)
custom_font_select = Изабери прилагођени фонт

# theme
popup_play_icon_title = Преслушај
popup_copy_translation_title = Копирај превод
popup_next_vendor_icon_title = Преведи помоћу: { $translator }
popup_demo_translation = Преведени текст
popup_demo_dictionary_noun = именица
popup_demo_dictionary_values = Реч 1, реч 2, итд.
sub_header_background = Позадина
sub_header_box_shadow = Сенка
sub_header_text = Текст
sub_header_border = Ивица
sub_header_box_size = Величина оквира
background_color = Боја
background_linear_gradient = Линеарно
box_shadow_color = Боја
box_shadow_inner = Унутра
text_size = Величина
text_font_family = Фонт
text_color = Боја
text_shadow = Сенка
text_shadow_size = Замагљивање
text_shadow_offset_x = Хоризонтално одступање
text_shadow_offset_y = Вертикално одступање
text_shadow_color = Боја
border_width = Ширина
border_style = Стил
border_color = Боја
border_radius = Полупречник
box_size_min_width = Минимална ширина
box_size_min_height = Минимална висина
box_size_max_width = Максимална ширина
box_size_max_height = Максимална висина
reset_to_default_button_text = Врати на подразумевано

# text input
text_field_placeholder = Започните куцање да бисте добили превод
translated_with = Преведено помоћу: { $translator } ({ $lang })
translated_from = Преведено са: { $lang }
translate_also_from = Преведи и са
spell_correction = Да ли сте мислили: { $suggestion }?
text_input_translation_hint = { $hotkey } за тренутни превод, кашњење: { $timeout }ms

# history
history_enabled_flag = Омогућено
history_settings_save_words_only = Сачувај само речи из речника
history_search_input_placeholder = Претражи у историји
history_clear_period_hour = Протекли сат
history_clear_period_day = Протекли дан
history_clear_period_month = Протекли месец
history_clear_period_year = Протекла година
history_clear_period_all = Све
history_button_clear = Обриши историју
history_button_show_more = Прикажи више
history_export_entries = Export-уј: { $format }
history_import_entries = Import-уј: { $format }
history_page_size = Величина странице
history_icon_tooltip_search = Претрага
history_icon_tooltip_imp_exp = Import / Export
history_icon_tooltip_settings = Подешавања
history_show_favorites_only = Прикажи само омиљено
history_mark_as_favorite = Обележи као омиљено
history_unmark_as_favorite = Уклони из омиљеног
history_import_success = Успешно увезених ставки историје: { $itemsCount }
history_import_file_error = Грешка у читању датотеке '{ $fileName }': { $errorInfo }

# context menu
context_menu_translate_full_page = Преведи на { $lang }
context_menu_translate_selection = Преведи { $selection } помоћу: { $translator }

# other
share_with_friends = Ако вам се свиђа апликација, поделите је са пријатељима:
translation_data_failed = Учитавање података није успело
rate_app_info1 = Уживате у коришћењу апликације? Оцените нас са 5 звездица!
rate_app_info2 = То ће помоћи другим корисницима да пронађу проширење у веб продавници.
rate_app_button = Оцените у веб продавници
rate_app_button_later = Подсети ме касније
deepl_get_own_key_info = Региструј се на www.deepl.com да би добио бесплатан кључ за аутентификацију на DeepL API
deepl_insert_auth_key = Постави API кључ за аутентификацију за добијање приступа ка DeepL преводима
deepl_insert_auth_key_warning = Упозорење: НЕ УНОСИ свој API кључ нигде осим у прозору овог проширења
deepl_insert_auth_key_remove = Уклони DeepL API кључ
target_lang_placeholder = Циљани језици
source_lang_placeholder = Изворни језици
favorites_lang_title = Омиљено
favorites_info_tooltip = Да бисте мењали омиљене језике (листа на врху), користите { $hotkey } + клик
donate_title = Подршка девелопера
donate_copy_wallet = Копирај адресу
donate_description = Ако вам се свиђа апликација, можете донирати девелоперима. Хвала!
service_unavailable = Сервис није доступан. Пробајте поново за 5-25 минута. Ако се то често дешава, повећајте вредност кашњења превода у подешавањима.
service_confirm_not_a_robot = Можете отићи на { $link } и потврдити да нисте робот.

# privacy policy
privacy_policy_title_updated = Политика приватности је ажурирана
privacy_policy_accept_terms = Прихватите одредбе и услове

# mellowtel integration
mellowtel_greetings = Поздрав, пријатељу 👋
mellowtel_text1 = Као што вероватно знате, ово проширење је бесплатно и доступно свима... али да би наставили, потребно је да урадите пар ствари!
mellowtel_text2 = Нова верзија укључује open-source { $link } библиотеку. Ова библиотека вам омогућава да поделите некоришћени интернет са поузданим AI лабораторијама и startup-има који га користе да тренирају своје моделе.
mellowtel_usage_title = Mellowtel користимо за:
mellowtel_usage1 = Праћење прекида рада сервиса
mellowtel_usage2 = Мерење квалитета рада сервиса
mellowtel_usage3 = Као девелопер овог проширења, добијамо мали део прихода
mellowtel_accept_all_info1 = Ако изаберете 'Прихвати све', користићемо Mellowtel API да: Дозволимо поузданим партнерима да приступе ресурсима на интернету рутирањем дела њиховог саобраћаја кроз ваш чвор на мрежи.
mellowtel_accept_all_info2 = Mellowtel дели само ваш пропусни опсег. Сигурност и приватност су 100% гарантовани и сама библиотека је open source како би сви могли да је виде.
mellowtel_regulation1 = Не прикупља, не дели, нити продаје приватне информације (чак ни анонимне податке).
mellowtel_regulation2 = Такође је високо регулисано: Mellowtel комуницира са регулаторима Chrome веб продавнице да би гарантовао сигурно искуство.
mellowtel_regulation3 = Такође пружа и CWS регулаторе са алатима за надгледање и примену усклађености.
mellowtel_button_decline = Одбиј опционо
mellowtel_button_accept = Прихвати све
mellowtel_dialog_footer = Хвала што сте издвојили време да прочитате, тимови { $devs }.

# various error messages
error_403_auth_failed = Ауторизација није успела. Унеси валидан API кључ за аутентификацију у подешавањима

# open-ai integration
open_ai_get_access_info = 1) Региструј се на platform.openai.com 2) Креирај кључ за приступ API-ју 3) Допуни своја новчана средства (5$+)
open_ai_insert_auth_key = Обезбеди API кључ за добијање OpenAI превода
open_ai_insert_auth_key_warning = Упозорење: НЕ УНОСИ свој API кључ нигде осим у прозору овог проширења
open_ai_insert_auth_key_remove = Уклони OpenAI API кључ
ai_choose_model = Изабери AI модел
ai_choose_model_cost_effective = Најисплативије
ai_choose_model_recommended = Препоручени модел
ai_choose_model_best_results = Најбољи резултати (најскупље)

# PDF translations suppot via pdf.js
pdf_use_custom_viewer = Подршка за преводе у PDF фајловима
pdf_use_custom_viewer_info = Ова опција ће прегазити подразумевани PDF прегледач

# DeepSeek AI integration
deepseek_get_own_key_info = Региструјте се на platform.deepseek.com и допуните средства (нпр. преко PayPal-а)
deepseek_auth_key = Креирајте API кључ на платформи DeepSeek да бисте добили приступ
deepseek_auth_key_warning = Упозорење: НЕ УНОСИ свој API кључ нигде осим у прозору овог проширења
deepseek_auth_key_remove = Уклони DeepSeek API кључ

# Grok AI integration (SR_CY)
grok_ai_get_own_key_info = Региструјте се на console.x.ai и допуните стање (нпр. путем кредитне картице)
grok_ai_auth_key = Креирајте API кључ на Grok (X) платформи да бисте добили приступ API-ју
grok_ai_auth_key_warning = Упозорење: НЕ УНОСИ свој API кључ нигде осим у прозору овог проширења
grok_ai_auth_key_remove = Уклоните Grok API кључ
