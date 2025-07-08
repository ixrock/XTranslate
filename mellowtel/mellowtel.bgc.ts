// Mellowtel support
// Read more: https://github.com/mellowtel-inc/mellowtel-js
import { createIsomorphicAction, MessageType } from "@/extension";
import { mellowtelReminderDuration, mellowtelOptOutTime, mellowtelStatusUrl } from "./mellowtel.config";

export const mellowtelStatusAction = createIsomorphicAction({
  messageType: MessageType.MELLOWTEL_STATUS,
  handler: async () => {
    await mellowtelOptOutTime.load();

    const lastOptOutTime = mellowtelOptOutTime.get();
    const timeToRemindForSupport = lastOptOutTime + mellowtelReminderDuration < Date.now();
    if (!timeToRemindForSupport) {
      return { enabled: true };
    }

    try {
      const { status } = await mellowtelStatus();
      return {
        enabled: status === "installed",
      }
    } catch (err) {
      console.error(`[MELLOWTEL]: failed to get status`, String(err));
      return {};
    }
  },
});

export interface MellowtelStatus {
  user_id: string;
  status: 'not_started' | 'in_progress' | 'installed';
  in_progress: number;
  installed: number | null;
  uninstalled: number | null;
  timestamps: {
    in_progress_date: string; // ISO timestamp
    installed_date: string | null;
    uninstalled_date: string | null;
  };
}

async function mellowtelStatus(): Promise<MellowtelStatus> {
  return fetch(mellowtelStatusUrl, {
    credentials: "include"
  }).then(res => res.json());
}
