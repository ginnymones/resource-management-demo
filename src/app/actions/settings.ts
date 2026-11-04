"use server";

import { prisma } from "@/lib/prisma";

/**
 * Get a setting value by key.
 */
export async function getSetting(key: string): Promise<string | null> {
  const setting = await prisma.setting.findUnique({ where: { key } });
  return setting?.value ?? null;
}

/**
 * Set a setting value (upsert).
 */
export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

/**
 * Check whether the Climate page is enabled.
 * Defaults to true (enabled) if no setting exists.
 */
export async function isClimateEnabled(): Promise<boolean> {
  const val = await getSetting("climate_enabled");
  return val !== "false";
}
