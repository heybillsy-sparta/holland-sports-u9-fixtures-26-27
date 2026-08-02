# holland-sports-u9-fixtures-26-27

Holland Sports U9 fixtures calendar for 2026/27 season.

This repo hosts a subscribable calendar of Holland Sports U9 football fixture
dates, stored as a single `.ics` file (`U9_Fixtures.ics`). Anyone who
subscribes to it in their calendar app will automatically pick up new
fixtures and date changes whenever this file is updated.

## Subscribing to the calendar

Calendar apps subscribe over HTTP, not to a GitHub UI page, so you need the
**raw** file URL:

1. Open `U9_Fixtures.ics` in this repository on GitHub.
2. Click the **Raw** button.
3. Copy the URL — it will look like:
   `https://raw.githubusercontent.com/<owner>/<repo>/<branch>/U9_Fixtures.ics`

Then add it as a subscription in your calendar app:

- **Google Calendar**: Settings → Add calendar → "From URL", paste the raw
  link.
- **Apple Calendar**: File → New Calendar Subscription, paste the raw link.
- **Outlook**: Add calendar → "Subscribe from web", paste the raw link.

## Updating an existing fixture

1. Open `U9_Fixtures.ics`.
2. Find the `VEVENT` block for the date you want to update (each event's
   `DTSTART` is in `YYYYMMDD` format, and the `UID` includes the same date,
   e.g. `u9-fixture-20260919@hollandsports`).
3. Edit the `SUMMARY` line — replace `Fixture TBC` with the opponent name
   and kick-off time, e.g.:
   `SUMMARY:Holland Sports U9s vs Example FC (10:00 KO)`
4. Commit and push the change.

## Adding a new fixture

1. Copy an existing `VEVENT` block (from `BEGIN:VEVENT` to `END:VEVENT`).
2. Update `DTSTART` and `DTEND` to the new date (both in `YYYYMMDD` format,
   with `DTEND` set to the day after `DTSTART` since these are all-day
   events).
3. Update `UID` to match the new date, e.g. `u9-fixture-20270501@hollandsports`.
4. Commit and push the change.

## Note on update timing

Calendar apps that subscribe to this file (Google Calendar, Apple Calendar,
Outlook, etc.) typically refresh subscribed calendars on their own schedule —
often every few hours, not instantly. After committing a change here, don't
expect it to show up in a subscribed calendar right away.
