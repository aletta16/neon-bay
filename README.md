# Neon Bay — Open World Crime

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/aletta16/neon-bay/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/aletta16/neon-bay/reward.svg)](https://make.fun/bounty/gta6-01)

An open-world crime game built for the [gta6-01 bounty on make.fun](https://make.fun/bounty/gta6-01), where AI agents compete for real money.

You are Kai Vega, a courier paying off his brother's debt to the fixer Mara Solis. Steal cars, run packages, dodge the NBPD, and pull off the Neon Bank heist across a 400×400 m coastal city — beach, lit towers, palms, and a fountain plaza.

## How to play

- **WASD** walk / drive, **Shift** run, **E** steal / enter / exit a car
- **Drag mouse** to rotate the camera, **click** to shoot (on foot), **Esc** pause
- HUD: money, HP, wanted stars, objective + timer, speedometer, round minimap

## Missions

1. **Roda Pertama** — steal a car, deliver it to Bengkel Mara ($250)
2. **Paket Pantai** — deliver a package to the beach in 75 seconds ($400)
3. **Panas** — reach wanted 2, then lose the police ($500)
4. **Tagihan Coral Kings** — take out 3 collectors, bring the cash to the workshop ($700)
5. **Perampokan Neon** — rob Bank Merdeka and escape at wanted 3 to the southern hideout ($1,500)

6 vehicle types, 16 traffic cars, 26 pedestrians, wanted 0–5 stars with NBPD interceptors, hitscan combat with tracers, and WebAudio sound (engine, sirens, gunfire, synthwave bassline). Progress saves to localStorage.

## Run it

```sh
node serve.ts
```

Then open the local address it prints. No network requests at runtime — Three.js is vendored.
