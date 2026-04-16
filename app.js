const formatCurrencyCrore = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);

const formatNumber = (value) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);

const kpiConfig = [
  ["Pending amount", (kpis) => `${formatCurrencyCrore(kpis.pending_amount_crore)} Cr`],
  ["Settled amount", (kpis) => `${formatCurrencyCrore(kpis.settled_amount_crore)} Cr`],
  ["Amount liquidation", (kpis) => `${kpis.amount_liquidation_pct}%`],
  ["Settled accounts", (kpis) => formatNumber(kpis.settled_accounts)],
];

function renderKpis(kpis) {
  const grid = document.getElementById("kpi-grid");
  grid.innerHTML = kpiConfig
    .map(
      ([label, value]) => `
        <article class="kpi-card">
          <p class="kpi-label">${label}</p>
          <p class="kpi-value">${value(kpis)}</p>
        </article>
      `
    )
    .join("");
}

function renderBars(targetId, items, options = {}) {
  const el = document.getElementById(targetId);
  const {
    labelKey = "label",
    valueKey = "value",
    noteKey,
    maxValue = Math.max(...items.map((item) => item[valueKey]), 1),
    variant = "",
    formatter = (value) => value,
  } = options;

  el.innerHTML = items
    .map((item) => {
      const width = Math.max((item[valueKey] / maxValue) * 100, 2);
      return `
        <div class="bar-row">
          <div>
            <div class="bar-label">${item[labelKey]}</div>
            ${noteKey ? `<div class="bar-note">${item[noteKey]}</div>` : ""}
          </div>
          <div class="bar-track">
            <div class="bar-fill ${variant}" style="width:${width}%"></div>
          </div>
          <div class="bar-value">${formatter(item[valueKey])}</div>
        </div>
      `;
    })
    .join("");
}

function renderList(targetId, items) {
  const el = document.getElementById(targetId);
  el.innerHTML = items
    .map(
      (item) => `
        <div class="list-row">
          <div>
            <strong>${item.zone}</strong>
            <div class="table-subtle">${item.office_count} offices</div>
          </div>
          <div>${formatCurrencyCrore(item.settled_amount_crore)} Cr</div>
        </div>
      `
    )
    .join("");
}

function renderDonut(targetId, items, total) {
  const palette = ["#be5b2e", "#215a6d", "#6b8f71", "#d89b5d", "#9f6f56", "#4f7c85"];
  let running = 0;
  const segments = items
    .map((item, index) => {
      const pct = total ? (item.pending_amount / total) * 100 : 0;
      const start = running;
      running += pct;
      return `${palette[index % palette.length]} ${start}% ${running}%`;
    })
    .join(", ");

  const el = document.getElementById(targetId);
  el.innerHTML = `
    <div class="donut" style="--segments:${segments}">
      <div class="donut-center">
        <div>
          <span class="table-subtle">Pending amount</span>
          <strong>${formatCurrencyCrore(total / 10000000)} Cr</strong>
        </div>
      </div>
    </div>
    <div class="legend">
      ${items
        .map(
          (item, index) => `
            <div class="legend-row">
              <span class="legend-swatch" style="background:${palette[index % palette.length]}"></span>
              <span>${item.slab}</span>
              <strong>${item.amount_liquidation_pct}%</strong>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderTable(targetId, items) {
  const el = document.getElementById(targetId);
  el.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Office</th>
          <th>Zone</th>
          <th>Category</th>
          <th>Settled</th>
          <th>Pending</th>
          <th>Liquidation %</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `
              <tr>
                <td>${item.office}</td>
                <td>${item.zone}</td>
                <td>${item.office_category}</td>
                <td>${formatCurrencyCrore(item.settled_amount_crore)} Cr</td>
                <td>${formatCurrencyCrore(item.pending_amount_crore)} Cr</td>
                <td>${item.amount_liquidation_pct}%</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function uniqueValues(items, key) {
  return [...new Set(items.map((item) => item[key]).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b))
  );
}

function populateFilter(selectId, values, label) {
  const select = document.getElementById(selectId);
  select.innerHTML =
    `<option value="All">All ${label}</option>` +
    values.map((value) => `<option value="${value}">${value}</option>`).join("");
}

function matchesFilters(item, filters) {
  return (
    (filters.zone === "All" || item.zone === filters.zone) &&
    (filters.slab === "All" || item.amount_slab === filters.slab) &&
    (filters.category === "All" || item.office_category === filters.category)
  );
}

function buildDerived(data, filters) {
  const filteredOffices = data.offices.filter((item) => matchesFilters(item, filters));
  const visibleZones = data.zones.filter((zone) =>
    filters.zone === "All" ? true : zone.zone === filters.zone
  );
  const visibleSlabs = data.slabs.filter((slab) =>
    filters.slab === "All" ? true : slab.slab === filters.slab
  );

  return {
    filteredOffices,
    visibleZones,
    visibleSlabs,
    topContributors: [...filteredOffices]
      .sort((a, b) => b.settled_amount - a.settled_amount)
      .slice(0, 10),
    pendingOffices: [...filteredOffices]
      .sort((a, b) => b.pending_amount - a.pending_amount)
      .slice(0, 10),
    leastPerformers: [...filteredOffices]
      .filter((item) => item.total_amount >= 10000000)
      .sort((a, b) => a.amount_liquidation_pct - b.amount_liquidation_pct || b.pending_amount - a.pending_amount)
      .slice(0, 10),
    topRos: [...filteredOffices]
      .sort((a, b) => b.settled_amount - a.settled_amount)
      .slice(0, 10),
    bottomZones: [...visibleZones]
      .sort((a, b) => a.amount_liquidation_pct - b.amount_liquidation_pct)
      .slice(0, 5),
    settledZoneShare: [...visibleZones]
      .sort((a, b) => b.settled_amount - a.settled_amount)
      .slice(0, 8),
    zonalPerformance: [...visibleZones]
      .sort((a, b) => b.amount_liquidation_pct - a.amount_liquidation_pct),
  };
}

function renderNav(pages) {
  const nav = document.getElementById("page-nav");
  const allPages = ["All pages", ...pages];
  nav.innerHTML = allPages
    .map(
      (page, index) =>
        `<button class="${index === 0 ? "active" : ""}" type="button" data-page-target="${page}">${page}</button>`
    )
    .join("");

  nav.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-page-target]");
    if (!button) {
      return;
    }

    nav.querySelectorAll("button").forEach((node) => node.classList.remove("active"));
    button.classList.add("active");

    const page = button.dataset.pageTarget;
    document.querySelectorAll("[data-page]").forEach((panel) => {
      const shouldShow = page === "All pages" || panel.dataset.page === page;
      panel.classList.toggle("is-hidden", !shouldShow);
    });
  });
}

function refresh(data) {
  const filters = {
    zone: document.getElementById("zone-filter").value,
    slab: document.getElementById("slab-filter").value,
    category: document.getElementById("category-filter").value,
  };
  const derived = buildDerived(data, filters);

  renderBars(
    "zonal-performance",
    derived.zonalPerformance.map((item) => ({
      label: item.zone,
      value: item.amount_liquidation_pct,
      note: `${formatCurrencyCrore(item.pending_amount_crore)} Cr pending`,
    })),
    { labelKey: "label", valueKey: "value", noteKey: "note", formatter: (value) => `${value}%`, variant: "alt" }
  );

  renderBars(
    "top-contributors",
    derived.topContributors.map((item) => ({
      label: item.office,
      value: item.settled_amount_crore,
      note: item.zone,
    })),
    { labelKey: "label", valueKey: "value", noteKey: "note", formatter: (value) => `${formatCurrencyCrore(value)} Cr` }
  );

  renderBars(
    "pending-offices",
    derived.pendingOffices.map((item) => ({
      label: item.office,
      value: item.pending_amount_crore,
      note: item.zone,
    })),
    { labelKey: "label", valueKey: "value", noteKey: "note", formatter: (value) => `${formatCurrencyCrore(value)} Cr`, variant: "soft" }
  );

  renderBars(
    "least-performers",
    derived.leastPerformers.map((item) => ({
      label: item.office,
      value: item.amount_liquidation_pct,
      note: `${item.zone} • ${formatCurrencyCrore(item.pending_amount_crore)} Cr pending`,
    })),
    { labelKey: "label", valueKey: "value", noteKey: "note", formatter: (value) => `${value}%`, variant: "alt" }
  );

  renderBars(
    "bottom-zones",
    derived.bottomZones.map((item) => ({
      label: item.zone,
      value: item.amount_liquidation_pct,
      note: `${formatCurrencyCrore(item.pending_amount_crore)} Cr pending`,
    })),
    { labelKey: "label", valueKey: "value", noteKey: "note", formatter: (value) => `${value}%`, variant: "soft" }
  );

  renderList("zone-settled-share", derived.settledZoneShare);
  renderDonut(
    "slab-donut",
    derived.visibleSlabs.slice(0, 6),
    derived.visibleSlabs.reduce((sum, item) => sum + item.pending_amount, 0)
  );
  renderTable("top-ros", derived.topRos);
}

function init() {
  const data = window.DASHBOARD_DATA;
  if (!data) {
    throw new Error("dashboard data bundle is missing");
  }

  renderNav(data.views.overview.pages);
  renderKpis(data.kpis);
  populateFilter("zone-filter", uniqueValues(data.offices, "zone"), "zones");
  populateFilter("slab-filter", uniqueValues(data.offices, "amount_slab"), "slabs");
  populateFilter("category-filter", uniqueValues(data.offices, "office_category"), "categories");

  document.getElementById("generated-meta").textContent =
    `Sources: ${data.meta.source_files.join(" | ")}`;

  ["zone-filter", "slab-filter", "category-filter"].forEach((id) => {
    document.getElementById(id).addEventListener("change", () => refresh(data));
  });

  refresh(data);
}

try {
  init();
} catch (error) {
  document.body.innerHTML = `<main style="padding:2rem;font-family:sans-serif">Failed to load dashboard data.<br><br>${error}</main>`;
}
