import { MODULE_ID } from "./constants.js";
import { registerSettings } from "./settings.js";
import { initDebug, log } from "./debug.js";
import {
  onAttackMessage,
  clearProcessedCache,
} from "./shield-of-the-spirits.js";

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing Shield of the Spirits automation.`);
  registerSettings();
});

Hooks.once("ready", () => {
  initDebug();
  log("Module ready.");

  Hooks.on("createChatMessage", (message) => {
    onAttackMessage(message);
  });

  Hooks.on("updateCombat", (_combat, change) => {
    if ("round" in change || "turn" in change) {
      clearProcessedCache();
    }
  });

  log("Hooks registered. Shield of the Spirits is active.");
});
