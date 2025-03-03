# Localization file for chrome extension
# URL: https://chrome.google.com/webstore/detail/xtranslate/gfgpkepllngchpmcippidfhmbhlljhoo
-app-brand-name = XTranslate

short_description = Легкий перевод текста на веб-страницах
description = Переводите текст в контексте просматриваемой страницы, настройте свой стиль всплывающего блока, и др.

# ____________header_______________

open_in_window = Открыть в отдельном окне
tab_settings = Настройки
tab_theme = Попап
tab_text_input = Перевести
tab_history = История

# ___________settings_____________

setting_title_common = Общее
setting_title_translator_service = Сервис перевода
setting_title_popup = Попап
setting_title_text_input = Переводчик
settings_title_tts = Воспроизведение речи
settings_title_appearance = Видимость
auto_play_tts = Автовоспроизведение текста в речь
use_chrome_tts = Использовать системный преобразователь текста в речь
use_chrome_tts_tooltip_info = Эта опция используется по умолчанию когда поставщик перевода не имеет доступную систему озвучки текста
use_dark_theme = Переключить темную тему для этого окна
tts_default_system_voice = Системный голос по умолчанию
tts_select_voice_title = Выбрать голос
tts_play_demo_sound = Воспроизвести демо звук
tts_play_demo_sound_edit = Редактировать текст демо воспроизведения
import_export_settings = Импорт и экспорт настроек
export_settings_button_label = Экспорт настроек
import_settings_button_label = Импорт настроек
import_incorrect_file_format = Неверный файл настроек (вероятно, нужен файл { $fileNameJson })
imported_setting_successful = Настройки приложения для '{ $key }' успешно импортированы
show_tts_icon_inside_popup = Показывать иконку озвучивания
display_icon_near_selection = Отображать иконку перевода рядом с выделенным текстом
show_context_menu = Отображать в контекстном меню страницы
show_next_vendor_icon_in_popup = Отображать иконку следующего перевода
show_copy_translation_icon = Отображать иконку копирования перевода
show_close_popup_button = Отображать иконку закрытие попапа
show_save_as_favorite_icon = Отображать иконку для сохранения в избранное
show_close_popup_button_title = Закрыть
display_popup_after_text_selected = Отображать сразу после выделения текста
display_on_click_by_selected_text = Отображать по клику на выделенном тексте
show_detected_language_block = Отображать оригинал языка перевода
display_popup_on_double_click = Отображать при двойном клике на слове
display_popup_on_hotkey = Отображать при нажатии горячей клавиши
remember_last_typed_text = Запоминать последний набранный текст
sub_header_quick_access_hotkey = Быстрый доступ к окну
quick_access_configure_link = Настройте горячую клавишу для быстрого доступа к окну приложения
swap_languages = Поменять языки местами
popup_position_title = Расположение
popup_position_auto = Авто (выровнять по тексту)
popup_position_left_top = Левый верхний угол
popup_position_right_top = Правый верхний угол
popup_position_left_bottom = Левый нижний угол
popup_position_right_bottom = Правый нижний угол
translation_delay = Задержка перевода
translation_delay_info = Если вы часто сталкиваетесь с блокировкой (503 ошибка) от Google или других сервисов, установите большее значение задержки
reverse_translate_select_placeholder = Язык обратного перевода
reverse_translate_add_action = Добавить язык обратного перевода: { $lang } -> ? (применимо только в случае когда выбрана опция авто-определения языка)
reverse_translate_delete_action = Удалить язык обратного перевода
skip_translation_vendor_in_rotation = Пропустить { $vendor }-переводы во время вращения через стрелку или клавиши клавиатуры (в попапе)
custom_font_select = Выбрать свой шрифт


# ___________theme_________________

popup_play_icon_title = Прослушать
popup_copy_translation_title = Копировать перевод
popup_next_vendor_icon_title = Перевести с { $translator }
popup_demo_translation = Перевод текста
popup_demo_dictionary_noun = существительное
popup_demo_dictionary_values = Слово 1, слово 2, и т.д.
sub_header_background = Фон
sub_header_box_shadow = Тень
sub_header_text = Текст
sub_header_border = Рамка
sub_header_box_size = Размер блока
background_color = Цвет
background_linear_gradient = Линейный
box_shadow_color = Цвет
box_shadow_inner = Внутри
text_size = Размер
text_font_family = Шрифт
text_color = Цвет
text_shadow = Тень
text_shadow_size = Радиус размытия
text_shadow_offset_x = Смещение по горизонтали
text_shadow_offset_y = Смещение по вертикали
text_shadow_color = Цвет
border_width = Ширина
border_style = Стиль
border_color = Цвет
border_radius = Радиус
box_size_min_width = Мин. ширина
box_size_min_height = Мин. высота
box_size_max_width = Макс. ширина
box_size_max_height = Макс. высота
reset_to_default_button_text = Сбросить по умолчанию

# ___________text_input___________

text_field_placeholder = Начните печатать здесь, чтобы получить перевод
translated_with = Переведено с { $translator } ({ $lang })
translated_from = Переведено c: { $lang }
translate_also_from = Перевести также с
spell_correction = Возможно, вы имели ввиду { $suggestion }?
text_input_translation_hint = { $hotkey } для быстрого перевода, задержка: { $timeout }мс

# ___________history_______________

history_enabled_flag = Включено
history_settings_save_words_only = Сохранять слова только со словарем
history_search_input_placeholder = Поиск в истории
history_clear_period_hour = За последний час
history_clear_period_day = За последний день
history_clear_period_month = За последний месяц
history_clear_period_year = За последний год
history_clear_period_all = Всё
history_button_clear = Очистить историю
history_button_show_more = Показать еще
history_export_entries = Экспорт { $format }
history_import_entries = Импорт { $format }
history_page_size = Размер страницы
history_icon_tooltip_search = Поиск
history_icon_tooltip_imp_exp = Импорт/экспорт
history_icon_tooltip_settings = Настройки
history_show_favorites_only = Отображать только избранные
history_mark_as_favorite = Добавить в избранное
history_unmark_as_favorite = Удалить отметку избранное
history_import_success = Успешно добавлено { $itemsCount } записей истории
history_import_file_error = Ошибка чтения файла '{ $fileName }': { $errorInfo }

# ________context_menu_____________

context_menu_translate_full_page = Перевести всю страницу с { $translator }
context_menu_translate_selection = Перевести { $selection } с { $translator }

# ____________other________________

share_with_friends = Если вам нравится приложение, поделитесь им со своими друзьями:
translation_data_failed = Ошибка получения данных
rate_app_info1 = Нравится приложение? Пожалуйста, оцените нас на 5 звезд!
rate_app_info2 = Это поможет другим пользователям найти расширение и распространять вкусности.
rate_app_button = Оценить в магазине расширений
rate_app_button_later = Напомнить позже
deepl_get_own_key_info = Войдите в аккаунт на www.deepl.com и получите личный ключ доступа к данным DeepL API.
deepl_insert_auth_key = Добавить личный ключ доступа для переводов DeepL
deepl_insert_auth_key_warning = Внимание: не вводите свой API-ключ в других местах, кроме этого окна расширения.
deepl_insert_auth_key_remove = Удалить ключ доступа DeepL API
target_lang_placeholder = Целевой язык
source_lang_placeholder = Исходный язык
favorites_lang_title = Избранное
favorites_info_tooltip = Чтобы добавить язык в избранное (список отображается сверху), используйте { $hotkey } + клик
donate_title = Поддержка разработчиков
donate_copy_wallet = Скопировать адрес
donate_description = Если вам нравится приложение, и вы русский, то вам врядли захочется донатить.. Но попытка не пытка. Адреса указаны ниже. Благодарю!
service_unavailable = Сервис недоступен. Попытайтесь снова через 5-25 минут. Если это случается периодически увеличьте задержку перевода в настройках.
service_confirm_not_a_robot = Также вы можете попытаться перейти по ссылке { $link } и подтвердить что вы не робот.

# ___________privacy_policy________
privacy_policy_title_updated = Политика конфиденциальности обновлена
privacy_policy_accept_terms = Принять условия использования

# mellowtel integration
mellowtel_greetings = Привет, друг 👋
mellowtel_text1 = Как ты наверное знаешь, это расширение бесплатно и доступно всем... но чтобы поддержать его развитие на этот раз нам нужно твое действие!
mellowtel_text2 = Эта версия включает в себя open-source библиотеку { $link }. Эта библиотека позволяет делиться неиспользуемым интернетом с доверенными AI лабораториями и стартапами, которые используют его для обучения своих моделей.
mellowtel_usage_title = Мы используем Mellowtel для:
mellowtel_usage1 = Отслеживание сбоев сервиса переводов
mellowtel_usage2 = Измерение качества сервиса
mellowtel_usage3 = Как разработчик расширения для получения небольшой прибыли от дохода
mellowtel_accept_all_info1 = Если вы выберете 'Принять все', мы также будем использовать API Mellowtel для: Включения доверенных партнеров в доступ к интернет-ресурсам, маршрутизируя часть их трафика через ваш узел в сети.
mellowtel_accept_all_info2 = Mellowtel использует только ваше подключение к интернету. Безопасность и конфиденциальность гарантированы на 100%, а библиотека с открытым исходных кодом доступна для всех.
mellowtel_regulation1 = Мы не собираем, не делимся и не продаем личную информацию (даже анонимизированные данные).
mellowtel_regulation2 = Mellowtel продолжает общаться с регуляторами Chrome Web Store, чтобы гарантировать безопасный опыт серфинга.
mellowtel_regulation3 = Это также предоставляет регуляторам CWS инструменты для мониторинга и соблюдения безопасности.
mellowtel_button_decline = Отклонить
mellowtel_button_accept = Принять всё
mellowtel_dialog_footer = Спасибо за то, что прочли досюда. Kоманды { $devs }.

# various error messages
error_403_auth_failed = Авторизация не удалась. Пожалуйста, предоставьте действительный ключ авторизации в настройках

# open-ai integration
open_ai_get_access_info = 1) Зарегистрируйтесь на platform.openai.com 2) Создайте ключ доступа к API 3) Пополните баланс (минимально 5$)
open_ai_insert_auth_key = Предоставьте свой API-ключ для получения переводов OpenAI
open_ai_insert_auth_key_warning = Предупреждение: НЕ вводите свой API-ключ в других местах, кроме как из этого окна расширения.
open_ai_insert_auth_key_remove = Удалить ключ доступа OpenAI API
open_ai_choose_model = Выберите AI-модель
open_ai_choose_model_cost_efficient = Наиболее экономичная
open_ai_choose_model_optimal = Рекомендуемая / оптимальная модель
open_ai_choose_model_chatgpt_like = ChatGPT (может быть дорого)
open_ai_choose_model_best_results = Лучшие результаты (наиболее дорогое)
open_ai_why_info_help =
  Предоставляя свой собственный ключ API платформы OpenAI, вы экономите много денег, вместо использования услуг "посредников" из других приложений/расширений,
  где вы обычно платите за ежемесячную/ежегодную подписку и где все цены и лимиты использования не находятся под вашим контролем.
  Не забудьте настроить лимиты использования на platform.openai.com и отключить автоматическое пополнение баланса кредитной карты.

# PDF translations suppot via pdf.js
pdf_use_custom_viewer = Поддержка переводов в PDF файлах
pdf_use_custom_viewer_info = Эта опция заменит стандартный просмоторщик PDF файлов

# DeepSeek AI integration
deepseek_get_own_key_info = Зарегистрируйтесь на platform.deepseek.com и пополните баланс (2$+)
deepseek_auth_key = Создайте API-ключ на платформе DeepSeek
deepseek_auth_key_warning = Предупреждение: НЕ вводите свой API-ключ в других местах, кроме как из этого окна расширения
deepseek_auth_key_remove = Удалить API-ключ DeepSeek
