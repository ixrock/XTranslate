import type { PageId } from "../navigation";
import type { ProviderCodeName } from "../providers";
import { isDevelopment } from "../config";
import { createStorage } from "../storage";
import { createIsomorphicAction, MessageType } from "../extension";

export const GA_MEASUREMENT_ID = "G-HKWWGL29S8";
export const GA_API_SECRET = "1bWF6YDXSM295O3ONY9esw";

export const gaClientId = createStorage("ga_client_id", {
  area: "sync",
  defaultValue: crypto.randomUUID?.() ?? Math.random().toString(36).substring(2),
  saveDefaultWhenEmpty: true,
});

export const sendMetric = createIsomorphicAction({
  messageType: MessageType.GA_METRICS_SEND_EVENT,
  handler: sendGAEvent,
});

export async function sendGAEvent<EventName extends MetricName>(
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

export type MetricName = keyof GoogleMetricEvents;
export type MetricSourceEnv = "popup" | "translate_tab";

export type GoogleMetricEvents = {
  screen_view: {
    screen_name: PageId;
  };
  translate_used: {
    source: MetricSourceEnv | "fullpage";
    provider: ProviderCodeName;
    lang_from: string;
    lang_to: string;
  };
  translate_error: {
    source: MetricSourceEnv;
    provider: ProviderCodeName;
    lang_from: string;
    lang_to: string;
    error: string;
  };
  translate_action: {
    trigger: "icon" | "double_click" | "selection_click" | "selection_change" | "hotkey" | "provider_change";
  };
  tts_played: {
    source: MetricSourceEnv;
    provider: ProviderCodeName;
    lang?: string;
  };
  tts_error: {
    source: MetricSourceEnv;
    provider: ProviderCodeName;
    lang?: string;
    error: string;
  };
  history_saved: {
    source: MetricSourceEnv;
    provider: ProviderCodeName;
    lang_from: string;
    lang_to: string;
  };
  favorite_saved: {
    source: MetricSourceEnv | "history_list"
    provider: ProviderCodeName;
    lang_from: string;
    lang_to: string;
  };
  // TODO: use metric
  settings_changed: {
    name: string;
    value: string | boolean | number
  }
};
