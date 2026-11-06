/* ============================================================
   НАСТРОЙКИ
   ============================================================ */

// С какого дня показывать «Первый день». Формат: ГГГГ-ММ-ДД.
// Каждый следующий день сайт сам берёт следующий текст из texts.js.
// После 30-го дня всё начнётся сначала.
const START_DATE = "2026-11-06";

// Быстро посмотреть любой день: открой index.html?day=7
// (число от 1 до 30). Сайт сам этого не показывает, это для тебя.

// Какие частицы летают на фоне. Набор меняется каждый день по кругу.
// Если хочешь один вариант на все дни, оставь в списке только его.
const PARTICLES = [
  { type: "rise",    emoji: ["❤️", "💗", "💖", "💕"] },   // сердечки поднимаются вверх
  { type: "fall",    emoji: ["🌸", "🌷", "🌹"] },         // лепестки падают вниз
  { type: "twinkle", emoji: ["✨", "💫", "⭐", "💖"] },   // искорки мерцают
  { type: "drift",   emoji: ["🦋", "💗", "🌼"] }          // бабочки пролетают
];

// Скорость печати письма (мс на букву). Меньше = быстрее.
const TYPE_SPEED = 38;

/* ============================================================
   ЛОГИКА
   ============================================================ */

const $ = (id) => document.getElementById(id);
const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---- какой сегодня день ---- */
function currentIndex() {
  const q = new URLSearchParams(location.search).get("day");
  const n = DAYS.length;
  if (q && /^\d+$/.test(q)) return (Math.max(1, +q) - 1) % n;
  const [y, m, d] = START_DATE.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((today - start) / 86400000);
  return Math.max(0, diff) % n;
}
const idx = currentIndex();
const T = DAYS[idx];

/* ---- подставляем тексты ---- */
$("popupTitle").textContent = T.popup.title;
$("popupText").textContent = T.popup.text;
$("helloTitle").textContent = T.hello.title;
$("helloText").textContent = T.hello.text;
$("secretTitle").textContent = T.secretIntro.title;
$("secretSub").textContent = T.secretIntro.text;
$("remTitle").textContent = T.reminder.title;
$("remText").textContent = T.reminder.text;
$("sign").innerHTML = "";
T.sign.forEach((line, i) => {
  if (i) $("sign").appendChild(document.createElement("br"));
  $("sign").appendChild(document.createTextNode(line));
});
$("daytag").textContent = "Сегодня · " + new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

/* ---- появление карточек при прокрутке ---- */
if ("IntersectionObserver" in window && !still) {
  document.documentElement.classList.add("js");
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll("main .card, footer").forEach((el) => { el.classList.add("rv"); io.observe(el); });
}

/* ---- окно при входе ---- */
document.body.classList.add("locked");
$("openBtn").addEventListener("click", (e) => {
  $("gate").classList.add("out");
  document.body.classList.remove("locked");
  burst(e.clientX, e.clientY, 14, ["❤️", "💗", "💖", "✨"]);
  setTimeout(() => { $("gate").hidden = true; }, 650);
});

/* ---- кнопки: письмо, комплимент, сюрприз, обнимашки ---- */
const BURSTS = {
  letter:     ["💌", "💗", "✨"],
  compliment: ["🌹", "🌸", "💖"],
  surprise:   ["🎁", "🎉", "✨", "💝", "🎊"],
  hug:        ["🫂", "🤗", "💞", "❤️"]
};
const reveal = $("reveal");
$("btns").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const k = b.dataset.k;
  document.querySelectorAll("#btns button").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
  reveal.className = "reveal";
  reveal.replaceChildren();
  const t = document.createElement("span"); t.className = "rt"; t.textContent = T[k].title;
  const p = document.createElement("span"); p.className = "rb"; p.textContent = T[k].text;
  reveal.append(t, p);
  void reveal.offsetWidth;               // перезапуск анимации
  reveal.classList.add("a-" + k);
  burst(e.clientX, e.clientY, k === "surprise" ? 18 : 9, BURSTS[k]);
  if (k === "hug") rain(["💗", "💞", "🫂"], 14);
});

/* ---- секрет: письмо печатается по буквам ---- */
let typer = null;
$("secretBtn").addEventListener("click", (e) => {
  if (typer) typer.finish();
  const box = $("secretBox");
  box.replaceChildren();
  const wrap = document.createElement("div"); wrap.className = "letter";
  wrap.innerHTML = '<div class="spark">💖</div><h3></h3><p class="body"></p><p class="wish"></p>';
  wrap.querySelector("h3").textContent = T.secret.title;
  const body = wrap.querySelector(".body");
  const wish = wrap.querySelector(".wish");
  wish.textContent = T.secret.wish + " ❤️";
  box.appendChild(wrap);
  typer = typewrite(body, T.secret.text, () => wish.classList.add("show"));
  burst(e.clientX, e.clientY, 16, ["❤️", "💗", "💖", "💕"]);
  rain(["❤️", "💗", "💖", "🌹"], 22);
  wrap.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "center" });
  wrap.addEventListener("click", () => typer && typer.finish());   // клик по письму = показать сразу
});

function typewrite(el, text, done) {
  let i = 0, timer = null, ended = false;
  const end = () => {
    if (ended) return; ended = true;
    clearTimeout(timer);
    el.textContent = text; el.classList.remove("caret");
    done && done();
  };
  if (still) { end(); return { finish: end }; }
  el.classList.add("caret");
  (function step() {
    if (ended) return;
    el.textContent = text.slice(0, ++i);
    if (i >= text.length) return end();
    const ch = text[i - 1];
    timer = setTimeout(step, /[.!?]/.test(ch) ? TYPE_SPEED * 8 : /,/.test(ch) ? TYPE_SPEED * 4 : TYPE_SPEED);
  })();
  return { finish: end };
}

/* ---- частицы на фоне ---- */
const kind = PARTICLES[idx % PARTICLES.length];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function spawn() {
  if (still || document.hidden) return;
  const el = document.createElement("span");
  el.className = "p p-" + kind.type;
  el.textContent = pick(kind.emoji);
  el.style.fontSize = 16 + Math.random() * 20 + "px";
  el.style.setProperty("--dx", Math.random() * 90 - 45 + "px");
  el.style.setProperty("--rot", Math.random() * 120 - 60 + "deg");
  let dur = 9 + Math.random() * 7;
  if (kind.type === "twinkle") {
    dur = 2.5 + Math.random() * 2.5;
    el.style.left = Math.random() * 94 + "vw";
    el.style.top = Math.random() * 90 + "vh";
  } else if (kind.type === "drift") {
    dur = 14 + Math.random() * 8;
    el.style.top = 10 + Math.random() * 75 + "vh";
  } else {
    el.style.left = Math.random() * 94 + "vw";
  }
  el.style.opacity = ".6";
  el.style.animationDuration = dur + "s";
  el.addEventListener("animationend", () => el.remove());
  document.body.appendChild(el);
}
setInterval(spawn, kind.type === "twinkle" ? 500 : 1100);
for (let i = 0; i < 5; i++) setTimeout(spawn, i * 250);

/* ---- всплеск эмодзи из точки нажатия ---- */
function burst(x, y, n, set) {
  if (still) return;
  for (let i = 0; i < n; i++) {
    const el = document.createElement("span");
    el.className = "burst";
    el.textContent = pick(set);
    const a = Math.random() * Math.PI * 2, r = 50 + Math.random() * 100;
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.setProperty("--bx", Math.cos(a) * r + "px");
    el.style.setProperty("--by", Math.sin(a) * r - 40 + "px");
    el.style.setProperty("--rot", Math.random() * 160 - 80 + "deg");
    el.addEventListener("animationend", () => el.remove());
    document.body.appendChild(el);
  }
}

/* ---- дождь из эмодзи сверху ---- */
function rain(set, n) {
  if (still) return;
  for (let i = 0; i < n; i++) {
    setTimeout(() => {
      const el = document.createElement("span");
      el.className = "p p-fall";
      el.textContent = pick(set);
      el.style.zIndex = 25;
      el.style.left = Math.random() * 94 + "vw";
      el.style.fontSize = 20 + Math.random() * 18 + "px";
      el.style.setProperty("--dx", Math.random() * 60 - 30 + "px");
      el.style.setProperty("--rot", Math.random() * 200 - 100 + "deg");
      el.style.animationDuration = 3 + Math.random() * 2.5 + "s";
      el.addEventListener("animationend", () => el.remove());
      document.body.appendChild(el);
    }, i * 90);
  }
}
