# Shield of the Spirits Automation

A Foundry VTT module for **Pathfinder 2e** that automates the Champion's **Shield of the Spirits** reactive spirit damage.

When an enemy makes any attack against an ally protected by the champion's aura, this module automatically rolls spirit damage and posts a damage card to chat. The GM then clicks the apply button — PF2e handles weakness, resistance, immunity, and everything else.

The trigger fires on **any action with the Attack trait** — Strikes, Trip, Grapple, Disarm, Shove, Knockdown, spell attacks, and more. Hit or miss, the spirit damage fires as written.

---

## Preview



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

## How it decides when to trigger

The module watches every chat message and checks:

1. **Is this an Attack-trait action?** It checks multiple places in the PF2e message data for the "attack" trait — not just Strikes, but also Trip, Grapple, Disarm, Shove, Knockdown, and any other action with the Attack trait.
2. **Is the attacker an enemy of the champion?** Uses PF2e alliance data (party vs. opposition).
3. **Is the target an ally of the champion?** Same alliance check.
4. **Is the target within the champion's aura?** First checks whether PF2e's aura system granted the effect to the ally. If not, falls back to measuring distance between tokens (--> configurable, see Settings).
5. **Is the champion the real owner of the effect?** Only the actual caster triggers the damage — allies who received the aura effect are not treated as owners.
6. **Has this attack already been processed?** Each attack triggers at most once per champion.

If all checks pass, spirit damage is rolled and posted.

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

## Troubleshooting

### The module isn't triggering at all

1. **Is the module enabled?** Check Settings → Manage Modules.
2. **Is the GM logged in?** Only the GM client processes triggers.
3. **Is the champion's effect active?** Check the champion's token — the effect must be present and not expired.
4. **Does the slug match?** Enable Debug Logging, then run this in the browser console (F12) with the champion selected:
   ```js
   _token.actor.items.filter(i => i.type === "effect").map(i => ({ name: i.name, slug: i.slug }))
   ```
   If the slug doesn't match the built-in defaults, paste it into the **Effect Slug Overrides** setting.
5. **Is the ally in range?** If the aura system isn't granting the effect, make sure Use Distance Fallback is enabled and the ally is within the configured radius.

### It triggers for the wrong token / doesn't detect the champion

- Only the actual caster of Shield of the Spirits is treated as an aura owner. Allies who received the effect via the aura are correctly excluded.
- If a champion's own effect is being rejected, enable Debug Logging and look for "Owner candidate rejected" — this will show why.

### Two damage cards appear

- Check if you have two champions with overlapping auras. With **Multiple Aura Behavior** set to "All", each champion triggers separately — this is correct per RAW.
- To limit it to one, switch to "Closest".

---

## Known limitations

1. **Distance fallback is simple.** It measures straight-line distance and doesn't account for walls, line-of-sight, or elevation. It's a safety net for when PF2e's built-in aura system doesn't grant the effect.
2. **PF2e version sensitivity.** The module reads PF2e-specific data structures from chat messages and actor items. A major PF2e system update could change these. If the module stops working after an update, check the GitHub for a fix.

---

## License

MIT
