import { MODULE_ID } from "../constants.js";
import { log } from "../debug.js";
import { getEffectSlugs } from "../settings-helpers.js";

/**
 * Finds all tokens that are true SOTS aura owners (the champion, not recipients).
 * Returns an array of { token, actor, effectItem }.
 *
 * @returns {Array<{ token: TokenDocument, actor: Actor, effectItem: Item }>}
 */
export function findAuraOwners() {
  const scene = canvas.scene;
  if (!scene) return [];

  const slugs = getEffectSlugs();
  const owners = [];

  for (const tokenDoc of scene.tokens) {
    const actor = tokenDoc.actor;
    if (!actor) continue;

    const ownerEffect = findOwnerShieldEffect(actor, slugs);
    if (ownerEffect) {
      owners.push({ token: tokenDoc, actor, effectItem: ownerEffect });
      log(`Owner candidate accepted: ${actor.name} (source SOTS effect: ${ownerEffect.name})`);
    }
  }

  return owners;
}

/**
 * Finds the OWNER-SIDE SOTS effect on an actor — the source effect, not a
 * granted copy. Rejects effects whose origin points to a different actor.
 *
 * @param {Actor} actor
 * @param {string[]} [slugs]
 * @returns {Item|null}
 */
function findOwnerShieldEffect(actor, slugs) {
  if (!actor) return null;
  const slugList = slugs ?? getEffectSlugs();
  const actorId = actor.id;

  for (const item of actor.items) {
    const isEffect =
      typeof item.isOfType === "function" ? item.isOfType("effect") : item.type === "effect";
    if (!isEffect) continue;
    if (item.isExpired) continue;

    const itemSlug = (item.slug ?? item.system?.slug ?? "").toLowerCase();
    const slugMatch = itemSlug && slugList.includes(itemSlug);

    const sourceId = (item.flags?.core?.sourceId ?? item.sourceId ?? "").toLowerCase();
    const sourceMatch = sourceId && slugList.some((s) => sourceId.includes(s));

    if (!slugMatch && !sourceMatch) continue;

    if (isGrantedFromAnotherActor(item, actorId)) {
      log(`Owner candidate rejected: ${actor.name} — effect "${item.name}" has origin from another actor (granted aura recipient, not source)`);
      continue;
    }

    return item;
  }

  return null;
}

/**
 * True when the effect was granted by a different actor's aura (not the source).
 * Checks `flags.pf2e.aura.origin` (only set on aura-granted copies) and
 * `system.context.origin.actor` (normalised from UUID to bare ID).
 *
 * @param {Item} item
 * @param {string} actorId - Bare ID of the item's owning actor.
 * @returns {boolean}
 */
function isGrantedFromAnotherActor(item, actorId) {
  // PF2e stamps this only on effects applied by another actor's Aura rule.
  const auraOrigin = item.flags?.pf2e?.aura?.origin;
  if (auraOrigin && typeof auraOrigin === "string") {
    const auraActorId = auraOrigin.includes(".") ? auraOrigin.split(".").at(-1) : auraOrigin;
    if (auraActorId !== actorId) return true;
  }

  // PF2e stores this as "Actor.abc123" — normalise before comparing.
  const ctxOriginActor = item.system?.context?.origin?.actor;
  if (ctxOriginActor && typeof ctxOriginActor === "string") {
    const ctxActorId = ctxOriginActor.includes(".") ? ctxOriginActor.split(".").at(-1) : ctxOriginActor;
    if (ctxActorId !== actorId) return true;
  }

  return false;
}

export { findOwnerShieldEffect as findShieldEffect };

/**
 * Reads the spell rank from the effect item for heightened damage scaling.
 * Falls back to 1 if undetermined.
 *
 * @param {Item} effectItem
 * @returns {number}
 */
export function getEffectRank(effectItem) {
  if (!effectItem) return 1;

  const rank =
    effectItem.system?.level?.value ??
    effectItem.level ??
    effectItem.system?.rank ??
    null;

  if (typeof rank === "number" && rank >= 1) return rank;

  log("getEffectRank: could not determine rank, defaulting to 1");
  return 1;
}

/**
 * Reads the aura radius from the effect's Aura rule element.
 * Returns null if no radius can be determined.
 *
 * @param {TokenDocument} _ownerToken
 * @param {Item} effectItem
 * @returns {number|null} Radius in feet.
 */
export function getAuraRadius(_ownerToken, effectItem) {
  if (!effectItem) return null;

  const rules = effectItem.system?.rules;
  if (Array.isArray(rules)) {
    for (const rule of rules) {
      if (!rule || typeof rule !== "object") continue;
      if ((rule.key ?? "").toLowerCase() !== "aura") continue;

      const radius = rule.radius ?? rule.distance ?? rule.value ?? null;
      if (typeof radius === "number" && radius > 0) {
        log(`getAuraRadius: Aura rule element radius ${radius} ft`);
        return radius;
      }
    }
  }

  const area = effectItem.system?.area?.value;
  if (typeof area === "number" && area > 0) {
    log(`getAuraRadius: item.system.area.value = ${area} ft`);
    return area;
  }

  log("getAuraRadius: no radius found");
  return null;
}

/**
 * Returns true if the defender is within the owner's SOTS aura.
 * Checks for a granted aura effect first, then falls back to distance.
 *
 * @param {TokenDocument} defenderToken
 * @param {TokenDocument} ownerToken
 * @param {Actor} _ownerActor
 * @param {Item} [effectItem]
 * @returns {boolean}
 */
export function isProtectedByAura(defenderToken, ownerToken, _ownerActor, effectItem) {
  if (!defenderToken || !ownerToken) return false;
  if (defenderToken.id === ownerToken.id) return false;

  if (hasGrantedAuraEffect(defenderToken, ownerToken)) {
    log("Defender", defenderToken.name, "has granted aura effect from", ownerToken.name);
    return true;
  }

  const useFallback = game.settings.get(MODULE_ID, "useDistanceFallback");
  if (!useFallback) {
    log("Distance fallback disabled; defender not confirmed as protected.");
    return false;
  }

  const radiusFt = getAuraRadius(ownerToken, effectItem)
    ?? game.settings.get(MODULE_ID, "auraRadiusFt");
  const distance = measureTokenDistance(ownerToken, defenderToken);
  if (distance === null) {
    log("Could not measure distance between tokens.");
    return false;
  }

  const inRange = distance <= radiusFt;
  log(`Distance fallback: ${distance.toFixed(1)} ft vs ${radiusFt} ft radius => ${inRange ? "IN RANGE" : "OUT OF RANGE"}`);
  return inRange;
}

/**
 * @param {TokenDocument} ownerToken
 * @param {TokenDocument} defenderToken
 * @returns {number|null}
 */
export function getOwnerDistanceToDefender(ownerToken, defenderToken) {
  return measureTokenDistance(ownerToken, defenderToken);
}

/** Checks if the defender has a granted SOTS effect originating from the owner. */
function hasGrantedAuraEffect(defenderToken, ownerToken) {
  const defenderActor = defenderToken.actor;
  if (!defenderActor) return false;

  const ownerActorId = ownerToken.actor?.id;
  const ownerTokenId = ownerToken.id;
  if (!ownerActorId) return false;

  const slugs = getEffectSlugs();

  for (const item of defenderActor.items) {
    const isEffect =
      typeof item.isOfType === "function" ? item.isOfType("effect") : item.type === "effect";
    if (!isEffect) continue;
    if (item.isExpired) continue;

    const itemSlug = (item.slug ?? item.system?.slug ?? "").toLowerCase();
    if (!slugs.includes(itemSlug)) continue;

    const ctxOrigin = item.system?.context?.origin;
    if (ctxOrigin) {
      if (ctxOrigin.actor === ownerActorId || ctxOrigin.token === ownerTokenId) return true;
    }

    const auraFlag = item.flags?.pf2e?.aura;
    if (auraFlag) {
      const auraOrigin = auraFlag.origin;
      if (auraOrigin === ownerActorId || auraOrigin === ownerTokenId) return true;
      if (typeof auraOrigin === "string" && auraOrigin.includes(ownerActorId)) return true;
    }

    const genericOrigin = item.origin;
    if (typeof genericOrigin === "string" && genericOrigin.includes(ownerActorId)) return true;
  }

  return false;
}

/** Straight-line distance in feet. Does not account for walls or elevation. */
function measureTokenDistance(tokenA, tokenB) {
  try {
    const objA = tokenA.object;
    const objB = tokenB.object;
    if (!objA || !objB) return null;

    const ray = new Ray(objA.center, objB.center);
    const segments = [{ ray }];
    const distance = canvas.grid.measureDistances(segments, { gridSpaces: true })[0];
    return typeof distance === "number" ? distance : null;
  } catch (e) {
    log("measureTokenDistance failed:", tokenA?.name, "↔", tokenB?.name, e.message);
    return null;
  }
}
