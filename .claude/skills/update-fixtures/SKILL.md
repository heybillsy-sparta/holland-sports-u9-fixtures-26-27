---
name: update-fixtures
description: Check the FA Full-Time site for new or changed Holland Sports U9 Harriers fixtures, compare them against U9_Fixtures.ics, and — once the user confirms — update the ICS and push to main. Use whenever the user wants to refresh the fixtures calendar, check for new fixtures, or asks "any new fixtures?".
---

# Update the U9 fixtures calendar

Refresh `U9_Fixtures.ics` from the FA Full-Time site. The ICS is a live
subscription for other parents, but the user has given standing authorisation
to apply and push updates **without** asking first — they will check the result
afterwards and ask for a correction if anything is wrong. Report what changed;
do not stop for confirmation.

## Step 1 — Fetch the fixtures (use a browser, not curl)

`scripts/fetch-fixtures.ts` and plain `curl` **do not work**, and this is not
worth re-litigating each time. `fulltime.thefa.com` sits behind Cloudflare,
which fingerprints the TLS ClientHello (JA3/JA4). curl on macOS uses
LibreSSL/SecureTransport, so it is blocked at the handshake, before any header
is sent — a full, perfect Chrome header set over HTTP/2 still returns `403`
with a ~450KB "Attention Required!" page. There is no clearance cookie to
lift across: a real browser gets `200` on its *first* request, so Cloudflare is
allowing on fingerprint, not challenging then clearing.

So use the in-app browser. Load the fixtures URL from `README.md`
("Source of fixture data") with `mcp__Claude_Browser__preview_start`.

Then **verify the filters actually applied** before trusting the rows — the
URL carries a lot of state and a redirect can drop it:

```js
JSON.stringify([...document.querySelectorAll('select')]
  .map(s => ({name: s.name || s.id, val: s.value, text: (s.selectedOptions[0]||{}).text})))
```

Expected: season `2026-27`, fixture group `U9`, club `Holland Sports Youth`,
team `Holland Sports Youth U9 Harriers`, date `All`, fixtures `Include other
groups and County Cups`. If any differ, fix them before reading rows.

Extract the rows (the table is server-rendered — there is no JSON endpoint to
intercept, and no iCal feed on the page):

```js
JSON.stringify([...document.querySelectorAll('.fixtures-table tr')]
  .map(tr => [...tr.querySelectorAll('th,td')].map(c => c.innerText.replace(/\s+/g,' ').trim())))
```

Notes on reading the output:
- A time of `00:00` means **the league has not set a kick-off time** — it does
  not mean midnight. Keep the event all-day; never invent a time.
- Check the `Date` dropdown options. If it only offers one date, that is all
  the league has published — dates absent from Full-Time are *unconfirmed*,
  not cancelled. Leave their `Fixture TBC` events alone.
- Two fixtures on one date is normal at U9 (short games vs two opponents).
  The house style is **one combined all-day event**, not two events.

## Step 2 — Compare against the ICS

For each fixture date, diff Full-Time against the matching `VEVENT` in
`U9_Fixtures.ics` (match on `UID`, which embeds the date:
`u9-fixture-YYYYMMDD@hollandsports`). Report to the user:

- dates where Full-Time now has opponent/venue detail but the ICS still says
  `Fixture TBC`
- dates where opponent, venue or kick-off has **changed**
- fixtures on Full-Time with **no** ICS event at all (need adding)
- ICS dates with no Full-Time data (expected; report as such, change nothing)

Report this diff to the user, then proceed straight to Step 3 — no
confirmation needed (see Step 1).

## Step 3 — Edit the ICS

Rules that matter for subscribers:

- **Never change an existing `UID`.** The UID is what makes calendar apps treat
  this as an *update* to an entry someone already has, rather than a duplicate.
- Bump that event's `DTSTAMP` to now (`YYYYMMDDTHHMMSSZ`) so clients see it as
  revised.
- Keep events all-day: `DTSTART;VALUE=DATE:YYYYMMDD` with `DTEND` the **next**
  day. Only add a timed `DTSTART` if Full-Time shows a real kick-off.
- Escape commas in text values as `\,` (RFC 5545).
- **Fold every line to 75 octets max**, continuations starting with one space.
  This is easy to get wrong by hand and some clients are strict. Refold and
  verify the whole file rather than eyeballing it:

```bash
python3 - <<'EOF'
p='U9_Fixtures.ics'
raw=open(p).read()
unfolded=raw.replace('\n ','')          # unfold first, so re-runs are safe
def fold(line, limit=75):
    b=line.encode(); out=[]; first=True
    while b:
        n = limit if first else limit-1
        chunk=b[:n]
        while chunk and (chunk[-1] & 0xC0) == 0x80: chunk=chunk[:-1]
        out.append(chunk.decode() if first else ' '+chunk.decode())
        b=b[len(chunk):]; first=False
    return '\n'.join(out)
open(p,'w').write('\n'.join(fold(l) if l else l for l in unfolded.split('\n')))
EOF
```

Keep the file's existing **LF** line endings; do not convert to CRLF.

Then validate before committing:

```bash
python3 - <<'EOF'
raw=open('U9_Fixtures.ics').read()
assert not [l for l in raw.split('\n') if len(l.encode())>75], 'line over 75 octets'
assert raw.count('BEGIN:VEVENT')==raw.count('END:VEVENT'), 'unbalanced VEVENT'
assert '\r' not in raw, 'unexpected CRLF'
u=raw.replace('\n ','')
print('events:', raw.count('BEGIN:VEVENT'))
for l in u.split('\n'):
    if l.startswith(('SUMMARY','LOCATION','DTSTART')): print(l)
EOF
```

Review `git diff U9_Fixtures.ics` and confirm **only** the intended events
changed — the refold step touches the whole file, so check nothing else moved.

## Step 4 — Push

The user's standing preference is to commit and push straight to `main`, since
that is what updates live subscribers. Once the validation above passes and the
diff shows only the intended events changed:

```bash
git add -A && git commit && git push origin main
```

Write a commit message that says which fixture changed and what the source
said. Then remind the user that subscribed calendars (Google, Apple, Outlook)
refresh on their own schedule — often several hours — so the change will not
appear instantly.

## Tooling notes

This repo uses **pnpm**, not npm (`pnpm install`, `pnpm run fetch-fixtures`).
Typecheck with `pnpm exec tsc --noEmit`.

Do not "fix" the fetch script by adding headers — see Step 1. If the Cloudflare
block ever needs solving properly, the option is Playwright (a real browser,
~150MB of Chromium); TLS-fingerprint forging tools are not the route.
