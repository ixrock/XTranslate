import type { PageId } from "../navigation";
import type { ProviderCodeName } from "../providers";
import { isDevelopment } from "../common-vars";
import { createStorage } from "../storage";
import { createIsomorphicAction, MessageType } from "../extension";

export const GA_MEASUREMENT_ID = "G-HKWWGL29S8";
export const GA_API_SECRET = "1bWF6YDXSM295O3ONY9esw";

export const gaClientId = createStorage("ga_client_id", {
  area: "sync",
  defaultValue: crypto.randomUUID(),
  saveDefaultWhenEmpty: true,
});

export const saveMetrics = createIsomorphicAction({
  messageType: MessageType.GA_METRICS_SEND_EVENT,
  handler: sendGAEvent,
});

export async function sendGAEvent<EventName extends GoogleMetricName>(
  eventName: EventName,
  params: GoogleMetricEvents[EventName],
) {
  if (isDevelopment) {
    return; // don't pollute metrics from `dev`
  }
  try {
    await gaClientId.load();

    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`;
    const payload = {
      client_id: gaClientId.get(),
      events: [
        {
          name: eventName,
          params: {
            platform: "extension",
            ...params,
          },
        },
      ],
    };

    return await fetch(url, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.warn(`GA event "${eventName}" failed to send: ${err}`, params);
  }
}

export type GoogleMetricName = keyof GoogleMetricEvents;

export type GoogleMetricEvents = {
  screen_view: {
    screen_name: PageId;
  };
  translate_used: {
    source: 'popup' | 'translate_tab' | 'fullpage';
    provider: ProviderCodeName;
    lang_from: string;
    lang_to: string;
  };
  popup_used: {
    trigger: 'icon' | 'double_click' | 'mouseup' | 'hotkey';
    provider: ProviderCodeName;
    lang_from: string;
    lang_to: string;
  };
  page_translate: {
    provider: ProviderCodeName;
    domain: string;
    lang_from: string;
    lang_to: string;
  };
  tts_played: {
    source: 'popup' | 'translate_tab'
  };
  saved_to_favorites: {
    source: 'popup' | 'translate_tab'
  };
  ui_interaction: {
    action: string;
    name: string;
    value: string | boolean | number;
  };
  history_opened: {};
};
