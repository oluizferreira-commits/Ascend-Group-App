import { cookies } from "next/headers";

export type ThemeMode = "system" | "light" | "dark";

export async function getThemeMode(): Promise<ThemeMode> {
  const v = (await cookies()).get("ascend_theme")?.value;
  return v === "light" || v === "dark" ? v : "system";
}
