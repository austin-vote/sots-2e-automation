import { MODULE_ID, DEFAULT_AURA_RADIUS_FT } from "./constants.js";
import { refreshDebug } from "./debug.js";
import { getEffectSlugs as _getEffectSlugs } from "./settings-helpers.js";

export function registerSettings() {
  game.settings.register(MODULE_ID, "debugLogging", {
    name: "Debug Logging",
    hint: "Enable verbose console logging for troubleshooting. Check the browser console (F12).",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: () => refreshDebug(),
  });

  game.settings.register(MODULE_ID, "effectSlugs", {
    name: "Effect Slug Overrides",
    hint: "Comma-separated item slugs to match the Shield of the Spirits effect. Leave blank to use built-in defaults.",
    scope: "world",
    config: true,
    type: String,
    default: "",
  });

  game.settings.register(MODULE_ID, "auraRadiusFt", {
    name: "Aura Radius (feet)",
    hint: "Distance in feet for the champion's aura protection radius. Used by the distance fallback.",
    scope: "world",
    config: true,
    type: Number,
    default: DEFAULT_AURA_RADIUS_FT,
  });

  game.settings.register(MODULE_ID, "useDistanceFallback", {
    name: "Use Distance Fallback",
    hint: "When enabled, falls back to measuring token distance if the granted aura effect is not detected on the defender. Does not account for walls or line-of-sight.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(MODULE_ID, "multiAuraBehavior", {
    name: "Multiple Aura Behavior",
    hint: "When multiple champions' auras cover the same ally: 'all' triggers each independently (RAW), 'closest' triggers only the nearest champion.",
    scope: "world",
    config: true,
    type: String,
    default: "all",
    choices: {
      all: "All qualifying champions trigger (RAW)",
      closest: "Only the closest champion triggers",
    },
  });
}

export { _getEffectSlugs as getEffectSlugs };
