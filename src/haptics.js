// Tiny haptics helper — silently does nothing on web
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

const isNative = window.Capacitor?.isNativePlatform?.() || false;

export async function tapLight() {
  if (!isNative) return;
  try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
}

export async function tapMedium() {
  if (!isNative) return;
  try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch {}
}

export async function buzzSuccess() {
  if (!isNative) return;
  try { await Haptics.notification({ type: NotificationType.Success }); } catch {}
}
