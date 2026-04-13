import { log } from "../debug.js";

/**
 * @typedef {Object} AttackContext
 * @property {boolean} isAttack
 * @property {string}  detectedVia
 * @property {string|null} attackerTokenId
 * @property {string|null} attackerActorId
 * @property {string|null} defenderTokenId
 * @property {string|null} defenderActorId
 */

const EMPTY_CONTEXT = Object.freeze({
  isAttack: false,
  detectedVia: "",
  attackerTokenId: null,
  attackerActorId: null,
  defenderTokenId: null,
  defenderActorId: null,
});

/**
 * Extracts attack context from a PF2e chat message.
 * Returns `EMPTY_CONTEXT` when the message is not an attack-trait action.
 *
 * @param {ChatMessage} message
 * @returns {AttackContext}
 */
export function extractAttackContext(message) {
  if (!message) return EMPTY_CONTEXT;

  const pf2eFlags = message.flags?.pf2e;
  if (!pf2eFlags) {
    log("extractAttackContext: no flags.pf2e on message", message.id);
    return EMPTY_CONTEXT;
  }

  const context = pf2eFlags.context;
  if (!context || typeof context !== "object") {
    // No context block — some action cards (Knockdown, etc.) carry the attack
    // trait in flags.pf2e.traits or flags.pf2e.origin.traits instead.
    const detectedVia = detectAttack({}, pf2eFlags);
    if (!detectedVia) {
      log("extractAttackContext: no context block and no attack trait in flags", message.id);
      return EMPTY_CONTEXT;
    }

    const target = pf2eFlags.target ?? null;
    const speaker = message.speaker;
    const attackerTokenId = asStringOrNull(speaker?.token);
    const attackerActorId = asStringOrNull(speaker?.actor);
    const defenderTokenId = asStringOrNull(target?.token);
    const defenderActorId = asStringOrNull(target?.actor);

    if ((!attackerTokenId && !attackerActorId) || (!defenderTokenId && !defenderActorId)) {
      log("extractAttackContext: flags-only attack but attacker/defender unresolvable", message.id);
      return EMPTY_CONTEXT;
    }

    log(`extractAttackContext: flags-only attack via ${detectedVia}`);
    return { isAttack: true, detectedVia, attackerTokenId, attackerActorId, defenderTokenId, defenderActorId };
  }

  const detectedVia = detectAttack(context, pf2eFlags);
  if (!detectedVia) {
    log("extractAttackContext: skipped (no attack trait)", {
      messageId: message.id,
      type: context.type,
      options: context.options,
      ctxTraits: context.traits,
      domains: context.domains,
      flagTraits: pf2eFlags.traits,
      originTraits: pf2eFlags.origin?.traits,
    });
    return EMPTY_CONTEXT;
  }

  log(`extractAttackContext: detected attack via ${detectedVia}`);

  const speaker = message.speaker;
  const attackerTokenId = asStringOrNull(speaker?.token);
  const attackerActorId = asStringOrNull(speaker?.actor);

  const target = context.target;
  if (!target) {
    log("extractAttackContext: no context.target (untargeted attack?)", message.id);
  }
  const defenderTokenId = asStringOrNull(target?.token);
  const defenderActorId = asStringOrNull(target?.actor);

  if (!attackerTokenId && !attackerActorId) {
    log("extractAttackContext: attacker unresolvable", message.id);
    return EMPTY_CONTEXT;
  }
  if (!defenderTokenId && !defenderActorId) {
    log("extractAttackContext: defender unresolvable", message.id);
    return EMPTY_CONTEXT;
  }

  const result = {
    isAttack: true,
    detectedVia,
    attackerTokenId,
    attackerActorId,
    defenderTokenId,
    defenderActorId,
  };

  log("extractAttackContext:", result);
  return result;
}

/**
 * Checks multiple PF2e data locations for the Attack trait.
 * Returns a descriptive string on match, or null.
 *
 * @param {object} context   - flags.pf2e.context (may be empty `{}`).
 * @param {object} pf2eFlags - The full flags.pf2e object.
 * @returns {string|null}
 */
function detectAttack(context, pf2eFlags) {
  if (context.type === "damage-roll") {
    return null;
  }

  const options = context.options;
  if (Array.isArray(options) && options.includes("trait:attack")) {
    return "trait:attack in context.options";
  }

  if (context.type === "attack-roll") {
    return "context.type=attack-roll";
  }

  const ctxTraits = context.traits;
  if (Array.isArray(ctxTraits) && ctxTraits.some((t) => String(t).toLowerCase() === "attack")) {
    return "attack in context.traits";
  }

  const domains = context.domains;
  if (Array.isArray(domains) && domains.some((d) => d === "attack" || d === "attack-roll")) {
    return "attack in context.domains";
  }

  const flagTraits = pf2eFlags?.traits;
  if (Array.isArray(flagTraits) && flagTraits.some((t) => String(t).toLowerCase() === "attack")) {
    return "attack in flags.pf2e.traits";
  }

  const originTraits = pf2eFlags?.origin?.traits;
  if (Array.isArray(originTraits) && originTraits.some((t) => String(t).toLowerCase() === "attack")) {
    return "attack in flags.pf2e.origin.traits";
  }

  return null;
}

/**
 * Resolves a TokenDocument from a token ID (or full UUID) on the current scene.
 * PF2e may provide a UUID like "Scene.xxx.Token.yyy" — we strip to bare ID.
 *
 * @param {string|null} tokenId
 * @returns {TokenDocument|null}
 */
export function resolveToken(tokenId) {
  if (!tokenId) return null;
  const bareId = tokenId.includes(".") ? tokenId.split(".").at(-1) : tokenId;
  return canvas.scene?.tokens?.get(bareId) ?? null;
}

/** @param {string|null} actorId @returns {Actor|null} */
export function resolveActor(actorId) {
  if (!actorId) return null;
  return game.actors?.get(actorId) ?? null;
}

/**
 * Returns true if tokenA and tokenB belong to opposing alliances.
 * Uses PF2e `actor.alliance`, falling back to Foundry token disposition.
 *
 * @param {TokenDocument} tokenA
 * @param {TokenDocument} tokenB
 * @returns {boolean}
 */
export function areEnemies(tokenA, tokenB) {
  if (!tokenA || !tokenB) return false;

  const allianceA = getAlliance(tokenA);
  const allianceB = getAlliance(tokenB);

  if (allianceA && allianceB) {
    return allianceA !== allianceB;
  }

  const dispA = tokenA.disposition;
  const dispB = tokenB.disposition;
  if (dispA != null && dispB != null) {
    const { FRIENDLY, HOSTILE } = CONST.TOKEN_DISPOSITIONS;
    return (dispA === FRIENDLY && dispB === HOSTILE) || (dispA === HOSTILE && dispB === FRIENDLY);
  }

  log("areEnemies: could not determine alliance, defaulting to false");
  return false;
}

/**
 * Returns true if tokenA and tokenB share the same alliance.
 *
 * @param {TokenDocument} tokenA
 * @param {TokenDocument} tokenB
 * @returns {boolean}
 */
export function areAllies(tokenA, tokenB) {
  if (!tokenA || !tokenB) return false;
  if (tokenA.id === tokenB.id) return true;

  const allianceA = getAlliance(tokenA);
  const allianceB = getAlliance(tokenB);

  if (allianceA && allianceB) {
    return allianceA === allianceB;
  }

  const dispA = tokenA.disposition;
  const dispB = tokenB.disposition;
  if (dispA != null && dispB != null) {
    return dispA === dispB;
  }

  log("areAllies: could not determine alliance, defaulting to false");
  return false;
}

function getAlliance(tokenDoc) {
  return tokenDoc.actor?.alliance ?? null;
}

function asStringOrNull(val) {
  if (typeof val === "string" && val.length > 0) return val;
  return null;
}
