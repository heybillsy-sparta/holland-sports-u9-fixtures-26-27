/**
 * Fetches the Holland Sports Youth U9 Harriers fixtures table from the FA's
 * Full-Time site and prints each row so it can be compared against
 * U9_Fixtures.ics.
 *
 * Usage:
 *   pnpm run fetch-fixtures
 *   pnpm run fetch-fixtures -- "<some other fulltime.thefa.com fixtures URL>"
 *
 * Known limitation (verified August 2026): fulltime.thefa.com sits behind a
 * Cloudflare bot challenge that answers plain HTTP requests with 403
 * Forbidden whatever User-Agent is sent, so this script currently cannot
 * reach the page. The `.fixtures-table` selector below has been checked
 * against the live page in a real browser and is correct, so if the
 * challenge is ever lifted the parsing should work as-is. In the meantime,
 * open the URL in a browser and read the fixtures list there.
 */

import { writeFileSync } from "node:fs";
import * as cheerio from "cheerio";

const DEFAULT_URL =
  "https://fulltime.thefa.com/fixtures.html?" +
  "selectedSeason=624665182&selectedFixtureGroupAgeGroup=0&" +
  "selectedFixtureGroupKey=1_121288224&selectedDateCode=all&" +
  "selectedClub=505587075&selectedTeam=389055971&" +
  "selectedRelatedFixtureOption=3&" +
  "previousSelectedFixtureGroupKey=1_121288224&" +
  "previousSelectedClub=505587075";

async function main() {
  const url = process.argv[2] ?? DEFAULT_URL;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; fixtures-fetch-script/1.0)",
    },
  });

  if (!res.ok) {
    console.error(`Request failed: ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const html = await res.text();

  if (process.env.FIXTURES_DEBUG) {
    writeFileSync("fixtures_raw.html", html, "utf-8");
    console.error("Raw HTML saved to fixtures_raw.html for inspection.");
  }

  const $ = cheerio.load(html);
  const table = $(".fixtures-table");

  if (table.length === 0) {
    console.error(
      "No element matching .fixtures-table found. The page may render " +
        "fixtures via JavaScript, in which case this plain HTML fetch " +
        "won't see them — rerun with FIXTURES_DEBUG=1 to inspect the raw " +
        "HTML.",
    );
    process.exit(1);
  }

  const rows: string[][] = [];
  table.find("tr").each((_, tr) => {
    const cells: string[] = [];
    $(tr)
      .find("td, th")
      .each((_, cell) => {
        cells.push($(cell).text().replace(/\s+/g, " ").trim());
      });
    if (cells.length > 0) rows.push(cells);
  });

  if (rows.length === 0) {
    console.error(
      "Found .fixtures-table but no rows inside it — the markup may differ " +
        "from what this script expects. Rerun with FIXTURES_DEBUG=1 and " +
        "inspect fixtures_raw.html to adjust the selectors.",
    );
    process.exit(1);
  }

  for (const row of rows) {
    console.log(row.join(" | "));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
