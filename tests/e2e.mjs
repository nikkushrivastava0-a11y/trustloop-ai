import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
const port = 3015;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--port",
    String(port),
    "--hostname",
    "127.0.0.1",
  ],
  { stdio: "pipe" },
);
let browser;
async function login(page, role) {
  await page.goto(`${origin}/login`);
  await page
    .getByRole("button", {
      name: role === "owner" ? "Resource owner" : "Student",
      exact: true,
    })
    .click();
  await page.getByLabel("Campus email").fill(`${role}@campus.edu`);
  await page.getByLabel("Password", { exact: true }).fill("demopass123");
  await page.getByRole("button", { name: "Log in to TrustLoop" }).click();
  await page.waitForURL(`**/${role === "owner" ? "owner" : "student"}`);
}
(async () => {
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try {
        await fetch(origin, { signal: AbortSignal.timeout(1000) });
        ready = true;
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    assert.ok(ready, "Production server starts");
    browser = await chromium.launch({
      headless: true,
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
      args: JSON.parse(process.env.PLAYWRIGHT_CHROMIUM_ARGS || "[]"),
    });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.setDefaultTimeout(10000);
    await page.goto(`${origin}/student`);
    await page
      .getByRole("link", { name: "Sony Alpha A7 IV", exact: true })
      .waitFor();
    assert.equal(await page.locator(".resource-card").count(), 6);
    await page.getByRole("textbox", { name: "Search resources" }).fill("quest");
    assert.equal(await page.locator(".resource-card").count(), 1);
    await page
      .getByRole("textbox", { name: "Search resources" })
      .fill("no-such-resource");
    await page.getByRole("heading", { name: "No resources found" }).waitFor();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await page.getByLabel("Available now", { exact: true }).check();
    assert.equal(await page.locator(".resource-card").count(), 5);
    await page.getByLabel("No training needed", { exact: true }).check();
    assert.equal(await page.locator(".resource-card").count(), 3);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      "Mobile has no horizontal overflow",
    );
    if (process.env.SCREENSHOT_DIR)
      await page.screenshot({
        path: `${process.env.SCREENSHOT_DIR}/mobile.png`,
        fullPage: true,
      });
    await page.getByRole("status").filter({ hasText: "Demo mode" }).waitFor();
    for (const route of ["/", "/login", "/signup", "/missing-page"]) {
      await page.goto(`${origin}${route}`);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `${route} fits mobile viewport`,
      );
    }
    await page
      .getByRole("heading", { name: "This page has moved out of reach." })
      .waitFor();
    await page.goto(`${origin}/student`);
    await page.evaluate(() =>
      localStorage.setItem("trustloop.demo.v1", "invalid-json"),
    );
    await page.goto(`${origin}/owner`);
    await page.getByRole("button", { name: "Retry connection" }).waitFor();
    assert.equal(
      await page.getByRole("heading", { name: "Step into the loop." }).count(),
      0,
      "Session failure is not presented as signed out",
    );
    await page.evaluate(() => localStorage.removeItem("trustloop.demo.v1"));
    await page.getByRole("button", { name: "Retry connection" }).click();
    await page.getByRole("heading", { name: "Step into the loop." }).waitFor();
    await page.setViewportSize({ width: 1440, height: 1000 });
    console.log(
      "PASS discovery search, filters, empty state and mobile layout",
    );
    await login(page, "student");
    await page.goto(`${origin}/bookings/new?resource=camera`);
    await page.getByLabel("Start date & time").fill("2035-04-05T10:00");
    await page.getByLabel("End date & time").fill("2035-04-05T12:00");
    await page
      .getByLabel("What are you working on?")
      .fill("Documentary film for the campus photography club");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Send booking request" }).click();
    await page.getByRole("heading", { name: "Request sent." }).waitFor();
    await page.getByRole("link", { name: "Track your request" }).click();
    await page.waitForURL(/\/bookings\/TL-/);
    const id = new URL(page.url()).pathname.split("/").pop();
    await page.getByRole("heading", { name: "Activity timeline" }).waitFor();
    assert.equal(await page.locator(".timeline-item").count(), 1);
    console.log("PASS student login and booking request persists to timeline");
    await login(page, "owner");
    let card = page.locator("article").filter({ hasText: id });
    await card.getByRole("button", { name: "Waitlist", exact: true }).click();
    await card.locator(".status.waitlisted").waitFor();
    await card.getByRole("button", { name: "Approve", exact: true }).click();
    await page.getByText(`${id} approved.`, { exact: false }).waitFor();
    const seeded = page.locator("article").filter({ hasText: "TL-1042" });
    await seeded.getByRole("button", { name: "Reject", exact: true }).click();
    await page.getByText("TL-1042 rejected.", { exact: false }).waitFor();
    await page
      .getByRole("button", { name: "Add a resource", exact: true })
      .click();
    await page.getByLabel("Resource title").fill("Campus demo tripod");
    await page
      .getByLabel("Description", { exact: true })
      .fill("Stable tripod for campus photography projects");
    await page.getByLabel("Pickup location").fill("Media Lab room 3");
    await page
      .getByLabel("Rules · one per line")
      .fill("Return all accessories.");
    await page
      .getByRole("button", { name: "Add resource", exact: true })
      .click();
    await page
      .getByText("Campus demo tripod is now part", { exact: false })
      .waitFor();
    console.log("PASS owner waitlist, approve, reject and add resource");
    await login(page, "student");
    await page.goto(`${origin}/bookings/${id}/handover`);
    await page
      .getByRole("img", { name: `QR code for booking ${id}` })
      .waitFor();
    await page.getByLabel("Booking / handover code").fill(id);
    await page
      .getByLabel("Condition notes")
      .fill("All equipment and accessories in good condition.");
    const photo = {
      name: "condition.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aNosAAAAASUVORK5CYII=",
        "base64",
      ),
    };
    await page.locator("input[type=file]").setInputFiles(photo);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Confirm check-out" }).click();
    await page.getByRole("heading", { name: "Check-out confirmed" }).waitFor();
    await page.goto(`${origin}/bookings/${id}/handover`);
    await page.getByLabel("Booking / handover code").fill(id);
    await page
      .getByLabel("Condition notes")
      .fill("Returned with case and both batteries. No damage.");
    await page.locator("input[type=file]").setInputFiles(photo);
    await page.getByRole("checkbox").check();
    await page
      .getByRole("button", { name: "Confirm return", exact: true })
      .click();
    await page.getByRole("heading", { name: "Return confirmed" }).waitFor();
    await page.goto(`${origin}/bookings/${id}/handover?kind=incident`);
    await page
      .getByLabel("What happened?")
      .fill("Small mark on carry case reported for owner review.");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Submit incident report" }).click();
    await page
      .getByRole("heading", { name: "Incident report submitted" })
      .waitFor();
    await page.goto(`${origin}/bookings/${id}`);
    await page.getByRole("heading", { name: "Activity timeline" }).waitFor();
    assert.equal(await page.locator(".timeline-item").count(), 5);
    assert.equal(await page.locator(".report-card").count(), 3);
    await page.reload();
    await page.locator(".status.returned").first().waitFor();
    assert.equal(await page.locator(".report-card").count(), 3);
    assert.deepEqual(errors, [], "No browser runtime errors");
    console.log(
      "PASS QR rendering, photo submission, check-out, return, incident history and refresh persistence",
    );
  } finally {
    if (browser) await browser.close();
    server.kill("SIGTERM");
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
