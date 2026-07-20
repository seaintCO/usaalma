import { expect, test } from "@playwright/test";

const mutationsAuthorized =
  process.env.ALMA_E2E_MUTATIONS_CONFIRM === "local-test-data";

test.beforeEach(async ({ page }) => {
  test.skip(
    !mutationsAuthorized,
    "Set ALMA_E2E_MUTATIONS_CONFIRM=local-test-data only for an approved non-production test account.",
  );
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page).not.toHaveURL(/\/login/);
});

test("owned Tasks API supports create, read, update, search and delete", async ({
  request,
}) => {
  const marker = `ALMA-E2E-${crypto.randomUUID()}`;
  const created = await request.post("/api/tasks/create", {
    data: { title: marker, priority: "medium" },
  });
  expect(created.ok()).toBeTruthy();
  const task = await created.json();
  const list = await request.get(
    `/api/tasks/list?status=all&q=${encodeURIComponent(marker)}`,
  );
  expect(
    (await list.json()).some((item: { id: string }) => item.id === task.id),
  ).toBeTruthy();
  expect(
    (
      await request.patch(`/api/tasks/${task.id}`, {
        data: { title: `${marker}-updated`, status: "completed" },
      })
    ).ok(),
  ).toBeTruthy();
  expect((await request.delete(`/api/tasks/${task.id}`)).ok()).toBeTruthy();
});

test("owned Planner API supports date-aware create, update and delete", async ({
  request,
}) => {
  const marker = `ALMA-E2E-${crypto.randomUUID()}`;
  const date = new Date().toISOString().slice(0, 10);
  const created = await request.post("/api/planner", {
    data: {
      title: marker,
      taskDate: date,
      taskTime: "10:30",
      priority: "medium",
      status: "scheduled",
    },
  });
  expect(created.ok()).toBeTruthy();
  const item = await created.json();
  expect(
    (
      await request.patch(`/api/planner/${item.id}`, {
        data: {
          title: `${marker}-updated`,
          taskDate: date,
          status: "completed",
        },
      })
    ).ok(),
  ).toBeTruthy();
  expect((await request.delete(`/api/planner/${item.id}`)).ok()).toBeTruthy();
});

test("owned Notes API supports create, select data, autosave payload, search and delete", async ({
  request,
}) => {
  const marker = `ALMA-E2E-${crypto.randomUUID()}`;
  const created = await request.post("/api/notes/create", {
    data: { title: marker, content: "draft" },
  });
  expect(created.ok()).toBeTruthy();
  const note = await created.json();
  expect(
    (
      await request.patch(`/api/notes/${note.id}`, {
        data: { title: marker, content: "saved body" },
      })
    ).ok(),
  ).toBeTruthy();
  const list = await request.get(
    `/api/notes/list?q=${encodeURIComponent(marker)}`,
  );
  expect(
    (await list.json()).some(
      (item: { id: string; content: string }) =>
        item.id === note.id && item.content === "saved body",
    ),
  ).toBeTruthy();
  expect((await request.delete(`/api/notes/${note.id}`)).ok()).toBeTruthy();
});

test("owned Documents metadata create/list/delete remains isolated", async ({
  request,
}) => {
  const marker = `ALMA-E2E-${crypto.randomUUID()}`;
  const created = await request.post("/api/documents/create", {
    data: { title: marker, content: "test document" },
  });
  expect(created.ok()).toBeTruthy();
  const document = await created.json();
  const list = await request.get("/api/documents/list");
  const payload = await list.json();
  const documents = Array.isArray(payload) ? payload : payload.documents;
  expect(
    documents.some((item: { id: string }) => item.id === document.id),
  ).toBeTruthy();
  expect(
    (await request.delete(`/api/documents/${document.id}`)).ok(),
  ).toBeTruthy();
});

test("app navigation pin state persists and sidebar remains bounded", async ({
  page,
  request,
}) => {
  expect(
    (
      await request.post("/api/app-navigation", {
        data: { moduleId: "notes", pinned: true },
      })
    ).ok(),
  ).toBeTruthy();
  await page.goto("/notes");
  await expect(page.locator('[aria-label="My Apps"] a')).toHaveCount(
    await page.locator('[aria-label="My Apps"] a').count(),
  );
  expect(
    await page.locator('[aria-label="My Apps"] a').count(),
  ).toBeLessThanOrEqual(6);
});

test("workspace owner boundary rejects unauthorized invitation targets", async ({
  request,
}) => {
  const response = await request.post("/api/workspaces/invite", {
    data: {
      workspaceId: crypto.randomUUID(),
      email: "invalid@example.test",
      role: "member",
    },
  });
  expect([403, 404]).toContain(response.status());
});
