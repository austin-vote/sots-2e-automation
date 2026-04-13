import { MODULE_ID, DEFAULT_EFFECT_SLUGS } from "./constants.js";

/** Returns user-overridden slugs if set, otherwise the built-in defaults. */
export function getEffectSlugs() {
  try {
    const override = game.settings.get(MODULE_ID, "effectSlugs");
    if (override && override.trim().length > 0) {
      return override
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
    }
  } catch {}
  return DEFAULT_EFFECT_SLUGS;
}
