import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { Copy, HeartPulse, ShieldCheck, Sparkles } from "lucide-react";
import insuranceConfig from "../insurance_config.json";

/**
 * @typedef {Object} AppListItem
 * @property {string} id
 * @property {string} title
 * @property {string=} subtitle
 * @property {Array<string>=} bullets
 * @property {Array<string>=} tips
 * @property {string=} right
 * @property {string=} link
 * @property {"open"|"copy"=} link_kind
 */

/**
 * @typedef {Object} AppTab
 * @property {string} id
 * @property {string} title
 * @property {Array<AppListItem>=} items
 */

/**
 * @typedef {Object} AppAccordionItem
 * @property {string} id
 * @property {string} title
 * @property {string=} subtitle
 * @property {Array<AppTab>=} tabs
 */

/**
 * @typedef {Object} AppModule
 * @property {string} id
 * @property {string} title
 * @property {string=} description
 * @property {Array<AppAccordionItem>=} accordion
 */

/**
 * @typedef {Object} InsuranceConfigRoot
 * @property {string} main_title
 * @property {Array<AppModule>=} modules
 */

/**
 * @param {string} id
 * @returns {void}
 */
function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * 打开 Module 1 并平滑滚动到锚点
 * @param {Function} setVisible
 * @returns {void}
 */
function openScienceModule(setVisible) {
  setVisible(true);
  window.setTimeout(() => {
    scrollToId("science");
  }, 30);
}

/**
 * @param {string} text
 * @returns {Array<{label: string, value: string}>}
 */
function parseL1Description(text) {
  const raw = String(text || "")
    .replace(/\\\\n/g, "\n") // 兼容 JSON 里被双重转义的 \\n
    .replace(/\\n/g, "\n")
    .trim();

  /** @type {Array<{label: string, value: string}>} */
  const rows = [];

  // 优先按“作用/亮点/局限…”这种字段拆分（允许有/无冒号）
  const keys = ["作用", "亮点", "局限", "定义", "举例", "共同特点", "一句话总结"];
  const keyRe = new RegExp("(" + keys.join("|") + ")\\s*：?", "g");
  const matches = Array.from(raw.matchAll(keyRe));

  if (matches.length) {
    matches.forEach((m, i) => {
      const label = String(m[1] || "").trim();
      const start = (m.index || 0) + String(m[0] || "").length;
      const end = i + 1 < matches.length ? (matches[i + 1].index || raw.length) : raw.length;
      const value = raw
        .slice(start, end)
        .replace(/^[\s：]+/g, "")
        .replace(/\s*\n\s*/g, "\n")
        .trim();
      if (label && value) rows.push({ label, value });
    });
    return rows;
  }

  // 兜底：逐行处理（兼容 “作用” 单独一行，下一行才是内容）
  const lines = raw
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  /** @type {string|null} */
  let pendingLabel = null;

  lines.forEach((line) => {
    const idx = line.indexOf("：");
    if (idx > 0) {
      pendingLabel = null;
      rows.push({ label: line.slice(0, idx), value: line.slice(idx + 1).trim() });
      return;
    }

    if (keys.includes(line)) {
      pendingLabel = line;
      return;
    }

    if (pendingLabel) {
      rows.push({ label: pendingLabel, value: line });
      pendingLabel = null;
      return;
    }

    if (rows.length) {
      rows[rows.length - 1].value += " " + line;
      return;
    }

    rows.push({ label: "说明", value: line });
  });

  return rows;
}

/**
 * @param {string} s
 * @returns {boolean}
 */
function isLikelyValidity(s) {
  const t = String(s || "");
  if (!t) return false;
  if (t.includes("有效期")) return true;
  return /\d{4}\/\d{1,2}\/\d{1,2}/.test(t);
}

/**
 * @param {string} text
 * @returns {Promise<void>}
 */
async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

/**
 * @param {{tab: AppTab}} props
 */
function DrugSwiper({ tab }) {
  const items = tab.items || [];
  const [active, setActive] = useState(0);
  /** @type {React.MutableRefObject<HTMLDivElement|null>} */
  const trackRef = useRef(null);

  useEffect(() => {
    setActive(0);
    if (trackRef.current) trackRef.current.scrollTo({ left: 0, behavior: "auto" });
  }, [tab.id]);

  return (
    <div className="mt-3">
      <div
        ref={trackRef}
        className="hide-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
        onScroll={(e) => {
          const el = /** @type {HTMLDivElement} */ (e.currentTarget);
          const idx = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
          setActive(Math.min(Math.max(idx, 0), Math.max(0, items.length - 1)));
        }}
      >
        {items.map((it) => (
          <div key={it.id} className="w-full shrink-0 snap-start pr-0">
            <div className="glass-strong rounded-2xl p-4 shadow-xl">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold text-slate-900">{it.title}</div>
                </div>
                {it.right && isLikelyValidity(it.right) ? (
                  <div className="text-xs text-slate-500">{it.right}</div>
                ) : null}
              </div>

              {it.subtitle ? (
                <div className="mt-2 text-xs leading-relaxed text-slate-600">{it.subtitle}</div>
              ) : null}

              {it.bullets?.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-slate-600">
                  {it.bullets.map((b, idx) => (
                    <li key={idx}>{b}</li>
                  ))}
                </ul>
              ) : null}

              {it.tips?.length ? (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
                  <div className="mb-1 flex items-center gap-2 text-slate-700">
                    <Sparkles className="h-4 w-4 text-mint-breath" />
                    <span className="font-semibold">小贴士</span>
                  </div>
                  <div className="space-y-1">
                    {it.tips.map((t, idx) => (
                      <div key={idx}>{t}</div>
                    ))}
                  </div>
                </div>
              ) : null}

              {it.link ? (
                <div className="mt-3">
                  <button
                    type="button"
                    className="group inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900 transition-colors hover:bg-blue-600 hover:text-white active:bg-blue-600 active:text-white"
                    onClick={() => {
                      if (it.link_kind === "copy") {
                        copyToClipboard(it.link || "");
                        return;
                      }
                      window.open(it.link, "_blank", "noopener,noreferrer");
                    }}
                  >
                    {it.link_kind === "copy" ? (
                      <Copy className="h-3.5 w-3.5 shrink-0 text-blue-900 group-hover:text-white group-active:text-white" aria-hidden />
                    ) : (
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-blue-900 group-hover:text-white group-active:text-white" aria-hidden />
                    )}
                    {it.link_kind === "copy" ? "复制链接" : "打开链接"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {items.length > 1 ? (
        <div className="mt-3 flex items-center justify-center gap-2">
          {items.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`第 ${idx + 1} 个药物`}
              className={[
                "h-2 rounded-full transition-all",
                idx === active ? "w-6 bg-[#d4af37]" : "w-2 bg-slate-300"
              ].join(" ")}
              onClick={() => {
                const el = trackRef.current;
                if (!el) return;
                el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
                setActive(idx);
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * @param {{tabs: Array<AppTab>}} props
 */
function SegmentedTabs({ tabs }) {
  const [active, setActive] = useState(0);
  /** @type {React.MutableRefObject<HTMLDivElement|null>} */
  const segRef = useRef(null);
  /** @type {React.MutableRefObject<HTMLDivElement|null>} */
  const indicatorRef = useRef(null);

  const activeTab = tabs[active];

  /** @param {number} idx */
  function activate(idx) {
    setActive(idx);
    requestAnimationFrame(() => {
      const seg = segRef.current;
      const ind = indicatorRef.current;
      if (!seg || !ind) return;
      const btn = /** @type {HTMLElement|null} */ (seg.querySelector(`[data-idx="${idx}"]`));
      if (!btn) return;
      ind.style.width = `${btn.offsetWidth}px`;
      ind.style.transform = `translateX(${btn.offsetLeft}px)`;

      // 自动把选中项滚到可见区域
      const left = btn.offsetLeft;
      const right = left + btn.offsetWidth;
      const viewL = seg.scrollLeft;
      const viewR = viewL + seg.clientWidth;
      if (left < viewL) seg.scrollTo({ left, behavior: "smooth" });
      else if (right > viewR) seg.scrollTo({ left: right - seg.clientWidth, behavior: "smooth" });
    });
  }

  useEffect(() => {
    activate(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs.map((t) => t.id).join("|")]);

  return (
    <div>
      <div
        ref={segRef}
        className="hide-scrollbar relative flex max-w-full gap-5 overflow-x-auto rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm"
        onScroll={() => {
          const seg = segRef.current;
          const ind = indicatorRef.current;
          if (!seg || !ind) return;
          const btn = /** @type {HTMLElement|null} */ (seg.querySelector(`[data-idx="${active}"]`));
          if (!btn) return;
          ind.style.width = `${btn.offsetWidth}px`;
          ind.style.transform = `translateX(${btn.offsetLeft}px)`;
        }}
      >
        <div
          ref={indicatorRef}
          className="pointer-events-none absolute bottom-2 left-0 h-0.5 rounded-full bg-[#d4af37] transition-all"
        />
        {tabs.map((t, idx) => (
          <button
            key={t.id}
            type="button"
            data-idx={idx}
            className={[
              "relative z-10 shrink-0 whitespace-nowrap px-2 py-1 text-xs font-semibold",
              idx === active ? "text-tech-blue" : "text-slate-500 hover:text-slate-700"
            ].join(" ")}
            onClick={() => activate(idx)}
          >
            {t.title}
          </button>
        ))}
      </div>

      {activeTab ? <DrugSwiper tab={activeTab} /> : null}
    </div>
  );
}

/**
 * @param {{data: InsuranceConfigRoot|null}} props
 */
function InsuranceTool({ data }) {
  const modules = data?.modules || [];
  return (
    <div className="legacy-m1-cards mt-6">
      {modules.map((m) => (
        <div key={m.id} className="legacy-m1-card">
          <div className="legacy-m1-inner">
            <div className="legacy-m1-head">
              <div className="legacy-m1-title">{m.title}</div>
              {m.description ? (
                <div className="legacy-m1-desc">
                  {parseL1Description(m.description).map((row, idx) => (
                    <div key={idx} className="legacy-m1-desc-row">
                      <div className="legacy-m1-desc-label">{row.label}</div>
                      <div className="legacy-m1-desc-value">{row.value}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="legacy-m1-accordion">
              {(m.accordion || []).map((acc) => (
                <details
                  key={acc.id}
                  className="legacy-m1-acc2"
                >
                  <summary className="legacy-m1-acc2-summary">
                    <div className="legacy-m1-acc2-left">
                      <div>
                        <div className="legacy-m1-acc2-title">{acc.title}</div>
                        {acc.subtitle ? (
                          <div className="legacy-m1-acc2-subtitle">{acc.subtitle}</div>
                        ) : null}
                      </div>
                    </div>
                    <span className="legacy-m1-acc2-chevron" aria-hidden="true">
                      <svg viewBox="0 0 20 20" fill="none">
                        <path
                          d="M5.5 7.5L10 12l4.5-4.5"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </summary>
                  {acc.tabs?.length ? (
                    <div className="legacy-m1-acc2-body">
                      <SegmentedTabs tabs={acc.tabs} />
                    </div>
                  ) : null}
                </details>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** @typedef {{index:number, description:string, date:string, dose:string, note?:string}} ScheduleRow */

const DRUG_OPTIONS = [
  { id: "g", name: "奥妥珠单抗", regimens: ["G-CHOP", "G-CVP", "G-B"] },
  { id: "pola", name: "维泊妥珠单抗", regimens: ["标准方案（6周期）", "标准方案（8周期）"] },
  { id: "glofit", name: "格菲妥珠单抗", regimens: ["标准阶梯方案"] },
  { id: "mosun", name: "莫妥珠单抗", regimens: ["标准阶梯方案"] }
];

/**
 * @param {Date} base
 * @param {number} days
 * @returns {Date}
 */
function addDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * @param {Date} base
 * @param {number} months
 * @returns {Date}
 */
function addMonths(base, months) {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * @param {Date} d
 * @returns {string}
 */
function formatDate(d) {
  return d.toLocaleDateString("zh-CN");
}

/**
 * @param {string} text
 * @returns {React.ReactNode}
 */
function renderDoseText(text) {
  const src = String(text || "");
  const parts = src.split(/(\d+(?:\.\d+)?mg|单药治疗)/g);
  return parts.map((p, i) =>
    /(\d+(?:\.\d+)?mg|单药治疗)/.test(p) ? (
      <span key={i} className="font-bold text-red-600">
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

/**
 * @param {string} drugId
 * @param {string} regimen
 * @param {string} startDate
 * @returns {Array<ScheduleRow>}
 */
function buildSchedule(drugId, regimen, startDate) {
  const start = new Date(startDate + "T00:00:00");
  /** @type {Array<ScheduleRow>} */
  const rows = [];

  if (drugId === "mosun") {
    rows.push({ index: 1, description: "第1次给药", date: formatDate(start), dose: "1mg" });
    rows.push({ index: 2, description: "第2次给药（1周后）", date: formatDate(addDays(start, 7)), dose: "2mg" });
    rows.push({ index: 3, description: "第3次给药（2周后）", date: formatDate(addDays(start, 14)), dose: "60mg" });
    rows.push({ index: 4, description: "第4次给药（3周后）", date: formatDate(addDays(start, 21)), dose: "60mg" });
    for (let i = 5; i <= 10; i += 1) {
      const date = addDays(start, 21 + (i - 4) * 21);
      rows.push({
        index: i,
        description: `第${i}/15次给药`,
        date: formatDate(date),
        dose: "30mg",
        note: i === 10 ? "若本次治疗后达到 CR（完全缓解），则停止莫妥珠单抗给药" : ""
      });
    }
    for (let i = 11; i <= 19; i += 1) {
      const date = addDays(start, 21 + (i - 4) * 21);
      rows.push({
        index: i,
        description: `第${i}/15次给药`,
        date: formatDate(date),
        dose: "30mg",
        note: "若第8周期后达到 PR/SD，继续治疗至第17个周期"
      });
    }
    return rows;
  }

  if (drugId === "glofit") {
    rows.push({ index: 1, description: "预处理（第1天）", date: formatDate(start), dose: "预处理" });
    rows.push({ index: 2, description: "第2次给药（1周后）", date: formatDate(addDays(start, 7)), dose: "2.5mg" });
    rows.push({ index: 3, description: "第3次给药（2周后）", date: formatDate(addDays(start, 14)), dose: "10mg" });
    rows.push({ index: 4, description: "第4次给药（3周后）", date: formatDate(addDays(start, 21)), dose: "30mg" });
    for (let i = 5; i <= 12; i += 1) {
      rows.push({
        index: i,
        description: `第${i}次给药（每21天）`,
        date: formatDate(addDays(start, 21 + (i - 4) * 21)),
        dose: "30mg"
      });
    }
    return rows;
  }

  if (drugId === "g") {
    const isGB = regimen === "G-B";
    const induction = isGB ? [0, 7, 14, 28] : [0, 7, 14, 21];
    induction.forEach((day, i) => {
      rows.push({
        index: i + 1,
        description: `强化期第${i + 1}次`,
        date: formatDate(addDays(start, day)),
        dose: "1000mg"
      });
    });

    const midCount = isGB ? 4 : 6;
    const midStep = isGB ? 28 : 21;
    for (let i = 1; i <= midCount; i += 1) {
      rows.push({
        index: rows.length + 1,
        description: `巩固期第${i}次`,
        date: formatDate(addDays(start, induction[induction.length - 1] + i * midStep)),
        dose: "1000mg"
      });
    }

    let base = addDays(start, induction[induction.length - 1] + midCount * midStep);
    for (let i = 1; i <= 12; i += 1) {
      base = addMonths(base, 2);
      rows.push({
        index: rows.length + 1,
        description: `维持期第${i}次（每2个月）`,
        date: formatDate(base),
        dose: "1000mg"
      });
    }
    return rows;
  }

  if (drugId === "pola") {
    const cycles = regimen.includes("8") ? 8 : 6;
    for (let i = 1; i <= cycles; i += 1) {
      rows.push({
        index: i,
        description: `第${i}周期（每21天）`,
        date: formatDate(addDays(start, (i - 1) * 21)),
        dose: "单药治疗 1.8mg/kg"
      });
    }
  }

  return rows;
}

function DrugCalculator() {
  const [drugId, setDrugId] = useState("g");
  const [regimen, setRegimen] = useState("G-CHOP");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [copied, setCopied] = useState(false);

  const selectedDrug = useMemo(
    () => DRUG_OPTIONS.find((d) => d.id === drugId) || DRUG_OPTIONS[0],
    [drugId]
  );

  useEffect(() => {
    setRegimen(selectedDrug.regimens[0]);
  }, [selectedDrug]);

  const rows = useMemo(() => buildSchedule(drugId, regimen, startDate), [drugId, regimen, startDate]);

  return (
    <div className="mt-5 grid gap-4 md:grid-cols-[190px,1fr]">
      <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
        <div className="space-y-2">
          {DRUG_OPTIONS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDrugId(d.id)}
              className={[
                "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                drugId === d.id ? "bg-[#3B82F6] text-white" : "bg-white text-slate-700 hover:bg-blue-50"
              ].join(" ")}
            >
              {d.name}
            </button>
          ))}
        </div>
      </aside>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">用药方案</span>
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800"
              value={regimen}
              onChange={(e) => setRegimen(e.target.value)}
            >
              {selectedDrug.regimens.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">首次用药日期</span>
            <input
              type="date"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="group inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-900 transition-colors hover:bg-blue-600 hover:text-white active:bg-blue-600 active:text-white"
            onClick={() => {
              copyToClipboard("http://idate.top/gft.html")
                .then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                })
                .catch(() => {});
            }}
          >
            <Copy className="h-3.5 w-3.5 text-blue-900 group-hover:text-white group-active:text-white" />
            复制外部计算器链接
          </button>
          {copied ? <span className="text-xs font-medium text-emerald-600">已复制</span> : null}
        </div>

        <div className="mt-4 max-h-[360px] overflow-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2">序号</th>
                <th className="px-3 py-2">描述</th>
                <th className="px-3 py-2">具体日期</th>
                <th className="px-3 py-2">剂量与关键备注</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.index} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2 text-slate-500">{r.index}</td>
                  <td className="px-3 py-2 text-slate-700">{r.description}</td>
                  <td className="px-3 py-2 text-slate-700">{r.date}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {renderDoseText(r.dose)}
                    {r.note ? <span className="ml-2 text-xs italic text-slate-500">{r.note}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * @param {{children: React.ReactNode, id: string, className?: string}} props
 */
function Section({ children, id, className }) {
  return (
    <section id={id} className={["mx-auto w-full max-w-7xl px-5 py-14 md:px-8", className || ""].join(" ")}>
      {children}
    </section>
  );
}

export default function App() {
  /** @type {InsuranceConfigRoot} */
  const data = insuranceConfig;
  const [isVisible, setIsVisible] = useState(false);

  const nav = useMemo(
    () => [
      { id: "science", label: "保障科普" },
      { id: "drugs", label: "创新药指南" }
    ],
    []
  );

  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { margin: "-20% 0px -20% 0px" });

  return (
    <div className="min-h-screen text-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-slate-200 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-tech-blue/20 ring-1 ring-tech-blue/35">
              <HeartPulse className="h-5 w-5 text-mint-breath" />
            </div>
            <div className="text-sm font-semibold tracking-wider">MedTech Insurance</div>
          </div>
          <div className="hidden items-center gap-6 text-sm md:flex">
            {nav.map((x) => (
              <button
                key={x.id}
                type="button"
                className="text-slate-600 hover:text-slate-900"
                onClick={() => scrollToId(x.id)}
              >
                {x.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hero */}
      <section ref={heroRef} className="mx-auto w-full max-w-7xl px-5 pt-6 md:px-8">
        <div className="grid overflow-hidden rounded-3xl shadow-xl md:grid-cols-2 md:min-h-[70vh] md:items-stretch">
          <div className="flex flex-col justify-center bg-white py-12 pl-6 pr-6 md:h-full md:pl-12 md:pr-12">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-gradient-to-r from-[#002347] to-[#007AFF] bg-clip-text text-3xl font-bold leading-tight tracking-wider text-transparent md:text-5xl"
            >
              用科学与保障，
              <br />
              护航生命健康
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08 }}
              className="mt-4 max-w-lg text-sm leading-relaxed text-slate-600 md:text-base"
            >
              深入了解多层次保障体系与创新药使用指南，让每一份保障更有温度。
            </motion.p>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-lg bg-[#002347] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95"
                onClick={() => openScienceModule(setIsVisible)}
              >
                了解多层次保障
              </button>
              <button
                type="button"
                className="rounded-lg border border-[#002347] bg-white px-5 py-3 text-sm font-semibold text-[#002347] transition hover:bg-slate-50"
                onClick={() => scrollToId("drugs")}
              >
                查看创新药指南
              </button>
            </div>
          </div>

          <div className="relative overflow-hidden md:h-full">
            <img
              src="/assets/insurance_bg.jpg"
              alt="insurance background"
              className="aspect-video h-full w-full object-cover md:aspect-auto"
              onError={(e) => {
                // 兜底：你没放 jpg 时仍能看到背景
                e.currentTarget.src = "/assets/insurance_bg.svg";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-l from-deep-navy/25 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 glass rounded-2xl p-4">
              <div className="text-sm font-semibold">保障科普 · 一页看懂</div>
            </div>
          </div>
        </div>
      </section>

      {/* Module 1 */}
      <Section id="science">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="mt-2 text-2xl font-bold text-[#007AFF] md:text-3xl">多层次保障科普</div>
          </div>
          <div className="hidden md:block text-xs text-slate-400">
            {heroInView ? "首屏已进入视口" : "向上滚动查看首屏"}
          </div>
        </div>

        <div className="mt-8">
          {!isVisible ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              className="glass-strong rounded-3xl p-7 shadow-xl"
            >
              <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-lg font-semibold">用结构化信息，降低理解门槛</div>
                  <div className="mt-1 text-sm text-slate-500">
                    从居民医保到惠民保与商业险，按层级展开查看目录、政策与入口。
                  </div>
                </div>
                <button
                  type="button"
                  className="group inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-900 transition-colors hover:bg-blue-600 hover:text-white active:bg-blue-600 active:text-white"
                  onClick={() => openScienceModule(setIsVisible)}
                >
                  <ShieldCheck className="h-4 w-4 shrink-0 text-blue-900 group-hover:text-white group-active:text-white" aria-hidden />
                  科普保障小工具
                </button>
              </div>
            </motion.div>
          ) : (
            <AnimatePresence>
              <motion.div
                key="science-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.08 } }
                  }}
                  className="grid gap-4 md:grid-cols-3"
                >
                  {[
                    { icon: ShieldCheck, title: "居民基本医保", desc: "基础保障 · 清单内报销" },
                    { icon: Sparkles, title: "惠民保", desc: "低门槛 · 补充大额费用" },
                    { icon: HeartPulse, title: "商业保险", desc: "更高保额 · 产品差异大" }
                  ].map((c, idx) => (
                    <motion.div
                      key={idx}
                      variants={{ hidden: { opacity: 0, x: -18 }, show: { opacity: 1, x: 0 } }}
                      className="rounded-3xl bg-card-border p-[1px]"
                    >
                      <div className="glass rounded-3xl p-5 shadow-xl">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-tech-blue/10 ring-1 ring-tech-blue/35">
                            <c.icon className="h-5 w-5 text-[#007AFF]" />
                          </div>
                          <div>
                            <div className="text-xl font-semibold text-slate-900 md:text-2xl">{c.title}</div>
                            <div className="text-xs text-slate-500">{c.desc}</div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}>
                  <InsuranceTool data={data} />
                </motion.div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </Section>

      {/* Module 2 */}
      <Section id="drugs" className="pt-20">
        <div className="grid gap-6 md:grid-cols-2 md:items-stretch md:gap-0 md:min-h-[60vh]">
          <motion.div
            className="order-1 overflow-hidden rounded-3xl ring-1 ring-white/10 md:h-full md:rounded-r-none"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.55 }}
          >
            <img
              src="/assets/drugs_bg.jpg"
              alt="drugs background"
              className="mask-fade-x aspect-video h-full w-full object-cover md:aspect-auto"
              onError={(e) => {
                // 兜底：你没放 jpg 时仍能看到背景
                e.currentTarget.src = "/assets/drugs_bg.svg";
              }}
            />
            <div className="glass p-4">
              <div className="text-sm font-semibold">医学节律 · 工具化体验</div>
            </div>
          </motion.div>

          <div className="order-2 flex h-full flex-col justify-center rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200 md:rounded-l-none md:p-10">
            <div className="mt-2 text-2xl font-bold text-[#007AFF] md:text-3xl">创新药使用指南</div>
            <DrugCalculator />
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-10 text-sm text-slate-500 md:flex-row md:items-center md:justify-between md:px-8">
          <div>提示：本页面为科普工具，具体政策以当地医保与产品条款为准。</div>
          <div>© {new Date().getFullYear()} Roche. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}




