import { test, expect, Page } from "@playwright/test";

const id = "11111111-1111-4111-8111-111111111111";
const tenant = {
  _id: id,
  email: "tenant-ui@example.invalid",
  role: "tenant",
  profile: {
    fullName: "ผู้เช่าทดสอบหน้าจอ",
    phone: "0800000001",
    avatar: null,
  },
};
const room = {
  _id: id,
  roomNumber: "101",
  floor: 1,
  roomType: "standard",
  status: "available",
  prices: 4000,
  monthlyPrice: 4000,
  amenities: ["แอร์"],
  furniture: ["แอร์"],
  lastMeterReading: { water: 10, electric: 100 },
  lastMeter: { water: 10, electric: 100 },
};
const contract = {
  _id: id,
  tenantId: tenant,
  roomId: room,
  type: "monthly",
  status: "active",
  startDate: "2026-01-01",
  endDate: "2027-01-01",
  createdAt: "2026-01-01",
  financials: { deposit: 4000, advancePayment: 0 },
};
const invoice = {
  _id: id,
  tenantId: tenant,
  roomId: room,
  billingPeriod: "2026-11",
  createdAt: "2026-11-01",
  amounts: {
    rent: 4000,
    waterTotal: 100,
    electricTotal: 800,
    serviceFee: 0,
    grandTotal: 4900,
  },
  payment: { status: "paid_pending_review", slipUrl: "" },
};
const maintenance = {
  _id: id,
  title: "แอร์ไม่เย็น",
  description: "เปิดแล้วไม่มีลมเย็น",
  priority: "medium",
  status: "pending",
  createdAt: "2026-11-01",
  reportedBy: tenant,
  roomId: room,
  images: [],
  repairLogs: [],
};

type Mode = "normal" | "empty" | "error";
async function setup(page: Page, role = "admin", mode: Mode = "normal") {
  await page.addInitScript(() => {
    localStorage.setItem("accessToken", "ui-test");
  });
  let profile = { ...tenant, role };
  let currentContract = structuredClone(contract);
  const writes: { path: string; body: any }[] = [];
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api/v1", "");
    const reply = (data: any, status = 200) =>
      route.fulfill({ status, json: data });
    if (path === "/auth/profile") return reply(profile);
    if (request.method() !== "GET") {
      const body = request
        .headers()
        ["content-type"]?.includes("application/json")
        ? request.postDataJSON()
        : {};
      writes.push({ path, body });
      if (path === "/users/me/profile") {
        profile = { ...profile, profile: { ...profile.profile, ...body } };
        return reply(profile);
      }
      if (path === `/contracts/${id}`) {
        currentContract = { ...currentContract, ...body };
        return reply(currentContract);
      }
      if (path === "/invoices") return reply(invoice, 201);
      if (path === "/users/admin/create-user")
        return reply(
          { user: tenant, temporaryPassword: "test-only-password" },
          201,
        );
      if (path === "/users/admin/reset-tenant-password")
        return reply({ temporaryPassword: "test-only-password" });
      return reply({ ...invoice, ...maintenance });
    }
    if (mode === "error")
      return reply({ message: "Test service unavailable" }, 500);
    if (path === "/contracts/me" || path === `/contracts/${id}`)
      return mode === "empty"
        ? reply({ message: "Not found" }, 404)
        : reply(currentContract);
    if (path === `/invoices/${id}`)
      return mode === "empty"
        ? reply({ message: "Not found" }, 404)
        : reply(invoice);
    if (path === "/rooms") return reply(mode === "empty" ? [] : [room]);
    if (path === "/contracts")
      return reply(mode === "empty" ? [] : [currentContract]);
    if (path === "/invoices" || path === "/invoices/my")
      return reply(mode === "empty" ? [] : [invoice]);
    if (path === "/maintenance")
      return reply(mode === "empty" ? [] : [maintenance]);
    if (path === "/dashboard-admin/summary")
      return reply({
        stats: {
          monthlyRevenue: 4900,
          occupancyRate: 50,
          pendingMaintenance: 1,
          availableRooms: 1,
        },
        revenueChart: [{ month: "พ.ย.", revenue: 4900 }],
      });
    if (path === "/dashboard-admin/reports")
      return reply({
        period: "2026-11",
        summary: {
          totalInvoices: 0,
          paidInvoices: 0,
          totalBilled: 0,
          collected: 0,
          outstanding: 0,
        },
        invoices: [],
      });
    throw new Error(`Unhandled API ${request.method()} ${path}`);
  });
  return writes;
}

const routes = [
  "/login",
  "/admin",
  "/admin/Contracts",
  `/admin/Contracts/${id}`,
  "/admin/Invoices",
  "/admin/Register",
  "/admin/maintenance",
  "/admin/billing",
  "/admin/reports",
  "/admin/profile",
  "/admin/account-recovery",
  "/tenant/dashboard",
  "/tenant/bills",
  `/tenant/bills/${id}`,
  "/tenant/maintenance",
  "/tenant/account",
];
for (const path of routes) {
  test(`page renders and fits viewport: ${path}`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await setup(page, path.startsWith("/tenant") ? "tenant" : "admin");
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText("EasyProperty");
    await expect(page.locator("body")).not.toContainText(
      "เปิดหน้านี้ไม่สำเร็จ",
    );
    expect(errors).toEqual([]);
    const overflow = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      width: window.innerWidth,
    }));
    expect(overflow.scroll, JSON.stringify(overflow)).toBeLessThanOrEqual(
      overflow.width + 1,
    );
    await page.screenshot({
      path: info.outputPath("page.png"),
      fullPage: true,
    });
  });
}
for (const path of [
  "/admin/Contracts",
  "/admin/Invoices",
  "/admin/maintenance",
  "/admin/billing",
  "/admin/Register",
  "/tenant/dashboard",
  "/tenant/bills",
  `/tenant/bills/${id}`,
  `/admin/Contracts/${id}`,
]) {
  test(`failed request is visible and retryable: ${path}`, async ({ page }) => {
    await setup(page, path.startsWith("/tenant") ? "tenant" : "admin", "error");
    await page.goto(path);
    await expect(page.getByRole("alert").first()).toContainText(
      "เซิร์ฟเวอร์ขัดข้อง",
    );
    await expect(
      page.getByRole("button", { name: "ลองใหม่", exact: true }).first(),
    ).toBeVisible();
  });
}
for (const [path, message] of [
  ["/admin/Contracts", "ยังไม่มีสัญญา"],
  ["/admin/Invoices", "ไม่พบใบแจ้งหนี้"],
  ["/admin/maintenance", "ไม่มีรายการแจ้งซ่อม"],
  ["/admin/billing", "ยังไม่มีห้องที่มีสัญญา"],
  ["/admin/Register", "ยังไม่มีห้องว่าง"],
  ["/tenant/dashboard", "ยังไม่มีใบแจ้งหนี้"],
  ["/tenant/bills", "ไม่มีใบแจ้งหนี้"],
]) {
  test(`empty state: ${path}`, async ({ page }) => {
    await setup(page, path.startsWith("/tenant") ? "tenant" : "admin", "empty");
    await page.goto(path);
    await expect(
      page.getByText(message, { exact: false }).first(),
    ).toBeVisible();
    await expect(
      page.locator('[role="alert"]:not(#__next-route-announcer__)'),
    ).toHaveCount(0);
  });
}
test("contract edit link, cancel restores data, save persists and exits editing", async ({
  page,
}) => {
  const writes = await setup(page);
  await page.goto("/admin/Contracts");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const deposit = page.locator('input[name="deposit"]');
  await expect(deposit).toBeEnabled();
  await deposit.fill("5000");
  await page
    .getByRole("button", { name: "ยกเลิก", exact: true })
    .first()
    .click();
  await expect(deposit).toHaveValue("4000");
  await page.getByRole("button", { name: "แก้ไข", exact: true }).click();
  await deposit.fill("4500");
  await page.getByRole("button", { name: "บันทึก", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(deposit).toBeDisabled();
  expect(
    writes.find((write) => write.path === `/contracts/${id}`)?.body.financials
      .deposit,
  ).toBe(4500);
});
test("profile edit saves actual request and survives reload", async ({
  page,
}) => {
  const writes = await setup(page, "tenant");
  await page.goto("/tenant/account");
  await page.getByRole("button", { name: "แก้ไขข้อมูล", exact: true }).click();
  await page.getByLabel("ชื่อ-นามสกุล", { exact: true }).fill("ชื่อใหม่ทดสอบ");
  await page.getByLabel("เบอร์โทร", { exact: true }).fill("0801234567");
  await page.getByRole("button", { name: "บันทึก", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "บันทึกข้อมูลส่วนตัวแล้ว",
  );
  expect(
    writes.filter((write) => write.path === "/users/me/profile"),
  ).toHaveLength(1);
  await page.reload();
  await expect(
    page.locator("main").getByText("ชื่อใหม่ทดสอบ", { exact: false }).first(),
  ).toBeVisible();
});
test("mobile tenant menu has one navigation and all links work", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "mobile");
  await setup(page, "tenant");
  await page.goto("/tenant/dashboard");
  await expect(page.locator("nav:visible")).toHaveCount(1);
  for (const [label, path] of [
    ["บิล", "/tenant/bills"],
    ["แจ้งซ่อม", "/tenant/maintenance"],
    ["บัญชี", "/tenant/account"],
    ["หน้าแรก", "/tenant/dashboard"],
  ]) {
    await page
      .locator("nav:visible")
      .getByRole("link", { name: label, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(path + "$"));
  }
});
test("admin menu links and profile link reach existing pages", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/admin");
  for (const path of [
    "/admin/Contracts",
    "/admin/Invoices",
    "/admin/Register",
    "/admin/maintenance",
    "/admin/billing",
    "/admin/reports",
    "/admin/account-recovery",
    "/admin",
  ]) {
    await page.locator(`nav a[href="${path}"]`).click();
    await expect(page).toHaveURL(new RegExp(path + "$"));
    await expect(page.locator("body")).not.toContainText("ไม่พบหน้าที่ต้องการ");
  }
  await page.locator('a[href="/admin/profile"]').click();
  await expect(page).toHaveURL(/\/admin\/profile$/);
});
test("billing validates before writing and submits the selected meters", async ({
  page,
}) => {
  const writes = await setup(page);
  await page.goto("/admin/billing");
  await page
    .getByRole("button", { name: "สร้างใบแจ้งหนี้", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("กรุณาเลือกห้อง");
  expect(writes).toHaveLength(0);
  await page.keyboard.press("Escape");
  await page.locator('input[type="month"]').fill("2026-12");
  const meters = page.locator('input[type="number"]:enabled');
  await meters.nth(0).fill("20");
  await meters.nth(1).fill("200");
  await page
    .getByRole("button", { name: "สร้างใบแจ้งหนี้", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("สร้างใบแจ้งหนี้สำเร็จ");
  expect(writes.filter((write) => write.path === "/invoices")).toHaveLength(1);
});
test("login rejects wrong password with readable error and forgot/back works", async ({
  page,
}) => {
  await page.route("**/api/v1/auth/signin", (route) =>
    route.fulfill({ status: 401, json: { message: "Unauthorized" } }),
  );
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("wrong@example.invalid");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page.getByRole("alert").first()).toContainText(
    "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
  );
  await page.getByRole("button", { name: "ลืมรหัสผ่าน?" }).click();
  await expect(
    page.getByText("หากคุณเป็นผู้เช่า", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "กลับเข้าสู่ระบบ" }).click();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
});

test("registration retry reuses the created account after contract failure", async ({
  page,
}) => {
  const writes = await setup(page);
  let attempts = 0;
  await page.route("**/api/v1/contracts", async (route) => {
    if (route.request().method() === "GET") return route.fallback();
    attempts++;
    return route.fulfill({
      status: attempts === 1 ? 409 : 201,
      json:
        attempts === 1
          ? { message: "ห้องนี้ไม่ว่าง กรุณาเลือกห้องใหม่" }
          : contract,
    });
  });
  await page.goto("/admin/Register");
  await page.locator('select[name="roomNumber"]').selectOption("101");
  for (const [name, value] of Object.entries({
    fullName: "ทดสอบลงทะเบียน",
    idCard: "0000000000000",
    phone: "0800000000",
    email: "register@example.invalid",
    birthDate: "2000-01-01",
    deposit: "4000",
  }))
    await page.locator(`[name="${name}"]`).fill(value);
  await page
    .getByRole("button", { name: "ยืนยันการลงทะเบียน", exact: true })
    .click();
  await expect(page.getByRole("dialog", { name: "แจ้งเตือน" })).toContainText(
    "ห้องนี้ไม่ว่าง",
  );
  await page.keyboard.press("Escape");
  await expect(
    page.getByText("สร้างบัญชีผู้เช่าแล้ว แต่สัญญายังไม่สำเร็จ", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.locator('[name="email"]')).toBeDisabled();
  await page
    .getByRole("button", { name: "ยืนยันการลงทะเบียน", exact: true })
    .click();
  await expect(page.getByRole("dialog", { name: "แจ้งเตือน" })).toContainText(
    "ลงทะเบียนผู้เช่าสำเร็จ",
  );
  expect(attempts).toBe(2);
  expect(
    writes.filter((write) => write.path === "/users/admin/create-user"),
  ).toHaveLength(1);
});

test("invoice search, detail and failed approval preserve the open detail", async ({
  page,
}) => {
  await setup(page);
  await page.route(`**/api/v1/invoices/${id}/confirm`, (route) =>
    route.fulfill({ status: 500, json: {} }),
  );
  await page.goto("/admin/Invoices");
  await page
    .getByPlaceholder("Search invoice, tenant, room...")
    .fill(tenant.email);
  await page.getByRole("button", { name: "ดูรายละเอียดบิล" }).click();
  const detail = page.getByRole("dialog", { name: "รายละเอียด", exact: true });
  await expect(detail).toBeVisible();
  await detail.getByRole("button", { name: "Approve Payment" }).click();
  await expect(page.getByRole("dialog", { name: "แจ้งเตือน" })).toContainText(
    "เซิร์ฟเวอร์ขัดข้อง",
  );
  await page.keyboard.press("Escape");
  await expect(detail).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(detail).not.toBeVisible();
});

test("contract cancellation confirmation submits once while pending", async ({
  page,
}) => {
  await setup(page);
  let requests = 0;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**/api/v1/contracts/${id}`, async (route) => {
    if (route.request().method() !== "DELETE") return route.fallback();
    requests++;
    await pending;
    await route.fulfill({ json: { ...contract, status: "cancelled" } });
  });
  await page.goto("/admin/Contracts");
  await page.getByRole("button", { name: "ยกเลิกสัญญา", exact: true }).click();
  await page.getByRole("button", { name: "ยืนยัน", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "กำลังดำเนินการ..." }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "แจ้งเตือน" })).toBeVisible();
  expect(requests).toBe(1);
  release();
  await expect(page.getByRole("dialog", { name: "แจ้งเตือน" })).toContainText(
    "ยกเลิกสัญญาสำเร็จ",
  );
});

test("room details show current meters and amenities can be saved", async ({
  page,
}) => {
  const writes = await setup(page);
  await page.goto("/admin");
  await page.getByRole("button", { name: "101", exact: true }).click();
  const detail = page.getByRole("dialog", { name: "รายละเอียด", exact: true });
  await expect(detail.getByText("100 u.", { exact: true })).toBeVisible();
  await detail.getByPlaceholder("เพิ่มรายการ...").fill("โต๊ะทดสอบ");
  await detail.getByRole("button", { name: "เพิ่มสิ่งอำนวยความสะดวก" }).click();
  await expect(page.getByRole("dialog", { name: "แจ้งเตือน" })).toContainText(
    "บันทึกข้อมูลสำเร็จ",
  );
  expect(
    writes.find((write) => write.path.endsWith("/amenities"))?.body.amenities,
  ).toEqual(["แอร์", "โต๊ะทดสอบ"]);
});

test("maintenance validation, submission and admin completion work", async ({
  page,
}) => {
  const writes = await setup(page, "tenant");
  await page.goto("/tenant/maintenance");
  await page.getByRole("button", { name: "ส่งเรื่องแจ้งซ่อม" }).click();
  await expect(page.getByRole("dialog", { name: "แจ้งเตือน" })).toContainText(
    "กรุณากรอกข้อมูล",
  );
  await page.keyboard.press("Escape");
  await page
    .getByPlaceholder("เช่น แอร์ไม่เย็น, ก๊อกน้ำรั่ว")
    .fill("ก๊อกน้ำรั่ว");
  await page.getByPlaceholder("อธิบายอาการ...").fill("น้ำหยดตลอดเวลา");
  await page.getByRole("button", { name: "ส่งเรื่องแจ้งซ่อม" }).click();
  await expect(page.getByRole("dialog", { name: "แจ้งเตือน" })).toContainText(
    "ส่งคำร้องแจ้งซ่อมเรียบร้อยแล้ว",
  );
  expect(writes.filter((write) => write.path === "/maintenance")).toHaveLength(
    1,
  );
  await page.unrouteAll({ behavior: "wait" });
  const adminWrites = await setup(page);
  await page.goto("/admin/maintenance");
  await page.getByRole("button", { name: "แอร์ไม่เย็น", exact: true }).click();
  await page.getByRole("button", { name: "ทำงานเสร็จแล้ว" }).click();
  await expect(page.getByRole("dialog", { name: "แจ้งเตือน" })).toContainText(
    "อัปเดตสถานะสำเร็จ",
  );
  expect(
    adminWrites.find((write) => write.path.endsWith("/status"))?.body.status,
  ).toBe("completed");
});

test("report download, recovery validation and logout work", async ({
  page,
}) => {
  const writes = await setup(page);
  await page.goto("/admin/reports");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด CSV" }).click();
  expect((await downloaded).suggestedFilename()).toBe("invoices-2026-11.csv");
  await page.goto("/admin/account-recovery");
  const reset = page.getByRole("button", { name: "สร้างรหัสผ่านชั่วคราว" });
  await expect(reset).toBeDisabled();
  await page.getByLabel("อีเมลผู้เช่า", { exact: true }).fill(tenant.email);
  await page.getByRole("checkbox").check();
  await reset.click();
  await expect(
    page.getByLabel("รหัสผ่านชั่วคราว", { exact: true }),
  ).toHaveValue("test-only-password");
  await page.getByRole("button", { name: "ซ่อนรหัสผ่าน" }).click();
  await expect(
    page.getByLabel("รหัสผ่านชั่วคราว", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "ออกจากระบบ", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(writes.some((write) => write.path === "/auth/logout")).toBe(true);
  expect(
    await page.evaluate(() => localStorage.getItem("accessToken")),
  ).toBeNull();
});

test("profile request failure offers retry without discarding the session", async ({
  page,
}) => {
  await setup(page);
  await page.route("**/api/v1/auth/profile", (route) =>
    route.fulfill({ status: 500, json: {} }),
  );
  await page.goto("/admin");
  await expect(page.getByRole("button", { name: "ลองใหม่" })).toBeVisible();
  await expect(page).toHaveURL(/\/admin$/);
  expect(await page.evaluate(() => localStorage.getItem("accessToken"))).toBe(
    "ui-test",
  );
});

test("password form validates confirmation and reports an incorrect current password", async ({
  page,
}) => {
  await setup(page, "tenant");
  await page.route("**/api/v1/users/me/password", (route) =>
    route.fulfill({ status: 401, json: { message: "Incorrect password" } }),
  );
  await page.goto("/tenant/account");
  const save = page.getByRole("button", {
    name: "เปลี่ยนรหัสผ่าน",
    exact: true,
  });
  await expect(save).toBeDisabled();
  await page
    .getByPlaceholder("รหัสผ่านปัจจุบัน", { exact: true })
    .fill("wrong-password");
  await page
    .getByPlaceholder("รหัสผ่านใหม่", { exact: true })
    .fill("new-password");
  await page
    .getByPlaceholder("ยืนยันรหัสผ่านใหม่", { exact: true })
    .fill("different-password");
  await save.click();
  await expect(page.getByRole("dialog", { name: "แจ้งเตือน" })).toContainText(
    "รหัสผ่านใหม่ไม่ตรงกัน",
  );
  await page.keyboard.press("Escape");
  await page
    .getByPlaceholder("ยืนยันรหัสผ่านใหม่", { exact: true })
    .fill("new-password");
  await save.click();
  await expect(page.getByRole("dialog", { name: "แจ้งเตือน" })).toContainText(
    "รหัสผ่านปัจจุบันไม่ถูกต้อง",
  );
});

test("upload failures are actionable and invalid files are rejected before sending", async ({
  page,
}) => {
  await setup(page);
  let uploads = 0;
  await page.route("**/api/v1/upload/avatars", (route) => {
    uploads++;
    return route.fulfill({ status: 503, json: {} });
  });
  await page.goto("/admin/profile");
  const file = page.locator('input[type="file"]');
  await file.setInputFiles({
    name: "document.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not an image"),
  });
  await expect(page.getByRole("dialog", { name: "แจ้งเตือน" })).toContainText(
    "กรุณาเลือกรูป",
  );
  expect(uploads).toBe(0);
  await page.keyboard.press("Escape");
  await file.setInputFiles({
    name: "test.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "แจ้งเตือน" })).toContainText(
    "บริการยังไม่พร้อมใช้งาน",
  );
  expect(uploads).toBe(1);
});

test("payment upload disables repeated submission and shows awaiting review", async ({
  page,
}) => {
  await setup(page, "tenant");
  let status = "pending";
  let uploads = 0;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**/api/v1/invoices/${id}`, (route) =>
    route.fulfill({ json: { ...invoice, payment: { status } } }),
  );
  await page.route(`**/api/v1/invoices/${id}/pay`, async (route) => {
    uploads++;
    await pending;
    status = "paid_pending_review";
    return route.fulfill({ json: { ...invoice, payment: { status } } });
  });
  await page.goto(`/tenant/bills/${id}`);
  await page
    .getByLabel("เลือกไฟล์สลิป")
    .setInputFiles({
      name: "test.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  const upload = page.getByRole("button", { name: "ยืนยันการชำระเงิน", exact: true });
  await upload.click();
  await expect(upload).toBeDisabled();
  expect(uploads).toBe(1);
  release();
  await expect(page.getByRole("dialog", { name: "แจ้งเตือน" })).toContainText(
    "อัพโหลดสลิปเรียบร้อยแล้ว",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByText("รอตรวจสอบ", { exact: true })).toBeVisible();
  await expect(page.getByLabel("เลือกไฟล์สลิป")).toHaveCount(0);
});
