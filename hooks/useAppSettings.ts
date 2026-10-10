import { useEffect, useSyncExternalStore } from "react";
import {
  applyStoredSettings,
  getSettingsServerSnapshot,
  getSettingsSnapshot,
  subscribeSettings,
  updateSettings,
} from "@/lib/db/local-settings";

export function useAppSettings() {
  const settings = useSyncExternalStore(
    subscribeSettings,
    getSettingsSnapshot,
    getSettingsServerSnapshot,
  );

  useEffect(() => {
    applyStoredSettings();
  }, []);

  return { settings, updateSettings };
}
