# Shield of the Spirits Automation

A Foundry VTT module for **Pathfinder 2e** that automates the Champion's **Shield of the Spirits** reactive spirit damage.

When an enemy makes any attack against an ally protected by the champion's aura, this module automatically rolls spirit damage and posts a damage card to chat. The GM then clicks the apply button — PF2e handles weakness, resistance, immunity, and everything else.

The trigger fires on **any action with the Attack trait** — Strikes, Trip, Grapple, Disarm, Shove, Knockdown, spell attacks, and more. Hit or miss, the spirit damage fires as written.  Damage rolls with the attack trait will not trigger damage.

---

## Preview

<img width="414" height="1510" alt="image" src="https://github.com/user-attachments/assets/c1916332-5120-4076-ad12-8d17f1a1d398" />


---

## Requirements

| Component | Version |
|---|---|
| **Foundry VTT** | v13 |
| **PF2e System** | 7.x |

---

## Installation

### From manifest URL

1. In Foundry, go to **Add-on Modules → Install Module**.
2. Paste this manifest URL:
   ```
   https://raw.githubusercontent.com/austin-vote/sots-2e-automation/main/module.json
   ```
3. Click **Install**.

### Manual install

1. Download or clone the repository into your Foundry `Data/modules/` folder.
2. Make sure `module.json` is at the top level of the module folder.
3. Restart Foundry or reload your world.

### Enable it

Go to **Settings → Manage Modules** and check **Shield of the Spirits Automation**.

---

## How to use it

1. Your champion needs an active **Shield of the Spirits** spell effect on their token.
2. Allies need to be within the champion's aura (the module reads the aura radius from the effect's data).
3. An enemy attacks the protected ally.
4. The module posts a spirit damage card to chat, spoken by the champion.
5. The GM clicks the damage button to apply it to the attacker.

---

## Heightened damage

The base damage is **1d4 spirit**. It scales with spell rank:

| Rank | Damage |
|------|--------|
| 1 | 1d4 |
| 3 | 2d4 |
| 5 | 3d4 |
| 7 | 4d4 |
| 9 | 5d4 |

The module reads the rank from the effect item automatically. If it can't determine the rank, it defaults to 1d4.

---

## Settings

All settings are under **Settings → Module Settings → Shield of the Spirits Automation**.

| Setting | Default | What it does |
|---|---|---|
| **Debug Logging** | Off | Turns on detailed console output (F12) for troubleshooting. |
| **Effect Slug Overrides** | *(empty)* | Override which effect slugs the module looks for. Comma-separated. Leave blank to use built-in defaults. |
| **Aura Radius (feet)** | 15 | Radius used by the distance fallback. |
| **Use Distance Fallback** | On | When the aura system doesn't grant the effect to the ally, fall back to measuring token distance. Does not account for walls or elevation. |
| **Multiple Aura Behavior** | All | When multiple champions cover the same ally: **All** = each champion triggers (RAW), **Closest** = only the nearest one. |

---

## License

MIT
