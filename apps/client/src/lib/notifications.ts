import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

import type { AppSettings } from "../types";

export const DAILY_REMINDER_ID = 120;

export const parseReminderTime = (value: string) => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) throw new Error("Укажи время в формате ЧЧ:ММ");
  return { hour: Number(match[1]), minute: Number(match[2]) };
};

export const remindersAvailable = () => Capacitor.isNativePlatform();

export async function synchronizeDailyReminder(
  settings: Pick<AppSettings, "reminderEnabled" | "reminderTime">,
  requestPermission: boolean,
) {
  if (!remindersAvailable()) return { available: false, scheduled: false };

  await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_ID }] });
  if (!settings.reminderEnabled) return { available: true, scheduled: false };

  let permission = await LocalNotifications.checkPermissions();
  if (permission.display !== "granted" && requestPermission) {
    permission = await LocalNotifications.requestPermissions();
  }
  if (permission.display !== "granted") {
    if (requestPermission) throw new Error("Разреши уведомления в настройках Android");
    return { available: true, scheduled: false };
  }

  const { hour, minute } = parseReminderTime(settings.reminderTime);
  await LocalNotifications.schedule({
    notifications: [
      {
        id: DAILY_REMINDER_ID,
        title: "Frontend Sprint",
        body: "Пора выделить 120 минут на подготовку к собеседованию.",
        schedule: { on: { hour, minute }, repeats: true },
      },
    ],
  });
  return { available: true, scheduled: true };
}
