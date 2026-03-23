import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Activity, HeartPulse, ShieldCheck, Sparkles } from "lucide-react";
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
            <div className="glass-strong rounded-2xl border border-white/15 p-4 shadow-glass">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold text-white">{it.title}</div>
                </div>
                {it.right && isLikelyValidity(it.right) ? (
                  <div className="text-xs text-white/60">{it.right}</div>
                ) : null}
              </div>

              {it.subtitle ? (
                <div className="mt-2 text-xs leading-relaxed text-white/70">{it.subtitle}</div>
              ) : null}

              {it.bullets?.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-white/70">
                  {it.bullets.map((b, idx) => (
                    <li key={idx}>{b}</li>
                  ))}
                </ul>
              ) : null}

              {it.tips?.length ? (
                <div className="mt-3 rounded-xl border border-white/10 bg-black/10 p-3 text-[11px] leading-relaxed text-white/65">
                  <div className="mb-1 flex items-center gap-2 text-white/75">
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
                    className="rounded-xl border border-tech-blue/35 bg-tech-blue/15 px-3 py-2 text-xs font-semibold text-white hover:bg-tech-blue/25"
                    onClick={() => {
                      if (it.link_kind === "copy") {
                        copyToClipboard(it.link || "");
                        return;
                      }
                      window.open(it.link, "_blank", "noopener,noreferrer");
                    }}
                  >
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
                idx === active ? "w-6 bg-[#d4af37]" : "w-2 bg-white/25"
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
        className="hide-scrollbar relative flex max-w-full gap-5 overflow-x-auto rounded-full border border-white/15 bg-white/10 px-3 py-2"
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
              idx === active ? "text-white" : "text-white/60 hover:text-white/80"
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
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      {modules.map((m) => (
        <div key={m.id} className="rounded-3xl bg-card-border p-[1px] shadow-glow">
          <div className="glass rounded-3xl p-5">
            <div className="text-center text-lg font-semibold text-white">{m.title}</div>
            {m.description ? (
              <div className="mt-3 space-y-2">
                {parseL1Description(m.description).map((row, idx) => (
                  <div key={idx} className="grid grid-cols-[56px,1fr] gap-3 text-xs leading-relaxed">
                    <div className="font-semibold text-white/55">{row.label}</div>
                    <div className="text-white/55">{row.value}</div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              {(m.accordion || []).map((acc) => (
                <details
                  key={acc.id}
                  className="rounded-2xl border border-tech-blue/20 bg-tech-blue/10 px-4 py-3"
                >
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{acc.title}</div>
                        {acc.subtitle ? (
                          <div className="mt-1 text-xs text-white/60">{acc.subtitle}</div>
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs text-white/60">展开</div>
                    </div>
                  </summary>
                  {acc.tabs?.length ? (
                    <div className="mt-4">
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

/**
 * @param {{children: React.ReactNode, id: string}} props
 */
function Section({ children, id }) {
  return (
    <section id={id} className="mx-auto w-full max-w-6xl px-5 py-16 md:px-8">
      {children}
    </section>
  );
}

export default function App() {
  /** @type {InsuranceConfigRoot} */
  const data = insuranceConfig;
  const [showTool, setShowTool] = useState(false);

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
    <div className="min-h-screen text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
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
                className="text-white/70 hover:text-white"
                onClick={() => scrollToId(x.id)}
              >
                {x.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hero */}
      <section ref={heroRef} className="w-full px-0 pt-0">
        <div className="grid min-h-[78vh] gap-0 md:grid-cols-2 md:items-stretch">
          <div className="flex flex-col justify-center bg-hero-navy px-6 py-12 ring-1 ring-white/10 md:px-12">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-3xl font-bold tracking-wider md:text-5xl"
            >
              用科学与保障，
              <br />
              护航生命健康
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08 }}
              className="mt-4 max-w-lg text-sm leading-relaxed text-white/65 md:text-base"
            >
              以医疗科技风的交互方式，帮助患者与家属快速理解保障层级与创新药信息入口。
            </motion.p>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-xl bg-tech-blue px-5 py-3 text-sm font-semibold text-white shadow-glow hover:bg-tech-blue/90"
                onClick={() => scrollToId("science")}
              >
                立即开始
              </button>
              <button
                type="button"
                className="rounded-xl border border-white/18 bg-white/0 px-5 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10"
                onClick={() => scrollToId("drugs")}
              >
                查看创新药指南
              </button>
            </div>

            <div className="mt-8 flex items-center gap-3 text-xs text-white/55">
              <Activity className="h-4 w-4 text-tech-blue" />
              <span>滚动触发动画 · 响应式 · 玻璃拟态</span>
            </div>
          </div>

          <div className="relative overflow-hidden ring-1 ring-white/10">
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
              <div className="mt-1 text-xs text-white/65">
                模块化结构 + 类别切换 + 药物卡片横滑
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Module 1 */}
      <Section id="science">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="text-xs font-semibold tracking-widest text-mint-breath/90">MODULE 1</div>
            <div className="mt-2 text-2xl font-bold md:text-3xl">保障科普</div>
            <div className="mt-2 max-w-2xl text-sm text-white/65">
              初始仅展示 Slogan；点击后使用 Framer Motion 的 staggerChildren 横向弹出三张玻璃卡片。
            </div>
          </div>
          <div className="hidden md:block text-xs text-white/55">
            {heroInView ? "首屏已进入视口" : "向上滚动查看首屏"}
          </div>
        </div>

        <div className="mt-8">
          {!showTool ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              className="glass-strong rounded-3xl p-7 shadow-glow"
            >
              <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-lg font-semibold">用结构化信息，降低理解门槛</div>
                  <div className="mt-1 text-sm text-white/65">
                    从居民医保到惠民保与商业险，按层级展开查看目录、政策与入口。
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-xl bg-tech-blue px-5 py-3 text-sm font-semibold text-white shadow-glow hover:bg-tech-blue/90"
                  onClick={() => setShowTool(true)}
                >
                  了解更多
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.08 } }
              }}
            >
              <motion.div
                variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
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
                    <div className="glass rounded-3xl p-5">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-tech-blue/20 ring-1 ring-tech-blue/35">
                          <c.icon className="h-5 w-5 text-mint-breath" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{c.title}</div>
                          <div className="text-xs text-white/60">{c.desc}</div>
                        </div>
                      </div>
                      <div className="mt-4 text-xs text-white/60">
                        下方将加载你的「多层次保障科普小工具」内容（JSON 驱动）。
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}>
                <InsuranceTool data={data} />
              </motion.div>
            </motion.div>
          )}
        </div>
      </Section>

      {/* Module 2 */}
      <Section id="drugs">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <motion.div
            className="order-1 overflow-hidden rounded-3xl ring-1 ring-white/10"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.55 }}
          >
            <img
              src="/assets/drugs_bg.jpg"
              alt="drugs background"
              className="mask-fade-x aspect-video w-full object-cover"
              onError={(e) => {
                // 兜底：你没放 jpg 时仍能看到背景
                e.currentTarget.src = "/assets/drugs_bg.svg";
              }}
            />
            <div className="glass p-4">
              <div className="text-sm font-semibold">医学节律 · 工具化体验</div>
              <div className="mt-1 text-xs text-white/60">
                结合图片渐隐与滚动动效，保持“医疗科技风”的高级感。
              </div>
            </div>
          </motion.div>

          <div className="order-2">
            <div className="text-xs font-semibold tracking-widest text-mint-breath/90">MODULE 2</div>
            <div className="mt-2 text-2xl font-bold md:text-3xl">创新药指南</div>
            <div className="mt-2 text-sm leading-relaxed text-white/65">
              反向对开布局（左图右文）。点击按钮跳转到外部工具页面。
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                className="rounded-xl bg-tech-blue px-5 py-3 text-sm font-semibold text-white shadow-glow hover:bg-tech-blue/90"
                href="http://idate.top/gft.html"
                target="_blank"
                rel="noreferrer noopener"
              >
                打开注射日期计算器
              </a>
              <button
                type="button"
                className="rounded-xl border border-white/18 bg-white/0 px-5 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10"
                onClick={() => scrollToId("science")}
              >
                返回保障科普
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-white/5">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-10 text-sm text-white/60 md:flex-row md:items-center md:justify-between md:px-8">
          <div>提示：本页面为科普工具，具体政策以当地医保与产品条款为准。</div>
          <div>© {new Date().getFullYear()} Roche. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}

