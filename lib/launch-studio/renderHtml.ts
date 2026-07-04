import { LaunchDemo } from "./schema";

function esc(v:any) {
  return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

export function renderLaunchHtml(demo:LaunchDemo) {
  const accentMap:any = {
    blue: "#3b82f6",
    cyan: "#22d3ee",
    purple: "#a855f7",
    gold: "#f5c542",
    emerald: "#34d399"
  };

  const accent = accentMap[demo.accent] || "#3b82f6";

  const sections = demo.sections.map((s:any) => {
    if (s.type === "hero") {
      return `
<section class="hero">
  <div class="pill">${esc(s.eyebrow || "AI GENERATED DEMO")}</div>
  <h1>${esc(s.headline)}</h1>
  <p>${esc(s.subheadline)}</p>
  <div class="actions"><button>Launch Demo</button><button class="ghost">View Mockup</button></div>
</section>`;
    }

    if (s.type === "mock_dashboard") {
      const rows = (s.rows || []).map((r:any) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td class="blue">${esc(r[2])}</td><td class="green">${esc(r[3])}</td></tr>`).join("");
      return `
<section class="panel">
  <div class="panel-head"><strong>${esc(s.title || "Live Demo Preview")}</strong><span>SYS.STATUS: ONLINE</span></div>
  <table><tbody>${rows}</tbody></table>
</section>`;
    }

    if (s.type === "features") {
      const cards = (s.cards || []).map((c:any) => `<div class="card"><h3>${esc(c.title)}</h3><p>${esc(c.description)}</p></div>`).join("");
      return `<section><h2>${esc(s.title || "Features")}</h2><div class="grid">${cards}</div></section>`;
    }

    if (s.type === "stats") {
      const stats = (s.stats || []).map((x:any) => `<div class="stat"><small>${esc(x[0])}</small><strong>${esc(x[1])}</strong></div>`).join("");
      return `<section><h2>${esc(s.title || "Metrics")}</h2><div class="stats">${stats}</div></section>`;
    }

    if (s.type === "process") {
      const steps = (s.steps || []).map((x:any, i:number) => `<div class="card"><small>0${i+1}</small><h3>${esc(x.title)}</h3><p>${esc(x.description)}</p></div>`).join("");
      return `<section><h2>${esc(s.title || "How it works")}</h2><div class="grid">${steps}</div></section>`;
    }

    if (s.type === "pricing") {
      const plans = (s.plans || []).map((p:any) => `<div class="card"><h3>${esc(p.name)}</h3><strong class="price">${esc(p.price)}</strong><p>${(p.features || []).map((f:string)=>"• "+esc(f)).join("<br>")}</p></div>`).join("");
      return `<section><h2>${esc(s.title || "Pricing")}</h2><div class="grid">${plans}</div></section>`;
    }

    return `<section class="cta"><h2>${esc(s.headline || s.title || "Ready to launch?")}</h2><p>${esc(s.subheadline || s.description || "")}</p><button>Get Started</button></section>`;
  }).join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(demo.title)}</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#02040a;color:#fff;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow-x:hidden}
body:before{content:"";position:fixed;inset:0;background:linear-gradient(to right,rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,.045) 1px,transparent 1px);background-size:64px 64px;mask-image:linear-gradient(to bottom,#000,transparent);pointer-events:none}
body:after{content:"";position:fixed;top:-200px;left:50%;width:700px;height:700px;transform:translateX(-50%);background:${accent};opacity:.18;filter:blur(130px);border-radius:999px;pointer-events:none}
nav{position:sticky;top:18px;z-index:10;max-width:1180px;margin:18px auto 0;padding:16px 22px;border:1px solid rgba(255,255,255,.1);background:rgba(5,10,24,.72);backdrop-filter:blur(24px);border-radius:28px;display:flex;align-items:center;justify-content:space-between}
nav strong{letter-spacing:-.03em}.navlinks{display:flex;gap:28px;color:rgba(255,255,255,.55);font-size:14px}.join{background:#fff;color:#000;border:0;border-radius:999px;padding:12px 18px;font-weight:800}
main{position:relative;z-index:1;max-width:1180px;margin:0 auto;padding:80px 22px}
.hero{min-height:640px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center}.pill{display:inline-flex;border:1px solid color-mix(in srgb, ${accent} 45%, transparent);background:color-mix(in srgb, ${accent} 16%, transparent);color:#dbeafe;border-radius:999px;padding:9px 14px;font-size:12px;font-weight:800;letter-spacing:.18em}
h1{font-size:clamp(54px,8vw,112px);line-height:.88;margin:24px 0 18px;letter-spacing:-.075em;max-width:980px;background:linear-gradient(90deg,#fff,#bfdbfe,${accent});-webkit-background-clip:text;color:transparent}
h2{font-size:clamp(32px,5vw,64px);letter-spacing:-.06em;text-align:center;margin:0 0 22px}h3{font-size:22px;letter-spacing:-.03em;margin:0 0 10px}
p{color:rgba(255,255,255,.58);font-size:18px;line-height:1.7;max-width:780px}.actions{display:flex;gap:14px;margin-top:28px}button{background:${accent};color:#02040a;border:0;border-radius:999px;padding:15px 24px;font-weight:900;box-shadow:0 0 45px color-mix(in srgb, ${accent} 36%, transparent)}.ghost{background:rgba(255,255,255,.06);color:#fff;border:1px solid rgba(255,255,255,.12);box-shadow:none}
section{margin:90px 0}.panel{border:1px solid color-mix(in srgb, ${accent} 35%, transparent);background:linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.025));border-radius:30px;overflow:hidden;box-shadow:0 0 90px color-mix(in srgb, ${accent} 18%, transparent)}
.panel-head{display:flex;justify-content:space-between;align-items:center;padding:20px 24px;border-bottom:1px solid rgba(255,255,255,.08);font-size:13px}.panel-head span{color:${accent};font-size:11px;letter-spacing:.22em}
table{width:100%;border-collapse:collapse}td{padding:18px 24px;border-bottom:1px solid rgba(255,255,255,.055);font-weight:700;color:rgba(255,255,255,.72)}.blue{color:#93c5fd}.green{color:#6ee7b7}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.card,.stat{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.045);border-radius:26px;padding:26px;backdrop-filter:blur(18px)}.card p{font-size:15px}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}.stat small{color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.18em}.stat strong{display:block;margin-top:10px;font-size:32px}.price{display:block;font-size:38px;color:${accent};margin:10px 0 18px}.cta{text-align:center;border:1px solid rgba(255,255,255,.1);background:radial-gradient(circle at top, color-mix(in srgb, ${accent} 18%, transparent), rgba(255,255,255,.035));border-radius:36px;padding:70px 30px}.cta p{margin:0 auto 28px}
@media(max-width:800px){.navlinks{display:none}.grid,.stats{grid-template-columns:1fr}.hero{min-height:auto;padding-top:60px}td{font-size:12px;padding:14px 10px}}
</style>
</head>
<body>
<nav><strong>${esc(demo.title)}</strong><div class="navlinks">${(demo.nav || []).map(n=>`<span>${esc(n)}</span>`).join("")}</div><button class="join">Launch</button></nav>
<main>${sections}</main>
</body>
</html>`;
}