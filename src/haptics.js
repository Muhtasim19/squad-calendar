// // Tiny haptics helper — silently does nothing on web
// import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

// const isNative = window.Capacitor?.isNativePlatform?.() || false;

// export async function tapLight() {
//   if (!isNative) return;
//   try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
// }

// export async function tapMedium() {
//   if (!isNative) return;
//   try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch {}
// }

// export async function buzzSuccess() {
//   if (!isNative) return;
//   try { await Haptics.notification({ type: NotificationType.Success }); } catch {}
// }

// Haptics disabled — native plugin removed (crashed on iOS 27 plugin load).
// These no-ops keep every existing import/call working without the native dependency.
export async function tapLight()   {}
export async function tapMedium()  {}
export async function buzzSuccess() {}