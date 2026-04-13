import {
  MODULE_ID,
  SPIRIT_DAMAGE_DIE,
  SPIRIT_DAMAGE_TYPE,
  SPIRIT_BASE_RANK,
  SPIRIT_HEIGHTEN_INTERVAL,
} from "../constants.js";
import { log, warn } from "../debug.js";

/**
 * Builds the heightened damage formula: 1d4 base + 1d4 per 2 ranks above 1.
 *
 * @param {number} rank
 * @returns {string} e.g. "2d4"
 */
export function buildDamageFormula(rank = 1) {
  const effectiveRank = Math.max(1, Math.floor(rank));
  const extraDice = Math.floor((effectiveRank - SPIRIT_BASE_RANK) / SPIRIT_HEIGHTEN_INTERVAL);
  const totalDice = 1 + Math.max(0, extraDice);
  return `${totalDice}${SPIRIT_DAMAGE_DIE}`;
}

/** Resolves PF2e's DamageRoll class, falling back to standard Roll. */
function getDamageRollClass() {
  const cls =
    CONFIG.PF2E?.Dice?.DamageRoll ??
    game.pf2e?.DamageRoll ??
    CONFIG.Dice?.rolls?.find((R) => R.name === "DamageRoll") ??
    null;

  if (!cls) {
    warn("PF2e DamageRoll not found — falling back to standard Roll.");
    return Roll;
  }
  return cls;
}

/**
 * Rolls spirit damage and posts a PF2e-native damage chat card.
 *
 * @param {TokenDocument} attackerToken - The attack source (will receive damage).
 * @param {TokenDocument} defenderToken - The protected ally.
 * @param {TokenDocument} ownerToken    - The champion whose aura triggered.
 * @param {{ rank?: number }} options
 */
export async function rollSpiritDamage(
  attackerToken,
  defenderToken,
  ownerToken,
  { rank = 1 } = {},
) {
  const attackerName = attackerToken.name ?? "Unknown Attacker";
  const defenderName = defenderToken.name ?? defenderToken.actor?.name ?? "Unknown Ally";
  const ownerName = ownerToken.name ?? "Unknown Champion";

  const formula = buildDamageFormula(rank);
  const typedFormula = `${formula}[${SPIRIT_DAMAGE_TYPE}]`;

  try {
    const DamageRoll = getDamageRollClass();
    const roll = new DamageRoll(typedFormula);
    await roll.evaluate();

    const total = Number(roll.total ?? 0);
    if (!Number.isFinite(total) || total < 0) {
      warn("Invalid spirit damage total:", roll.total);
      return;
    }

    const flavor = buildFlavorHtml(defenderName);

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({
        scene: canvas.scene?.id,
        actor: ownerToken.actor?.id,
        token: ownerToken.id,
        alias: ownerName,
      }),
      flavor,
      flags: {
        pf2e: {
          context: {
            type: "damage-roll",
            sourceType: "other",
            options: [],
          },
          target: {
            actor: attackerToken.actor?.uuid ?? null,
            token: attackerToken.uuid ?? null,
          },
        },
        [MODULE_ID]: {
          isShieldOfTheSpirits: true,
          attackerTokenId: attackerToken.id,
          defenderTokenId: defenderToken.id,
          ownerTokenId: ownerToken.id,
          rank,
        },
      },
    });

    log(`Spirit damage: ${typedFormula} = ${total} against ${attackerName} (rank ${rank})`);
  } catch (e) {
    warn("Failed to roll spirit damage:", e);
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildFlavorHtml(defenderName) {
  const safe = escapeHtml(defenderName);
  return [
    `<div style="border-left: 3px solid #7c5cbf; padding-left: 8px; margin-bottom: 4px;">`,
    `  <strong style="color: #7c5cbf;">Shield of the Spirits</strong><br>`,
    `  <span>Spiritual guardians retaliate against your enemy`,
    `  for attacking <strong>${safe}</strong>.</span>`,
    `</div>`,
  ].join("\n");
}
