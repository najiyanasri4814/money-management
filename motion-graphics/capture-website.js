// DevTools-Protocol screenshot driver for headless Chrome.
// usage: node shoot.js "<name>:<path>|<name>:<path>|..." <outDir> <waitMs>
const fs = require("fs");
const path = require("path");

const ROUTES = process.argv[2].split("|");
const OUT = process.argv[3];
const WAIT = parseInt(process.argv[4] || "6000", 10);
const DEBUG = "http://127.0.0.1:9222";
const VW = 1920, VH = 1080;

fs.mkdirSync(OUT, { recursive: true });

function connect(url) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(url);
    ws.onopen = () => res(ws);
    ws.onerror = (e) => rej(new Error("ws error"));
  });
}
let idc = 0;
function send(ws, method, params = {}) {
  return new Promise((res, rej) => {
    const id = ++idc;
    const on = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id === id) {
        ws.removeEventListener("message", on);
        m.error ? rej(new Error(method + ": " + JSON.stringify(m.error))) : res(m.result);
      }
    };
    ws.addEventListener("message", on);
    ws.send(JSON.stringify({ id, method, params }));
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newTab() {
  const r = await fetch(DEBUG + "/json/new?about:blank", { method: "PUT" });
  return await r.json();
}
async function closeTab(id) {
  try { await fetch(DEBUG + "/json/close/" + id); } catch (e) {}
}

async function shoot(name, route) {
  const t = await newTab();
  const ws = await connect(t.webSocketDebuggerUrl);
  try {
    await send(ws, "Page.enable");
    await send(ws, "Runtime.enable");
    await send(ws, "Emulation.setDeviceMetricsOverride",
      { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
    await send(ws, "Page.navigate", { url: "http://localhost:3000" + route });
    // wait for readyState complete
    for (let i = 0; i < 60; i++) {
      const r = await send(ws, "Runtime.evaluate",
        { expression: "document.readyState", returnByValue: true });
      if (r.result && r.result.value === "complete") break;
      await sleep(250);
    }
    await sleep(WAIT);
    // capture viewport
    let shot = await send(ws, "Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(OUT, name + "-view.png"), Buffer.from(shot.data, "base64"));
    // text content
    const txt = await send(ws, "Runtime.evaluate",
      { expression: "document.body.innerText", returnByValue: true });
    const text = (txt.result && txt.result.value) || "";
    fs.writeFileSync(path.join(OUT, name + ".txt"), text);
    // full page
    const lm = await send(ws, "Page.getLayoutMetrics");
    const cs = lm.cssContentSize || (lm.contentSize);
    const fullH = Math.min(Math.ceil(cs.height), 4000);
    await send(ws, "Emulation.setDeviceMetricsOverride",
      { width: VW, height: fullH, deviceScaleFactor: 1, mobile: false });
    await sleep(900);
    shot = await send(ws, "Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(OUT, name + "-full.png"), Buffer.from(shot.data, "base64"));
    console.log(`${name}: route=${route} fullH=${fullH} textLen=${text.length}`);
    console.log("   text head: " + text.replace(/\s+/g, " ").slice(0, 180));
    return { name, fullH, text };
  } finally {
    ws.close();
    await closeTab(t.id);
  }
}

(async () => {
  const out = {};
  for (const r of ROUTES) {
    const [name, route] = r.split(":");
    try { out[name] = await shoot(name, route); }
    catch (e) { console.log(name + " ERROR " + e.message); }
  }
  // summary of whether real data is present
  const report = Object.values(out).map(o => ({
    name: o.name, fullH: o.fullH, hasRupee: /\u20b9|\d{1,3}(,\d{2,3})+/.test(o.text)
  }));
  console.log("SUMMARY " + JSON.stringify(report));
})();
