# Lokalisierungsdatei für Chrome-Erweiterung
# URL: https://chrome.google.com/webstore/detail/xtranslate/gfgpkepllngchpmcippidfhmbhlljhoo
-app-brand-name = XTranslate

# Allgemein
short_description = Text auf Webseiten einfach übersetzen
description = Übersetzen Sie Texte im Kontext der Seite, passen Sie Ihren eigenen Stil des Popup-Blocks an und vieles mehr.

# Header
open_in_window = In externem Fenster öffnen
tab_settings = Einstellungen
tab_theme = Popup
tab_text_input = Übersetzen
tab_history = Verlauf

# Einstellungen
setting_title_common = Allgemein
setting_title_text_input = Übersetzen
setting_title_popup = Popup
setting_title_translator_service = Dienst
settings_title_tts = Text-zu-Sprache
settings_title_appearance = Aussehen
auto_play_tts = Text-zu-Sprache automatisch abspielen
use_chrome_tts = Erzwingen der Verwendung des System-Text-zu-Sprache-Engine
use_chrome_tts_tooltip_info = Diese Option wird automatisch aktiviert, wenn der Übersetzer keinen eigenen TTS-Engine hat
use_dark_theme = Dunkelmodus für dieses Fenster aktivieren
tts_default_system_voice = Standard-Systemstimme
tts_select_voice_title = Stimme auswählen
tts_play_demo_sound = Demosound abspielen
tts_play_demo_sound_edit = Text für Sprachdemo bearbeiten
import_export_settings = Einstellungen importieren oder exportieren
export_settings_button_label = Einstellungen exportieren
import_settings_button_label = Einstellungen importieren
import_incorrect_file_format = Falscher Dateiformat (sollte wahrscheinlich { $fileNameJson } sein)
imported_setting_successful = Einstellungen unter dem Schlüssel { $key } erfolgreich importiert
display_icon_near_selection = Symbol in der Nähe des ausgewählten Textes anzeigen
show_tts_icon_inside_popup = Text-zu-Sprache-Symbol anzeigen
show_select_provider_icon_in_popup = Nächstes-Übersetzungssymbol anzeigen
show_copy_translation_icon = Symbol zum Kopieren der Übersetzung anzeigen
show_save_as_favorite_icon = Symbol zum Speichern als Favorit anzeigen
show_close_popup_button = Schließen-Button für Popup in der rechten Ecke anzeigen
show_detected_language_block = Erkannte Sprache anzeigen
display_on_click_by_selected_text = Beim Klicken auf die Auswahl anzeigen
display_popup_after_text_selected = Direkt nach Textauswahl anzeigen
display_popup_on_double_click = Beim Doppelklicken auf ein Wort anzeigen
display_popup_on_hotkey = Beim Drücken der Hotkey anzeigen
remember_last_typed_text = Letzten eingegebenen Text merken
sub_header_quick_access_hotkey = Globale Hotkey einstellen
quick_access_configure_link = Tastenkürzel für schnellen Zugriff auf dieses Fenster konfigurieren
swap_languages = Sprachen tauschen
popup_position_title = Position
popup_position_auto = Auto (ausrichten an Text)
popup_position_left_top = Linke obere Ecke
popup_position_right_top = Rechte obere Ecke
popup_position_left_bottom = Linke untere Ecke
popup_position_right_bottom = Rechte untere Ecke
translation_delay = Übersetzungsverzögerung
translation_delay_info = Wenn Sie häufig Sperrungen (Fehler 503) von Google oder anderen Diensten erleben, setzen Sie einen höheren Verzögerungswert
reverse_translate_select_placeholder = Umgekehrte Übersetzung der Sprache
reverse_translate_add_action = Umgekehrte Sprache hinzufügen: { $lang } -> ? (nur mit der Option "Automatische Erkennung" anwendbar)
reverse_translate_delete_action = Umgekehrte Sprachübersetzung aufheben
custom_font_select = Benutzerdefinierte Schriftart auswählen

# Thema
popup_play_icon_title = Hören
popup_copy_translation_title = Übersetzung kopieren
popup_next_vendor_icon_title = Mit { $translator } übersetzen
popup_demo_translation = Übersetzter Text
popup_demo_dictionary_noun = Substantiv
popup_demo_dictionary_values = Wort 1, Wort 2, etc.
sub_header_background = Hintergrund
sub_header_box_shadow = Boxschatten
sub_header_text = Text
sub_header_border = Rahmen
sub_header_box_size = Boxgröße
background_color = Farbe
background_linear_gradient = Linear
box_shadow_color = Farbe
box_shadow_inner = Innen
text_size = Größe
text_font_family = Schriftart
text_color = Farbe
text_shadow = Schatten
text_shadow_size = Unschärferadius
text_shadow_offset_x = Horizontale Verschiebung
text_shadow_offset_y = Vertikale Verschiebung
text_shadow_color = Farbe
border_width = Breite
border_style = Stil
border_color = Farbe
border_radius = Radius
box_size_min_width = Minimale Breite
box_size_min_height = Minimale Höhe
box_size_max_width = Maximale Breite
box_size_max_height = Maximale Höhe
reset_to_default_button_text = Auf Standard zurücksetzen

# Texteingabe
text_field_placeholder = Hier tippen, um eine Übersetzung zu erhalten
translated_with = Übersetzt mit { $translator } ({ $lang })
translated_from = Übersetzt von: { $lang }
translate_also_from = Auch von hier übersetzen
spell_correction = Meinten Sie { $suggestion }?
text_input_translation_hint = { $hotkey } für sofortige Übersetzung, Verzögerung: { $timeout }ms

# Verlauf
history_enabled_flag = Aktiviert
history_settings_save_words_only = Nur Wörterbuchwörter speichern
history_search_input_placeholder = Im Verlauf suchen
history_clear_period_hour = Letzte Stunde
history_clear_period_day = Letzter Tag
history_clear_period_month = Letzter Monat
history_clear_period_year = Letztes Jahr
history_clear_period_all = Alles
history_button_clear = Verlauf löschen
history_button_show_more = Mehr anzeigen
history_export_entries = { $format } exportieren
history_import_entries = { $format } importieren
history_page_size = Seitenzahl
history_icon_tooltip_search = Suchen
history_icon_tooltip_imp_exp = Importieren / Exportieren
history_icon_tooltip_settings = Einstellungen
history_show_favorites_only = Nur Favoriten anzeigen
history_mark_as_favorite = Eintrag als Favorit markieren
history_unmark_as_favorite = Eintrag als Favorit abwählen
history_import_success = { $itemsCount } Verlaufseinträge erfolgreich importiert
history_import_file_error = Fehler beim Lesen der Datei '{ $fileName }': { $errorInfo }

# Kontextmenü
context_menu_translate_full_page = Übersetze in { $lang }
context_menu_translate_selection = { $selection } mit { $translator } übersetzen

# Sonstiges
share_with_friends = Wenn Ihnen die App gefällt, teilen Sie sie mit Ihren Freunden
translation_data_failed = Daten laden fehlgeschlagen
rate_app_info1 = Gefällt Ihnen die Nutzung der App? Bitte bewerten Sie uns mit 5 Sternen!
rate_app_info2 = Das hilft anderen Nutzern, die Erweiterung zu finden und die Vorteile zu verbreiten.
rate_app_button = In der Erweiterungsstore bewerten
rate_app_button_later = Später erinnern
target_lang_placeholder = Zielsprachen
source_lang_placeholder = Quellsprachen
favorites_lang_title = Favoriten
favorites_info_tooltip = Um eine Sprache als Favorit zu markieren/zu löschen (die Liste wird oben angezeigt), verwenden Sie { $hotkey } + Klicken
donate_title = Entwicklerunterstützung
donate_copy_wallet = Adresse kopieren
donate_description = Wenn Ihnen die App gefällt, erwägen Sie bitte eine Spende an die Entwickler. Danke!
service_unavailable = Dienst nicht verfügbar. Versuchen Sie es nach 5-25 Minuten erneut. Wenn dies ständig passiert, erhöhen Sie die Übersetzungsverzögerung in den Einstellungen.
service_confirm_not_a_robot = Sie können auch zu { $link } gehen und bestätigen, dass Sie kein Roboter sind.

# Datenschutzrichtlinie
privacy_policy_title_updated = Die Datenschutzerklärung wurde aktualisiert
privacy_policy_accept_terms = Allgemeine Geschäftsbedingungen akzeptieren

# Mellowtel Integration
mellowtel_greetings = Hallo, Freund 👋
mellowtel_text1 = Wie Sie vielleicht wissen, ist diese Erweiterung kostenlos und für jeden verfügbar... aber dieses Mal brauchen wir eine Handlung von Ihnen, um sie aufrechtzuerhalten!
mellowtel_text2 = Diese neue Version enthält die Open-Source-Bibliothek { $link }. Diese Bibliothek ermöglicht es Ihnen, Ihr ungenutztes Internet mit vertrauenswürdigen KI-Laboren und Start-ups zu teilen, die es verwenden, um ihre Modelle zu trainieren.
mellowtel_usage_title = Wir verwenden Mellowtel, um:
mellowtel_usage1 = Ausfälle des Dienstes zu verfolgen
mellowtel_usage2 = Die Qualität des Dienstes zu messen
mellowtel_usage3 = Als Entwickler dieser Erweiterung einen kleinen Anteil am Umsatz zu erhalten
mellowtel_accept_all_info1 = Wenn Sie 'Alles akzeptieren' wählen, verwenden wir auch die Mellowtel-API, um: Vertrauenswürdigen Partnern den Zugriff auf Internetressourcen zu ermöglichen, indem ein Teil ihres Traffics über Ihren Knoten im Netzwerk geroutet wird.
mellowtel_accept_all_info2 = Mellowtel teilt nur Ihre Bandbreite. Sicherheit und Privatsphäre sind zu 100% garantiert, und die Bibliothek ist Open Source für alle sichtbar.
mellowtel_regulation1 = Es sammelt, teilt oder verkauft keine persönlichen Informationen (nicht einmal anonymisierte Daten).
mellowtel_regulation2 = Es ist auch stark reguliert: Mellowtel kommuniziert kontinuierlich mit den Regulatoren des Chrome Web Stores, um eine sichere Erfahrung zu gewährleisten.
mellowtel_regulation3 = Es stellt den Regulatoren des CWS auch Werkzeuge zur Verfügung, um die Einhaltung zu überwachen und durchzusetzen.
mellowtel_button_decline = Optionalen Gebrauch ablehnen
mellowtel_button_accept = Alles akzeptieren
mellowtel_dialog_footer = Danke, dass Sie sich die Zeit genommen haben zu lesen, Teams { $devs }.

# Verschiedene Fehlermeldungen
error_403_auth_failed = Authentifizierung fehlgeschlagen. Bitte geben Sie einen gültigen Authentifizierungs-API-Schlüssel in den Einstellungen an.

ai_choose_model = KI-Modell auswählen
ai_choose_model_cost_effective = Kostenwirksamste Wahl
ai_choose_model_recommended = Empfohlenes Modell

# Unterstützung für PDF-Übersetzungen via pdf.js
pdf_use_custom_viewer = Unterstützung für Übersetzungen in PDF-Dateien
pdf_use_custom_viewer_info = Diese Option ersetzt den Standard-PDF-Viewer
