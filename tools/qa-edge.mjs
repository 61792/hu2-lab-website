import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// [LEARN-QA-01] 测试配置：浏览器、端口、页面路径和不覆盖旧结果的后缀。
const EDGE_PATH =
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const CDP_PORT = 9238;
const toolsDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryDirectory = path.dirname(toolsDirectory);
const websiteDirectory = path.join(repositoryDirectory, "docs");
const qaDirectory = path.join(repositoryDirectory, "local-data", "qa");
const screenshotsDirectory = path.join(qaDirectory, "screenshots");
const pageUrl = pathToFileURL(path.join(websiteDirectory, "index.html")).href;
const suffixArgument = process.argv.find((argument) =>
  argument.startsWith("--suffix="),
);
const suffix = suffixArgument
  ? `-${suffixArgument.slice("--suffix=".length).replace(/[^a-z0-9_-]/gi, "")}`
  : "";

mkdirSync(screenshotsDirectory, { recursive: true });

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const writeNewFile = (filePath, data, encoding) => {
  if (existsSync(filePath)) {
    throw new Error(
      `Refusing to overwrite ${path.basename(filePath)}. Re-run with --suffix=v2.`,
    );
  }
  writeFileSync(filePath, data, encoding);
};

// [LEARN-QA-02] 启动独立的无头 Edge；它不是网站运行时的一部分。
const edge = spawn(
  EDGE_PATH,
  [
    "--headless=new",
    "--disable-gpu",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-renderer-backgrounding",
    "--remote-allow-origins=*",
    `--remote-debugging-port=${CDP_PORT}`,
    "about:blank",
  ],
  { windowsHide: true },
);

let edgeErrorOutput = "";
edge.stderr.on("data", (data) => {
  edgeErrorOutput += data.toString();
});

// [LEARN-QA-03] CDP 工具层：连接浏览器、发送命令、等待事件和执行页面表达式。
const findTarget = async () => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
      if (response.ok) {
        const targets = await response.json();
        const page = targets.find((target) => target.type === "page");
        if (page?.webSocketDebuggerUrl) return page;
      }
    } catch {
      // Edge has not opened the debug endpoint yet.
    }
    await delay(120);
  }
  throw new Error(`Edge CDP did not start. ${edgeErrorOutput.slice(-800)}`);
};

const target = await findTarget();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let commandId = 0;
const pendingCommands = new Map();
const eventWaiters = new Map();
const runtimeExceptions = [];

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data.toString());

  if (message.id && pendingCommands.has(message.id)) {
    const { resolve, reject } = pendingCommands.get(message.id);
    pendingCommands.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
    return;
  }

  if (message.method === "Runtime.exceptionThrown") {
    runtimeExceptions.push(
      message.params?.exceptionDetails?.text || "Unknown runtime exception",
    );
  }

  const waiters = eventWaiters.get(message.method);
  if (waiters?.length) {
    const waiter = waiters.shift();
    waiter.resolve(message.params);
  }
});

const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    commandId += 1;
    pendingCommands.set(commandId, { resolve, reject });
    socket.send(JSON.stringify({ id: commandId, method, params }));
  });

const waitForEvent = (method, timeout = 8000) =>
  new Promise((resolve, reject) => {
    const waiters = eventWaiters.get(method) || [];
    const waiter = { resolve, reject };
    waiters.push(waiter);
    eventWaiters.set(method, waiters);

    setTimeout(() => {
      const current = eventWaiters.get(method) || [];
      const index = current.indexOf(waiter);
      if (index >= 0) current.splice(index, 1);
      reject(new Error(`Timed out waiting for ${method}`));
    }, timeout).unref();
  });

const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Evaluation failed");
  }
  return result.result?.value;
};

const navigate = async () => {
  const loaded = waitForEvent("Page.loadEventFired");
  await send("Page.navigate", { url: pageUrl });
  await loaded;
  await delay(260);
};

const setViewport = async (width, height, mobile) => {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
    screenWidth: width,
    screenHeight: height,
    screenOrientation: { angle: 0, type: "portraitPrimary" },
  });
};

const screenshot = async (baseName) => {
  const result = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  const output = path.join(
    screenshotsDirectory,
    `${baseName}${suffix}.png`,
  );
  writeNewFile(output, Buffer.from(result.data, "base64"));
  return path.relative(qaDirectory, output).replaceAll("\\", "/");
};

// [LEARN-QA-04] 验收场景：390px / 1440px、菜单、筛选、内容数量和截图。
const report = {
  generatedAt: new Date().toISOString(),
  page: pageUrl,
  browser: "Microsoft Edge via Chrome DevTools Protocol",
  runtimeExceptions,
  checks: {},
  screenshots: {},
};

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });

  await setViewport(390, 844, true);
  await navigate();

  report.checks.mobileLayout = await evaluate(`(() => {
    const toggle = document.querySelector('#menuToggle');
    const rect = toggle.getBoundingClientRect();
    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      documentWidth: document.documentElement.scrollWidth,
      noHorizontalOverflow:
        document.documentElement.scrollWidth <= window.innerWidth + 1,
      menuToggleVisible:
        rect.width > 0 && rect.left >= 0 && rect.right <= window.innerWidth,
      menuToggleRect: {
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      }
    };
  })()`);
  report.screenshots.mobileHome = await screenshot("mobile-home-cdp");

  report.checks.mobileMenuOpen = await evaluate(`(() => {
    document.querySelector('#menuToggle').click();
    return {
      expanded: document.querySelector('#menuToggle').getAttribute('aria-expanded'),
      navOpen: document.querySelector('#primaryNav').classList.contains('is-open'),
      bodyLocked: document.body.classList.contains('menu-open'),
      focusedElement: document.activeElement?.textContent?.trim()
    };
  })()`);
  await delay(260);
  report.screenshots.mobileMenu = await screenshot("mobile-menu-cdp");

  report.checks.mobileMenuEscape = await evaluate(`(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true
    }));
    return {
      expanded: document.querySelector('#menuToggle').getAttribute('aria-expanded'),
      navOpen: document.querySelector('#primaryNav').classList.contains('is-open'),
      bodyLocked: document.body.classList.contains('menu-open'),
      focusReturned: document.activeElement === document.querySelector('#menuToggle')
    };
  })()`);

  await setViewport(1440, 1000, false);
  await navigate();

  report.checks.desktopLayout = await evaluate(`(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    documentWidth: document.documentElement.scrollWidth,
    noHorizontalOverflow:
      document.documentElement.scrollWidth <= window.innerWidth + 1,
    visibleHeadings: [...document.querySelectorAll('h1, h2')]
      .filter((heading) => heading.getBoundingClientRect().width > 0)
      .length,
    externalBlankLinksAreSafe: [...document.querySelectorAll('a[target="_blank"]')]
      .every((link) => /noreferrer|noopener/.test(link.rel))
  }))()`);
  report.screenshots.desktopHome = await screenshot("desktop-home-cdp");

  await evaluate(`(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    const toolbar = document.querySelector('.output-toolbar');
    window.scrollTo(0, toolbar.getBoundingClientRect().top + window.scrollY - 96);
    document.querySelector('[data-filter="paper"]').click();
  })()`);
  await delay(220);

  report.checks.outputFilter = await evaluate(`(() => ({
    pressedFilter: document.querySelector('.output-filters [aria-pressed="true"]')
      ?.dataset.filter,
    visibleRows: [...document.querySelectorAll('[data-output-type]')]
      .filter((row) => !row.hidden).length,
    hiddenRows: [...document.querySelectorAll('[data-output-type]')]
      .filter((row) => row.hidden).length,
    status: document.querySelector('#outputStatus').textContent.trim(),
    headerIsCompact: document.querySelector('#siteHeader').classList.contains('is-scrolled')
  }))()`);
  report.screenshots.desktopOutputs = await screenshot("desktop-outputs-cdp");

  report.checks.content = await evaluate(`(() => ({
    researchDirections: document.querySelectorAll('.research-item').length,
    outputRows: document.querySelectorAll('[data-output-type]').length,
    cohorts: document.querySelectorAll('.cohort-row').length,
    members: [...document.querySelectorAll('.cohort-row > p')]
      .flatMap((row) => row.textContent.split('·'))
      .map((name) => name.trim())
      .filter(Boolean).length,
    membersPerCohort: [...document.querySelectorAll('.cohort-row > p')]
      .map((row) => row.textContent.split('·').map((name) => name.trim()).filter(Boolean).length),
    methods: document.querySelectorAll('.method-list li').length,
    snapshotStats: [...document.querySelectorAll('.hero-stats strong')]
      .map((item) => item.textContent.trim()),
    inlineMemberTypography: (() => {
      const names = [...document.querySelectorAll('.cohort-row p span')];
      const properties = ['fontSize', 'fontWeight', 'letterSpacing', 'lineHeight'];
      const comparisons = names.map((name) => {
        const style = getComputedStyle(name);
        const parentStyle = getComputedStyle(name.parentElement);
        return {
          text: name.textContent.trim(),
          matchesParent: properties.every(
            (property) => style[property] === parentStyle[property],
          ),
          fontSize: style.fontSize,
          lineHeight: style.lineHeight
        };
      });
      return {
        count: names.length,
        allMatchParent: comparisons.every((item) => item.matchesParent),
        comparisons
      };
    })(),
    canvasResolution: {
      width: document.querySelector('#fieldCanvas').width,
      height: document.querySelector('#fieldCanvas').height
    }
  }))()`);

  if (!report.checks.content.inlineMemberTypography.allMatchParent) {
    throw new Error('Inline member names do not match their parent typography.');
  }

  const reportPath = path.join(
    qaDirectory,
    `qa-report${suffix}.json`,
  );
  writeNewFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
} finally {
  try {
    await send("Browser.close");
  } catch {
    edge.kill();
  }
  await delay(180);
  if (!edge.killed) edge.kill();
  socket.close();
}
