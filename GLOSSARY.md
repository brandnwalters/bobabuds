# Glossary

Use these terms exactly in code, tests, docs, and UI copy.

- **Log** — one drink a user had: shop location, shop drink, rating, plus optional details. Table `logs`. Not "post", "review", or "entry".
- **Shop location** (code: `shop`) — one physical place, identified by a Google Place ID. Two locations of the same chain are two shops.
- **Brand** — a chain that owns many shop locations (e.g. Gong Cha). Optional on a shop; no brand pages in v1.
- **Shop drink** — a drink on one shop location's menu, created the first time someone logs it there. Table `shop_drinks`.
- **Normalized name** — a shop drink's name lowercased, trimmed, with whitespace collapsed; used to match logs to an existing shop drink.
- **Category** — set on the log; the drink's type from a fixed list: milk tea, fruit tea, matcha, coffee, slush, other.
- **Customizations** — sugar level, ice level, and toppings on a log.
- **Topping** — an add-in (tapioca, lychee jelly, cheese foam…). Seeded list plus custom free text.
- **Rating** — 1.0–10.0 in 0.5 steps.
- **Drank on** — the date (no time) a log's drink was had. The only time information ever shown publicly.
- **Follow** — one-way: a follower sees a followee's logs in their Following feed.
- **Following feed** — logs from people you follow, newest first.
- **Explore feed** — recent logs from everyone, newest first.
- **Report** — a row in `reports`: one user flagging one log for the owner to review by hand.
- **Places client** — the interface the app uses to search Google Places; tests use a fake implementation.
