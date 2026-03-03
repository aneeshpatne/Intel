import { chromium } from "playwright";
import { createClient } from "redis";
import { fileURLToPath } from "node:url";
import path from "node:path";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.resolve(currentDir, "../.env"));

const SCRAPE_CONCURRENCY = Number(process.env.SCRAPE_CONCURRENCY || 3);
const MIN_CONTENT_LENGTH = Number(process.env.MIN_CONTENT_LENGTH || 300);
const BLACKLIST_SET_KEY = process.env.SCRAPE_BLACKLIST_SET_KEY || "scrape:blacklist:domains";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
let redisClientPromise;

function getRedisClient() {
  if (!redisClientPromise) {
    const client = createClient({ url: redisUrl });
    redisClientPromise = client.connect().then(() => client).catch(() => null);
  }
  return redisClientPromise;
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function normalizeTextContent(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function isBlacklisted(domain) {
  if (!domain) return false;
  try {
    const redis = await getRedisClient();
    if (!redis) return false;
    return await redis.sIsMember(BLACKLIST_SET_KEY, domain);
  } catch {
    return false;
  }
}

async function addBlacklist(domain) {
  if (!domain) return;
  try {
    const redis = await getRedisClient();
    if (!redis) return;
    await redis.sAdd(BLACKLIST_SET_KEY, domain);
  } catch {
    // Ignore Redis errors to keep scraping resilient.
  }
}

async function simulateHumanBehavior(page) {
  try {
    const viewport = page.viewportSize();
    if (!viewport) return;

    for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
      await page.mouse.move(
        Math.floor(Math.random() * viewport.width),
        Math.floor(Math.random() * viewport.height),
        { steps: 10 + Math.floor(Math.random() * 20) },
      );
      await sleep(100 + Math.random() * 300);
    }

    await page.evaluate(() => {
      window.scrollBy({
        top: 200 + Math.random() * 400,
        behavior: "smooth",
      });
    });
    await sleep(500 + Math.random() * 500);
  } catch {
    // Ignore errors in human simulation.
  }
}

const BROWSER_PROFILES = [
  {
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    secChUa: '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    platform: "Windows",
  },
  {
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    secChUa: '"Chromium";v="123", "Not(A:Brand";v="24", "Google Chrome";v="123"',
    platform: "Windows",
  },
  {
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    secChUa: '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    platform: "macOS",
  },
  {
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
    secChUa: null,
    platform: "macOS",
  },
  {
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
    secChUa: null,
    platform: "Windows",
  },
  {
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    secChUa: '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    platform: "Linux",
  },
];

const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1536, height: 864 },
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 2560, height: 1440 },
];

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "America/Denver",
  "Europe/London",
];

export async function scrape(urls) {
  const normalizedUrls = Array.isArray(urls) ? urls : urls?.urls;
  if (!Array.isArray(normalizedUrls) || normalizedUrls.length === 0) {
    console.error(
      "scrape() expected a non-empty string[] or { urls: string[] } input.",
    );
    return [];
  }

  const results = [];
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-infobars",
        "--disable-background-networking",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-breakpad",
        "--disable-component-extensions-with-background-pages",
        "--disable-component-update",
        "--disable-default-apps",
        "--disable-extensions",
        "--disable-features=TranslateUI",
        "--disable-hang-monitor",
        "--disable-ipc-flooding-protection",
        "--disable-popup-blocking",
        "--disable-prompt-on-repost",
        "--disable-renderer-backgrounding",
        "--disable-sync",
        "--enable-features=NetworkService,NetworkServiceInProcess",
        "--force-color-profile=srgb",
        "--metrics-recording-only",
        "--no-first-run",
        "--password-store=basic",
        "--use-mock-keychain",
        "--ignore-certificate-errors",
      ],
    });

    async function scrapeSingleUrl(url) {
      let context;
      let page;
      try {
        const domain = getDomain(url);
        const isBlocked = await isBlacklisted(domain);
        if (isBlocked) {
          console.log(`Skipping blacklisted domain: ${domain} - ${url}`);
          return null;
        }

        const viewport = getRandom(VIEWPORTS);
        const profile = getRandom(BROWSER_PROFILES);
        const timezone = getRandom(TIMEZONES);

        const headers = {
          "Accept-Language": "en-US,en;q=0.9",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "Cache-Control": "max-age=0",
          "upgrade-insecure-requests": "1",
        };

        if (profile.secChUa) {
          headers["sec-ch-ua"] = profile.secChUa;
          headers["sec-ch-ua-mobile"] = "?0";
          headers["sec-ch-ua-platform"] = `"${profile.platform}"`;
          headers["sec-fetch-dest"] = "document";
          headers["sec-fetch-mode"] = "navigate";
          headers["sec-fetch-site"] = "none";
          headers["sec-fetch-user"] = "?1";
        }

        context = await browser.newContext({
          userAgent: profile.userAgent,
          viewport,
          screen: { width: viewport.width, height: viewport.height },
          deviceScaleFactor: Math.random() > 0.5 ? 1 : 2,
          hasTouch: false,
          locale: "en-US",
          timezoneId: timezone,
          extraHTTPHeaders: headers,
          javaScriptEnabled: true,
          bypassCSP: true,
        });

        await context.addInitScript(() => {
          Object.defineProperty(navigator, "webdriver", { get: () => undefined });

          Object.defineProperty(navigator, "languages", {
            get: () => ["en-US", "en"],
          });

          Object.defineProperty(navigator, "plugins", {
            get: () => {
              const plugins = [
                {
                  name: "Chrome PDF Plugin",
                  filename: "internal-pdf-viewer",
                  description: "Portable Document Format",
                },
                {
                  name: "Chrome PDF Viewer",
                  filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
                  description: "",
                },
                {
                  name: "Native Client",
                  filename: "internal-nacl-plugin",
                  description: "",
                },
              ];
              plugins.length = 3;
              return plugins;
            },
          });

          Object.defineProperty(navigator, "mimeTypes", {
            get: () => {
              const mimeTypes = [
                {
                  type: "application/pdf",
                  suffixes: "pdf",
                  description: "Portable Document Format",
                },
                {
                  type: "text/pdf",
                  suffixes: "pdf",
                  description: "Portable Document Format",
                },
              ];
              mimeTypes.length = 2;
              return mimeTypes;
            },
          });

          Object.defineProperty(navigator, "hardwareConcurrency", {
            get: () => [4, 8, 12, 16][Math.floor(Math.random() * 4)],
          });

          Object.defineProperty(navigator, "deviceMemory", {
            get: () => [4, 8, 16][Math.floor(Math.random() * 3)],
          });

          Object.defineProperty(navigator, "platform", {
            get: () => "Win32",
          });

          const originalQuery = window.navigator.permissions?.query;
          if (originalQuery) {
            window.navigator.permissions.query = (parameters) =>
              parameters.name === "notifications"
                ? Promise.resolve({ state: Notification.permission })
                : originalQuery(parameters);
          }

          window.chrome = {
            runtime: {
              PlatformOs: {
                MAC: "mac",
                WIN: "win",
                ANDROID: "android",
                CROS: "cros",
                LINUX: "linux",
                OPENBSD: "openbsd",
              },
              PlatformArch: { ARM: "arm", X86_32: "x86-32", X86_64: "x86-64" },
              PlatformNaclArch: { ARM: "arm", X86_32: "x86-32", X86_64: "x86-64" },
              RequestUpdateCheckStatus: {
                THROTTLED: "throttled",
                NO_UPDATE: "no_update",
                UPDATE_AVAILABLE: "update_available",
              },
              OnInstalledReason: {
                INSTALL: "install",
                UPDATE: "update",
                CHROME_UPDATE: "chrome_update",
                SHARED_MODULE_UPDATE: "shared_module_update",
              },
              OnRestartRequiredReason: {
                APP_UPDATE: "app_update",
                OS_UPDATE: "os_update",
                PERIODIC: "periodic",
              },
            },
            loadTimes: function () {},
            csi: function () {},
            app: { isInstalled: false },
          };

          const getParameterProxyHandler = {
            apply: function (target, ctx, args) {
              const param = args[0];
              const result = target.apply(ctx, args);
              if (param === 37445) return "Google Inc. (NVIDIA)";
              if (param === 37446) {
                return "ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 Direct3D11 vs_5_0 ps_5_0, D3D11)";
              }
              return result;
            },
          };

          try {
            const canvas = document.createElement("canvas");
            const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
            if (gl) {
              const getParameter = gl.getParameter.bind(gl);
              gl.getParameter = new Proxy(getParameter, getParameterProxyHandler);
            }
          } catch {
            // Ignore WebGL interception failures.
          }

          if (!window.Notification) {
            window.Notification = { permission: "default" };
          }

          Object.defineProperty(navigator, "connection", {
            get: () => ({
              effectiveType: "4g",
              rtt: 50,
              downlink: 10,
              saveData: false,
            }),
          });
        });

        page = await context.newPage();

        await page.route("**/*", (route) => {
          const resourceType = route.request().resourceType();
          if (["image", "media", "font"].includes(resourceType)) {
            route.abort();
          } else {
            route.continue();
          }
        });

        console.log(`Attempting to scrape: ${url}`);

        const urlObj = new URL(url);
        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
          referer: `https://www.google.com/search?q=${encodeURIComponent(urlObj.hostname)}`,
        });

        await sleep(1500 + Math.random() * 2000);
        await simulateHumanBehavior(page);
        await sleep(500 + Math.random() * 1000);

        const rawTextContent = await page.evaluate(() => document.body?.innerText ?? "");
        const textContent = normalizeTextContent(rawTextContent);
        const title = await page.title();
        const ogImage = await page.evaluate(() => {
          const meta = document.querySelector('meta[property="og:image"]');
          return meta ? meta.getAttribute("content") : null;
        });

        const scrapedDomain = getDomain(url);
        if (textContent.length < MIN_CONTENT_LENGTH) {
          console.log(
            `Content too short (${textContent.length} chars), blacklisting domain: ${scrapedDomain} - ${url}`,
          );
          await addBlacklist(scrapedDomain);
          return null;
        }

        console.log(`Successfully scraped: ${title} (${textContent.length} chars) - ${url}`);
        return { url, title, textContent, ogImage };
      } catch (error) {
        console.error(`Failed to scrape ${url}: ${error.message}`);
        const domain = getDomain(url);
        if (domain && error.message.includes("timeout")) {
          console.log(`Timeout error, blacklisting domain: ${domain}`);
          await addBlacklist(domain);
        }
      } finally {
        if (page) await page.close();
        if (context) await context.close();
        await sleep(2000 + Math.random() * 3000);
      }

      return null;
    }

    for (let i = 0; i < normalizedUrls.length; i += SCRAPE_CONCURRENCY) {
      const batch = normalizedUrls.slice(i, i + SCRAPE_CONCURRENCY);
      const batchResults = await Promise.all(batch.map((url) => scrapeSingleUrl(url)));
      results.push(...batchResults.filter(Boolean));
    }

    return results;
  } catch (error) {
    console.error(`Scrape failed: ${error.message}`);
    return [];
  } finally {
    if (browser) await browser.close();
  }
}
