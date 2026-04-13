import { MODULE_ID, PROCESSED_CACHE_MAX } from "./constants.js";
import { log } from "./debug.js";
import {
  extractAttackContext,
  resolveToken,
  areEnemies,
  areAllies,
} from "./helpers/attack-context.js";
import {
  findAuraOwners,
  isProtectedByAura,
  getEffectRank,
  getOwnerDistanceToDefender,
} from "./helpers/aura-protection.js";
import { rollSpiritDamage } from "./helpers/damage.js";

/** @type {Set<string>} */
const processedAttacks = new Set();

/** Main handler for `createChatMessage`. Only runs on the GM client. */
export async function onAttackMessage(message) {
  if (!game.user.isGM) return;

  if (message.flags?.[MODULE_ID]) return;

  const ctx = extractAttackContext(message);
  if (!ctx.isAttack) return;

  const attackerToken = resolveToken(ctx.attackerTokenId);
  const defenderToken = resolveToken(ctx.defenderTokenId);

  if (!attackerToken) {
    log("No attacker token resolved, skipping.");
    return;
  }
  if (!defenderToken) {
    log("No defender token resolved, skipping.");
    return;
  }

  log(`Attack detected: ${attackerToken.name} → ${defenderToken.name}`);

  const auraOwners = findAuraOwners();
  if (auraOwners.length === 0) {
    log("No Shield of the Spirits aura owners on scene.");
    return;
  }

  const qualifying = [];
  for (const owner of auraOwners) {
    if (isQualifyingTrigger(owner, attackerToken, defenderToken, message)) {
      qualifying.push(owner);
    }
  }

  if (qualifying.length === 0) {
    log("No qualifying aura owners for this attack.");
    return;
  }

  const behavior = game.settings.get(MODULE_ID, "multiAuraBehavior");
  const toTrigger =
    behavior === "closest"
      ? [pickClosestOwner(qualifying, defenderToken)]
      : qualifying;

  for (const { token: ownerToken, effectItem } of toTrigger) {
    const cacheKey = `${message.id}-${ownerToken.id}`;
    markProcessed(cacheKey);

    const rank = getEffectRank(effectItem);
    log(
      `TRIGGER: ${ownerToken.name} (rank ${rank}) → spirit damage against ${attackerToken.name}`,
    );

    await rollSpiritDamage(attackerToken, defenderToken, ownerToken, { rank });
  }
}

/** Dedup + enemy/ally + aura coverage check for one owner. */
function isQualifyingTrigger(
  { token: ownerToken, actor: ownerActor, effectItem },
  attackerToken,
  defenderToken,
  message,
) {
  const cacheKey = `${message.id}-${ownerToken.id}`;

  if (processedAttacks.has(cacheKey)) {
    log(`Dedup: already processed ${cacheKey}`);
    return false;
  }

  if (!areEnemies(attackerToken, ownerToken)) {
    log(`${attackerToken.name} is not an enemy of ${ownerToken.name}`);
    return false;
  }

  if (!areAllies(defenderToken, ownerToken)) {
    log(`${defenderToken.name} is not an ally of ${ownerToken.name}`);
    return false;
  }

  if (!isProtectedByAura(defenderToken, ownerToken, ownerActor, effectItem)) {
    log(`${defenderToken.name} is not in ${ownerToken.name}'s aura`);
    return false;
  }

  return true;
}

/** Pick the owner closest to the defender. */
function pickClosestOwner(owners, defenderToken) {
  let best = owners[0];
  let bestDist = Infinity;

  for (const owner of owners) {
    const dist = getOwnerDistanceToDefender(owner.token, defenderToken);
    if (dist !== null && dist < bestDist) {
      bestDist = dist;
      best = owner;
    }
  }

  log(
    `Closest aura owner: ${best.token.name} (${bestDist === Infinity ? "distance unknown" : bestDist.toFixed(1) + " ft"})`,
  );
  return best;
}

function markProcessed(key) {
  processedAttacks.add(key);

  if (processedAttacks.size > PROCESSED_CACHE_MAX) {
    const entries = [...processedAttacks];
    const removeCount = Math.floor(entries.length / 2);
    for (let i = 0; i < removeCount; i++) {
      processedAttacks.delete(entries[i]);
    }
    log(`Pruned dedup cache: ${entries.length} → ${processedAttacks.size}`);
  }
}

export function clearProcessedCache() {
  processedAttacks.clear();
  log("Dedup cache cleared.");
}
