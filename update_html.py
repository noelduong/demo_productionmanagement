import re

USER_HTML = r'''
  :root {
    --navy-deep: #2A3254;
    --navy-mid: #384168;
    --blue-accent: #5877B2;
    --blue-soft: #9EB0D2;
    --blue-pale: #C9D4E8;
    --bg-paper: #E6E6E6;
    --card-paper: #FDFDFA;
    --bg-warm: #F8F7F4;
    --bg-soft: #EEEDE8;
    --text-primary: #2B2B2B;
    --text-secondary: #737373;
    --text-meta: #A5A5A5;
    --divider: #D9D9D9;
    --yellow: #FAC775;
    --highlight: #908C7D;

    --status-good: #7B9E89;
    --status-warn: #D4A55A;
    --status-crit: #C26B5B;

    --radius-card: 16px;
    --shadow-card: 0 1px 3px rgba(42,50,84,0.06), 0 4px 12px rgba(42,50,84,0.04);
  }

  #dashboardTab {
    font-family: 'Inter', -apple-system, sans-serif;
    background: var(--bg-paper);
    color: var(--text-primary);
    font-size: 13px;
    line-height: 1.5;
    min-height: 100vh;
    padding: 20px;
  }

  #dashboardTab .dashboard {
    max-width: 1400px;
    margin: 0 auto;
    background: var(--bg-paper);
    border-radius: 20px;
    overflow: hidden;
    position: relative;
  }

  /* ============ HEADER ============ */
  #dashboardTab .header {
    background: var(--navy-deep);
    padding: 24px 40px 80px;
    position: relative;
    border-radius: 20px 20px 0 0;
    color: white;
  }

  /* Top bar: month picker only */
  #dashboardTab .header-bar {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 18px;
    border-bottom: 1px solid rgba(158, 176, 210, 0.15);
  }

  #dashboardTab .brand-mark {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  #dashboardTab .brand-mark .mark-icon {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: var(--blue-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 13px;
    color: white;
    letter-spacing: 0.5px;
  }

  #dashboardTab .brand-mark .mark-text {
    font-size: 11px;
    font-weight: 700;
    color: white;
    letter-spacing: 2.5px;
    text-transform: uppercase;
  }

  /* Month picker */
  #dashboardTab .month-picker {
    display: flex;
    align-items: center;
    gap: 4px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(158, 176, 210, 0.25);
    border-radius: 999px;
    padding: 4px;
    transition: all 200ms ease;
    position: relative;
  }

  #dashboardTab .month-picker:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(158, 176, 210, 0.4);
  }

  #dashboardTab .month-nav {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: transparent;
    border: none;
    color: var(--blue-soft);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 150ms ease;
    font-family: inherit;
  }

  #dashboardTab .month-nav:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  #dashboardTab .month-current {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 14px;
    cursor: pointer;
    user-select: none;
  }

  #dashboardTab .month-current .icon {
    color: var(--blue-soft);
    display: flex;
  }

  #dashboardTab .month-current .label {
    font-size: 13px;
    font-weight: 700;
    color: white;
    letter-spacing: 0.3px;
  }

  #dashboardTab .month-current .chevron {
    color: var(--blue-soft);
    transition: transform 200ms ease;
  }

  #dashboardTab .month-picker.open .chevron {
    transform: rotate(180deg);
  }

  /* Dropdown */
  #dashboardTab .month-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    background: white;
    border-radius: 12px;
    padding: 14px;
    box-shadow: 0 10px 40px rgba(42, 50, 84, 0.25);
    min-width: 240px;
    z-index: 10;
    display: none;
  }

  #dashboardTab .month-picker.open .month-dropdown { display: block; }

  #dashboardTab .month-dropdown-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--bg-soft);
  }

  #dashboardTab .month-year {
    font-size: 13px;
    font-weight: 700;
    color: var(--navy-deep);
  }

  #dashboardTab .month-year-nav {
    display: flex;
    gap: 4px;
  }

  #dashboardTab .month-year-nav button {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    border: 1px solid var(--divider);
    background: white;
    color: var(--navy-deep);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: inherit;
  }

  #dashboardTab .month-year-nav button:hover {
    background: var(--bg-warm);
  }

  #dashboardTab .month-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }

  #dashboardTab .month-cell {
    padding: 8px 4px;
    text-align: center;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    border-radius: 6px;
    cursor: pointer;
    transition: all 150ms ease;
    border: 1px solid transparent;
  }

  #dashboardTab .month-cell:hover {
    background: var(--bg-warm);
    color: var(--navy-deep);
  }

  #dashboardTab .month-cell.active {
    background: var(--navy-deep);
    color: white;
  }

  #dashboardTab .month-cell.disabled {
    color: var(--text-meta);
    opacity: 0.4;
    cursor: not-allowed;
  }

  #dashboardTab .month-cell.disabled:hover {
    background: transparent;
  }

  #dashboardTab .header-top {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 32px;
    align-items: start;
    margin-bottom: 24px;
  }

  #dashboardTab .title-block h1 {
    font-size: 32px;
    font-weight: 800;
    letter-spacing: -0.5px;
    line-height: 1.1;
    margin-bottom: 6px;
    color: white;
  }

  #dashboardTab .title-block .subtitle {
    font-size: 13px;
    color: var(--blue-soft);
    font-weight: 400;
  }

  /* Inline stats under title */
  #dashboardTab .title-stats {
    display: flex;
    gap: 32px;
    margin-top: 22px;
    padding-top: 18px;
    border-top: 1px solid rgba(158, 176, 210, 0.2);
  }

  #dashboardTab .title-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  #dashboardTab .title-stat .lbl {
    font-size: 10px;
    color: var(--blue-soft);
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 500;
  }

  #dashboardTab .title-stat .val {
    font-size: 24px;
    font-weight: 800;
    color: white;
    line-height: 1;
    display: flex;
    align-items: baseline;
    gap: 4px;
  }

  #dashboardTab .title-stat .val small {
    font-size: 13px;
    font-weight: 500;
    color: var(--blue-soft);
  }

  #dashboardTab .title-stat .delta {
    font-size: 10px;
    font-weight: 600;
    margin-top: 2px;
  }

  #dashboardTab .title-stat .delta.up { color: #A5D6B7; }
  #dashboardTab .title-stat .delta.down { color: #E8A89B; }

  /* Donut Factory */
  #dashboardTab .donut-card {
    background: var(--card-paper);
    border-radius: var(--radius-card);
    padding: 18px 24px;
    box-shadow: var(--shadow-card);
    width: 320px;
    text-align: center;
    color: var(--text-primary);
    z-index: 2;
  }

  #dashboardTab .donut-card .card-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--navy-deep);
    margin-bottom: 2px;
  }

  #dashboardTab .donut-card .card-sub {
    font-size: 10px;
    color: var(--text-secondary);
    margin-bottom: 10px;
  }

  #dashboardTab .donut-wrap {
    position: relative;
    width: 140px;
    height: 140px;
    margin: 0 auto;
  }

  #dashboardTab .donut-center {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
  }

  #dashboardTab .donut-center .num {
    font-size: 22px;
    font-weight: 800;
    color: var(--navy-deep);
    line-height: 1;
  }

  #dashboardTab .donut-center .lbl {
    font-size: 9px;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 2px;
  }

  #dashboardTab .factory-legend {
    margin-top: 12px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 10px;
    text-align: left;
  }

  #dashboardTab .factory-legend .item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    color: var(--text-secondary);
  }

  #dashboardTab .factory-legend .item .swatch {
    width: 8px;
    height: 8px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  #dashboardTab .factory-legend .item .name {
    font-weight: 600;
    color: var(--text-primary);
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  #dashboardTab .factory-legend .item .pct {
    color: var(--text-meta);
    font-size: 9px;
  }

  #dashboardTab .month-card {
    text-align: right;
    padding-top: 4px;
  }

  #dashboardTab .month-card .lbl {
    font-size: 12px;
    color: var(--blue-soft);
    margin-bottom: 4px;
  }

  #dashboardTab .month-card .val {
    font-size: 28px;
    font-weight: 700;
  }

  /* Mini KPI 4 */
  #dashboardTab .mini-kpi-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    max-width: 880px;
  }

  #dashboardTab .mini-kpi {
    background: var(--card-paper);
    border-radius: var(--radius-card);
    padding: 14px 16px;
    box-shadow: var(--shadow-card);
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--text-primary);
  }

  #dashboardTab .mini-kpi .icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--bg-warm);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--navy-deep);
    flex-shrink: 0;
  }

  #dashboardTab .mini-kpi .info { flex: 1; min-width: 0; }
  #dashboardTab .mini-kpi .info .lbl {
    font-size: 12px;
    font-weight: 700;
    color: var(--navy-deep);
    line-height: 1.1;
  }
  #dashboardTab .mini-kpi .info .desc {
    font-size: 9px;
    color: var(--text-secondary);
    margin-bottom: 2px;
  }
  #dashboardTab .mini-kpi .info .val {
    font-size: 17px;
    font-weight: 700;
    color: var(--navy-deep);
    line-height: 1;
  }
  #dashboardTab .mini-kpi .info .val small {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  #dashboardTab .right-stack {
    position: absolute;
    right: 40px;
    top: 88px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 200px;
    z-index: 2;
  }

  #dashboardTab .stat-card {
    background: var(--card-paper);
    border-radius: var(--radius-card);
    padding: 14px 18px;
    box-shadow: var(--shadow-card);
  }

  #dashboardTab .stat-card .ttl {
    font-size: 13px;
    font-weight: 700;
    color: var(--navy-deep);
    margin-bottom: 2px;
  }

  #dashboardTab .stat-card .desc {
    font-size: 10px;
    color: var(--text-secondary);
    margin-bottom: 6px;
  }

  #dashboardTab .stat-card .num {
    font-size: 22px;
    font-weight: 700;
    color: var(--navy-deep);
    display: flex;
    align-items: baseline;
    gap: 4px;
  }

  #dashboardTab .stat-card .num small {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  #dashboardTab .stat-card .delta {
    font-size: 10px;
    font-weight: 600;
    margin-top: 2px;
  }

  #dashboardTab .stat-card .delta.up { color: var(--status-good); }
  #dashboardTab .stat-card .delta.down { color: var(--status-crit); }

  /* ============ MAIN ============ */
  #dashboardTab .main {
    padding: 0 40px 40px;
    margin-top: -40px;
    position: relative;
    z-index: 1;
  }

  #dashboardTab .grid { display: grid; gap: 16px; }

  #dashboardTab .row-1 { grid-template-columns: 1.1fr 1.4fr 1fr; }
  #dashboardTab .row-2 { grid-template-columns: 1fr 1fr; margin-top: 16px; }
  #dashboardTab .row-3 { grid-template-columns: 1.6fr 1fr; margin-top: 16px; }

  #dashboardTab .card {
    background: var(--card-paper);
    border-radius: var(--radius-card);
    padding: 18px 20px;
    box-shadow: var(--shadow-card);
  }

  #dashboardTab .card.dark {
    background: var(--navy-mid);
    color: white;
  }

  #dashboardTab .card-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  #dashboardTab .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--blue-accent);
    flex-shrink: 0;
  }

  #dashboardTab .card.dark .dot { background: white; }

  #dashboardTab .card-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--navy-deep);
  }

  #dashboardTab .card.dark .card-title { color: white; }

  #dashboardTab .card-sub {
    font-size: 10px;
    color: var(--text-secondary);
    margin-bottom: 14px;
    margin-left: 14px;
  }

  #dashboardTab .card.dark .card-sub { color: var(--blue-soft); }

  /* Bar chart */
  #dashboardTab .bar-chart {
    height: 180px;
    display: flex;
    align-items: flex-end;
    justify-content: space-around;
    gap: 8px;
    padding: 0 4px;
    border-bottom: 1px solid var(--divider);
    position: relative;
    margin-bottom: 8px;
  }

  #dashboardTab .bar-grid {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    pointer-events: none;
  }

  #dashboardTab .bar-grid span {
    border-bottom: 1px dashed var(--bg-soft);
    height: 0;
  }

  #dashboardTab .bar-grid span:last-child { border: none; }

  #dashboardTab .bar-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    justify-content: flex-end;
    z-index: 1;
  }

  #dashboardTab .bar {
    width: 70%;
    max-width: 28px;
    background: var(--navy-mid);
    border-radius: 3px 3px 0 0;
    position: relative;
  }

  #dashboardTab .bar-value {
    position: absolute;
    top: -16px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 9px;
    font-weight: 700;
    color: var(--navy-deep);
  }

  #dashboardTab .bar-label {
    margin-top: 6px;
    font-size: 9px;
    color: var(--text-secondary);
    text-align: center;
    font-weight: 500;
  }

  #dashboardTab .chart-yaxis {
    position: absolute;
    left: -2px;
    top: 0;
    bottom: 18px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    font-size: 8px;
    color: var(--text-meta);
  }

  #dashboardTab .chart-with-axis {
    position: relative;
    padding-left: 22px;
  }

  /* Horizontal bar - OTD per Factory */
  #dashboardTab .h-bar-chart { padding: 8px 0; }

  #dashboardTab .h-bar-row {
    display: grid;
    grid-template-columns: 70px 1fr 70px;
    gap: 10px;
    align-items: center;
    margin-bottom: 14px;
  }

  #dashboardTab .h-bar-row:last-child { margin-bottom: 0; }

  #dashboardTab .h-bar-label {
    font-size: 11px;
    color: white;
    text-align: right;
    font-weight: 600;
  }

  #dashboardTab .h-bar-track {
    position: relative;
    height: 22px;
    background: rgba(255,255,255,0.08);
    border-radius: 4px;
    overflow: visible;
  }

  #dashboardTab .h-bar-fill {
    height: 100%;
    border-radius: 4px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 8px;
  }

  #dashboardTab .h-bar-fill.excellent { background: var(--status-good); }
  #dashboardTab .h-bar-fill.good { background: var(--blue-accent); }
  #dashboardTab .h-bar-fill.warn { background: var(--status-warn); }
  #dashboardTab .h-bar-fill.poor { background: var(--status-crit); }

  #dashboardTab .h-bar-fill .pct {
    font-size: 10px;
    font-weight: 700;
    color: white;
  }

  #dashboardTab .h-bar-meta {
    font-size: 9px;
    color: var(--blue-soft);
    text-align: left;
    line-height: 1.3;
  }

  #dashboardTab .h-bar-axis {
    display: flex;
    justify-content: space-between;
    margin-left: 80px;
    margin-right: 80px;
    margin-top: 8px;
    padding-top: 6px;
    border-top: 1px solid rgba(255,255,255,0.1);
    font-size: 9px;
    color: var(--blue-soft);
  }

  #dashboardTab .legend {
    display: flex;
    gap: 12px;
    font-size: 10px;
    color: var(--blue-soft);
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  #dashboardTab .legend-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  #dashboardTab .legend-swatch {
    width: 8px;
    height: 8px;
    border-radius: 2px;
  }

  /* Pills + rows */
  #dashboardTab .row-detail {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
    align-items: center;
    padding: 8px 0;
    font-size: 11px;
    border-bottom: 1px dashed var(--bg-soft);
  }

  #dashboardTab .row-detail:last-child { border-bottom: none; }

  #dashboardTab .row-detail-label { color: var(--text-secondary); }

  #dashboardTab .pill {
    background: var(--blue-pale);
    color: var(--navy-deep);
    padding: 4px 14px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    text-align: center;
    min-width: 70px;
  }

  #dashboardTab .pill.warn { background: rgba(212,165,90,0.25); color: #8B6914; }
  #dashboardTab .pill.crit { background: rgba(194,107,91,0.20); color: var(--status-crit); }
  #dashboardTab .pill.good { background: rgba(123,158,137,0.20); color: var(--status-good); }

  /* Alert widgets */
  #dashboardTab .alert-card.warn-style {
    border-left: 4px solid var(--status-warn);
  }

  #dashboardTab .alert-card.crit-style {
    border-left: 4px solid var(--status-crit);
  }

  #dashboardTab .alert-summary {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 14px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--bg-soft);
  }

  #dashboardTab .alert-summary .big {
    font-size: 32px;
    font-weight: 800;
    line-height: 1;
  }

  #dashboardTab .alert-summary .big.crit { color: var(--status-crit); }
  #dashboardTab .alert-summary .big.warn { color: var(--status-warn); }

  #dashboardTab .alert-summary .ctx {
    font-size: 10px;
    color: var(--text-secondary);
  }

  #dashboardTab .alert-summary .ctx strong {
    color: var(--text-primary);
    font-size: 12px;
    display: block;
    margin-bottom: 2px;
  }

  #dashboardTab .alert-list-mini .row-detail {
    padding: 6px 0;
  }

  #dashboardTab .alert-list-mini .row-detail-label {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  #dashboardTab .alert-list-mini .row-detail-label .po-name {
    font-weight: 700;
    color: var(--navy-deep);
    font-size: 12px;
  }

  #dashboardTab .alert-list-mini .row-detail-label .reason {
    font-size: 10px;
    color: var(--text-meta);
  }

  /* Line chart */
  #dashboardTab .line-chart-wrap {
    height: 180px;
    position: relative;
    padding: 8px 8px 24px 22px;
  }

  #dashboardTab .line-svg { width: 100%; height: 100%; }

  #dashboardTab .line-x-axis {
    display: flex;
    justify-content: space-around;
    margin-top: 4px;
    font-size: 9px;
    color: var(--text-secondary);
    padding-left: 22px;
  }

  /* Action queue */
  #dashboardTab .actions-bar {
    margin-top: 16px;
    background: var(--card-paper);
    border-radius: var(--radius-card);
    padding: 18px 20px;
    box-shadow: var(--shadow-card);
  }

  #dashboardTab .actions-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
  }

  #dashboardTab .actions-table th {
    text-align: left;
    padding: 8px 10px;
    font-size: 9px;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--divider);
  }

  #dashboardTab .actions-table td {
    padding: 10px;
    border-bottom: 1px solid var(--bg-soft);
    font-size: 12px;
  }

  #dashboardTab .actions-table tr:last-child td { border-bottom: none; }

  #dashboardTab .po-link {
    font-weight: 700;
    color: var(--navy-deep);
  }

  #dashboardTab .factory-tag {
    display: inline-block;
    padding: 2px 8px;
    background: var(--bg-warm);
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    color: var(--navy-deep);
  }
'''

USER_DOM = r'''
<div class="dashboard">

  <!-- HEADER -->
  <div class="header">

    <!-- Top header bar: month picker only -->
    <div class="header-bar">
      <div class="month-picker" id="monthPicker" onclick="toggleMonthPicker(event)">
        <button class="month-nav" onclick="changeMonth(-1, event)" title="Tháng trước">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div class="month-current">
          <span class="icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </span>
          <span class="label" id="monthLabel">Tháng 5 · 2026</span>
          <span class="chevron">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </span>
        </div>
        <button class="month-nav" onclick="changeMonth(1, event)" title="Tháng sau">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        <!-- Dropdown -->
        <div class="month-dropdown" onclick="event.stopPropagation()">
          <div class="month-dropdown-head">
            <span class="month-year" id="dropYear">2026</span>
            <div class="month-year-nav">
              <button onclick="changeYear(-1)">‹</button>
              <button onclick="changeYear(1)">›</button>
            </div>
          </div>
          <div class="month-grid" id="monthGrid">
            <div class="month-cell" data-m="1">T1</div>
            <div class="month-cell" data-m="2">T2</div>
            <div class="month-cell" data-m="3">T3</div>
            <div class="month-cell" data-m="4">T4</div>
            <div class="month-cell active" data-m="5">T5</div>
            <div class="month-cell" data-m="6">T6</div>
            <div class="month-cell" data-m="7">T7</div>
            <div class="month-cell" data-m="8">T8</div>
            <div class="month-cell" data-m="9">T9</div>
            <div class="month-cell" data-m="10">T10</div>
            <div class="month-cell" data-m="11">T11</div>
            <div class="month-cell" data-m="12">T12</div>
          </div>
        </div>
      </div>
    </div>

    <div class="header-top">

      <div class="title-block">
        <h1 style="color: white;">PRODUCTION DASHBOARD</h1>
        <div class="subtitle">Tổng Quan Đơn Hàng & Nhà Máy · <span id="dyn-active-po">14</span> PO đang chạy</div>

        <div class="title-stats">
          <div class="title-stat">
            <span class="lbl">On-time Rate</span>
            <span class="val" id="dyn-ontime-rate">78<small>%</small></span>
            <span class="delta up">↑ 5% vs Q1</span>
          </div>
          <div class="title-stat">
            <span class="lbl">OTD · On-Time Delivery</span>
            <span class="val" id="dyn-otd-rate">82<small>%</small></span>
            <span class="delta down">↓ 3% vs T4</span>
          </div>
        </div>
      </div>

      <div class="donut-card">
        <div class="card-title">Phân Bổ Đơn Theo Nhà Máy</div>
        <div class="card-sub">Tỷ trọng PO theo factory</div>
        <div class="donut-wrap" id="dyn-donut-wrap">
          <svg viewBox="0 0 140 140" width="140" height="140">
            <circle cx="70" cy="70" r="48" fill="none" stroke="#EEEDE8" stroke-width="20"/>
            <circle cx="70" cy="70" r="48" fill="none" stroke="#2A3254" stroke-width="20"
              stroke-dasharray="75 226" stroke-dashoffset="0" transform="rotate(-90 70 70)"/>
            <circle cx="70" cy="70" r="48" fill="none" stroke="#5877B2" stroke-width="20"
              stroke-dasharray="60 226" stroke-dashoffset="-75" transform="rotate(-90 70 70)"/>
            <circle cx="70" cy="70" r="48" fill="none" stroke="#9EB0D2" stroke-width="20"
              stroke-dasharray="54 226" stroke-dashoffset="-135" transform="rotate(-90 70 70)"/>
            <circle cx="70" cy="70" r="48" fill="none" stroke="#C9D4E8" stroke-width="20"
              stroke-dasharray="45 226" stroke-dashoffset="-189" transform="rotate(-90 70 70)"/>
            <circle cx="70" cy="70" r="48" fill="none" stroke="#FAC775" stroke-width="20"
              stroke-dasharray="36 226" stroke-dashoffset="-234" transform="rotate(-90 70 70)"/>
            <circle cx="70" cy="70" r="48" fill="none" stroke="#908C7D" stroke-width="20"
              stroke-dasharray="30 226" stroke-dashoffset="-270" transform="rotate(-90 70 70)"/>
          </svg>
          <div class="donut-center">
            <div class="num" id="dyn-donut-num">14</div>
            <div class="lbl">PO Active</div>
          </div>
        </div>
        <div class="factory-legend" id="dyn-factory-legend">
          <div class="item"><span class="swatch" style="background:#2A3254"></span><span class="name">TALYNO</span><span class="pct">25%</span></div>
          <div class="item"><span class="swatch" style="background:#5877B2"></span><span class="name">ANH THƯ</span><span class="pct">20%</span></div>
          <div class="item"><span class="swatch" style="background:#9EB0D2"></span><span class="name">AN NGUYÊN</span><span class="pct">18%</span></div>
          <div class="item"><span class="swatch" style="background:#C9D4E8"></span><span class="name">LC</span><span class="pct">15%</span></div>
          <div class="item"><span class="swatch" style="background:#FAC775"></span><span class="name">GLX</span><span class="pct">12%</span></div>
          <div class="item"><span class="swatch" style="background:#908C7D"></span><span class="name">GIFT</span><span class="pct">10%</span></div>
        </div>
      </div>

    </div>

    <!-- 4 Mini KPI -->
    <div class="mini-kpi-row">
      <div class="mini-kpi">
        <div class="icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <div class="info">
          <div class="lbl">Đơn Hàng</div>
          <div class="desc">Tổng PO đang chạy</div>
          <div class="val" id="dyn-kpi-1">14</div>
        </div>
      </div>

      <div class="mini-kpi">
        <div class="icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
        </div>
        <div class="info">
          <div class="lbl">Sản Lượng</div>
          <div class="desc">Tổng pcs tháng này</div>
          <div class="val" id="dyn-kpi-2">45,200</div>
        </div>
      </div>

      <div class="mini-kpi">
        <div class="icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div class="info">
          <div class="lbl">Order Value</div>
          <div class="desc">Tổng giá trị đơn</div>
          <div class="val" id="dyn-kpi-3">2.84<small>B ₫</small></div>
        </div>
      </div>

      <div class="mini-kpi">
        <div class="icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div class="info">
          <div class="lbl">Cảnh Báo</div>
          <div class="desc">PO sắp + đã trễ</div>
          <div class="val" id="dyn-kpi-4">5</div>
        </div>
      </div>
    </div>

    <!-- Right: On-time + OTD removed → moved under title -->

  </div>

  <!-- ============ MAIN ============ -->
  <div class="main">

    <!-- ROW 1 -->
    <div class="grid row-1">

      <!-- 1.1 PO theo Nhà Máy -->
      <div class="card">
        <div class="card-head">
          <span class="dot"></span>
          <span class="card-title">PO Theo Nhà Máy</span>
        </div>
        <div class="card-sub">Số đơn đang chạy ở mỗi NM</div>

        <div class="chart-with-axis" id="dyn-bar-chart-container">
          <div class="chart-yaxis">
            <span>5</span><span>4</span><span>3</span><span>2</span><span>1</span><span>0</span>
          </div>
          <div class="bar-chart">
            <div class="bar-grid">
              <span></span><span></span><span></span><span></span><span></span><span></span>
            </div>
            <div class="bar-col">
              <div class="bar" style="height: 80%; background: #2A3254;">
                <span class="bar-value">4</span>
              </div>
              <span class="bar-label">TALYNO</span>
            </div>
            <div class="bar-col">
              <div class="bar" style="height: 60%; background: #5877B2;">
                <span class="bar-value">3</span>
              </div>
              <span class="bar-label">A.THƯ</span>
            </div>
            <div class="bar-col">
              <div class="bar" style="height: 60%; background: #9EB0D2;">
                <span class="bar-value">3</span>
              </div>
              <span class="bar-label">A.NGUYÊN</span>
            </div>
            <div class="bar-col">
              <div class="bar" style="height: 40%; background: #C9D4E8;">
                <span class="bar-value">2</span>
              </div>
              <span class="bar-label">LC</span>
            </div>
            <div class="bar-col">
              <div class="bar" style="height: 20%; background: #FAC775;">
                <span class="bar-value">1</span>
              </div>
              <span class="bar-label">GLX</span>
            </div>
            <div class="bar-col">
              <div class="bar" style="height: 20%; background: #908C7D;">
                <span class="bar-value">1</span>
              </div>
              <span class="bar-label">GIFT</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 1.2 OTD per Factory (DARK card — main widget) -->
      <div class="card dark">
        <div class="card-head">
          <span class="dot"></span>
          <span class="card-title">OTD Theo Nhà Máy</span>
        </div>
        <div class="card-sub">Tỷ lệ giao đúng hạn · Q2/2026</div>

        <div class="legend">
          <div class="legend-item"><span class="legend-swatch" style="background:#7B9E89"></span>≥ 90% Excellent</div>
          <div class="legend-item"><span class="legend-swatch" style="background:#5877B2"></span>80-89% Good</div>
          <div class="legend-item"><span class="legend-swatch" style="background:#D4A55A"></span>70-79% Warning</div>
          <div class="legend-item"><span class="legend-swatch" style="background:#C26B5B"></span>< 70% Poor</div>
        </div>

        <div class="h-bar-chart" id="dyn-hbar-chart">
          <div class="h-bar-row">
            <span class="h-bar-label">ANH THƯ</span>
            <div class="h-bar-track">
              <div class="h-bar-fill excellent" style="width: 94%;"><span class="pct">94%</span></div>
            </div>
            <span class="h-bar-meta">3 PO · 4.5K</span>
          </div>
          <div class="h-bar-row">
            <span class="h-bar-label">GLX</span>
            <div class="h-bar-track">
              <div class="h-bar-fill excellent" style="width: 91%;"><span class="pct">91%</span></div>
            </div>
            <span class="h-bar-meta">1 PO · 1.2K</span>
          </div>
          <div class="h-bar-row">
            <span class="h-bar-label">TALYNO</span>
            <div class="h-bar-track">
              <div class="h-bar-fill good" style="width: 85%;"><span class="pct">85%</span></div>
            </div>
            <span class="h-bar-meta">4 PO · 8.2K</span>
          </div>
          <div class="h-bar-row">
            <span class="h-bar-label">LC</span>
            <div class="h-bar-track">
              <div class="h-bar-fill good" style="width: 82%;"><span class="pct">82%</span></div>
            </div>
            <span class="h-bar-meta">2 PO · 3.1K</span>
          </div>
          <div class="h-bar-row">
            <span class="h-bar-label">GIFT</span>
            <div class="h-bar-track">
              <div class="h-bar-fill warn" style="width: 75%;"><span class="pct">75%</span></div>
            </div>
            <span class="h-bar-meta">1 PO · 0.8K</span>
          </div>
          <div class="h-bar-row">
            <span class="h-bar-label">AN NGUYÊN</span>
            <div class="h-bar-track">
              <div class="h-bar-fill poor" style="width: 65%;"><span class="pct">65%</span></div>
            </div>
            <span class="h-bar-meta">3 PO · 5.6K</span>
          </div>
          <div class="h-bar-axis">
            <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
          </div>
        </div>
      </div>

      <!-- 1.3 Order Value per Factory -->
      <div class="card">
        <div class="card-head">
          <span class="dot"></span>
          <span class="card-title">Order Value / NM</span>
        </div>
        <div class="card-sub">Giá trị đơn theo nhà máy</div>

        <div id="dyn-value-list">
          <div class="row-detail"><span class="row-detail-label">TALYNO</span><span class="pill">820M ₫</span></div>
          <div class="row-detail"><span class="row-detail-label">ANH THƯ</span><span class="pill">645M ₫</span></div>
          <div class="row-detail"><span class="row-detail-label">AN NGUYÊN</span><span class="pill">512M ₫</span></div>
          <div class="row-detail"><span class="row-detail-label">LC</span><span class="pill">425M ₫</span></div>
          <div class="row-detail"><span class="row-detail-label">GLX</span><span class="pill">285M ₫</span></div>
          <div class="row-detail"><span class="row-detail-label">GIFT</span><span class="pill">155M ₫</span></div>
        </div>
      </div>

    </div>

    <!-- ROW 2 — ALERTS -->
    <div class="grid row-2">

      <div class="card alert-card warn-style">
        <div class="card-head">
          <span class="dot" style="background: var(--status-warn);"></span>
          <span class="card-title">Sắp Trễ Hạn</span>
        </div>
        <div class="card-sub">Đơn có nguy cơ trễ trong ≤ 3 ngày</div>

        <div id="dyn-alert-warning-container">
          <div class="alert-summary">
            <div class="big warn" id="dyn-warn-count">3</div>
            <div class="ctx">
              <strong>Đơn cần can thiệp sớm</strong>
              <span id="dyn-warn-ctx">Tổng: 4,400 pcs · 287M ₫</span>
            </div>
          </div>

          <div class="alert-list-mini" id="dyn-alert-warning">
            <div class="row-detail">
              <span class="row-detail-label">
                <span class="po-name">PO07 · Polo SS26</span>
                <span class="reason">TALYNO · 1,500 pcs · 95M ₫</span>
              </span>
              <span class="pill warn">Hôm nay</span>
            </div>
            <div class="row-detail">
              <span class="row-detail-label">
                <span class="po-name">PO09 · Knit Polo</span>
                <span class="reason">ANH THƯ · 900 pcs · 62M ₫</span>
              </span>
              <span class="pill warn">+2 ngày</span>
            </div>
            <div class="row-detail">
              <span class="row-detail-label">
                <span class="po-name">PO12 · Twill Shirt</span>
                <span class="reason">LC · 2,000 pcs · 130M ₫</span>
              </span>
              <span class="pill warn">+3 ngày</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card alert-card crit-style">
        <div class="card-head">
          <span class="dot" style="background: var(--status-crit);"></span>
          <span class="card-title">Đã Trễ Hạn</span>
        </div>
        <div class="card-sub">Đơn đã quá deadline</div>

        <div id="dyn-alert-critical-container">
          <div class="alert-summary">
            <div class="big crit" id="dyn-crit-count">2</div>
            <div class="ctx">
              <strong>Đơn cần escalate ngay</strong>
              <span id="dyn-crit-ctx">Tổng: 3,500 pcs · 245M ₫</span>
            </div>
          </div>

          <div class="alert-list-mini" id="dyn-alert-critical">
            <div class="row-detail">
              <span class="row-detail-label">
                <span class="po-name">PO03 · Henley Linen</span>
                <span class="reason">AN NGUYÊN · 2,000 pcs · 156M ₫</span>
              </span>
              <span class="pill crit">−15 ngày</span>
            </div>
            <div class="row-detail">
              <span class="row-detail-label">
                <span class="po-name">PO01 · Pique Cotton</span>
                <span class="reason">TALYNO · 1,500 pcs · 89M ₫</span>
              </span>
              <span class="pill crit">−2 ngày</span>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- ROW 3 — Throughput + Top PO -->
    <div class="grid row-3">

      <div class="card">
        <div class="card-head">
          <span class="dot"></span>
          <span class="card-title">Throughput Trend</span>
        </div>
        <div class="card-sub">Sản lượng giao theo tuần · 8 tuần qua</div>

        <div class="line-chart-wrap">
          <div class="chart-yaxis" style="bottom: 24px;">
            <span>15K</span><span>10K</span><span>5K</span><span>0</span>
          </div>
          <svg class="line-svg" viewBox="0 0 600 160" preserveAspectRatio="none">
            <line x1="0" y1="40" x2="600" y2="40" stroke="#EEEDE8" stroke-dasharray="3,3"/>
            <line x1="0" y1="80" x2="600" y2="80" stroke="#EEEDE8" stroke-dasharray="3,3"/>
            <line x1="0" y1="120" x2="600" y2="120" stroke="#EEEDE8" stroke-dasharray="3,3"/>
            <polyline points="20,90 95,85 170,80 245,75 320,72 395,70 470,68 545,65"
              fill="none" stroke="#9EB0D2" stroke-width="2" stroke-dasharray="4,3"/>
            <polyline points="20,100 95,95 170,70 245,55 320,40 395,55 470,45 545,30"
              fill="none" stroke="#2A3254" stroke-width="2.5"/>
            <circle cx="20" cy="100" r="3" fill="#2A3254"/>
            <circle cx="95" cy="95" r="3" fill="#2A3254"/>
            <circle cx="170" cy="70" r="3" fill="#2A3254"/>
            <circle cx="245" cy="55" r="3" fill="#2A3254"/>
            <circle cx="320" cy="40" r="3" fill="#2A3254"/>
            <circle cx="395" cy="55" r="3" fill="#2A3254"/>
            <circle cx="470" cy="45" r="3" fill="#2A3254"/>
            <circle cx="545" cy="30" r="3" fill="#2A3254"/>
          </svg>
        </div>
        <div class="line-x-axis">
          <span>W1</span><span>W2</span><span>W3</span><span>W4</span>
          <span>W5</span><span>W6</span><span>W7</span><span>W8</span>
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <span class="dot"></span>
          <span class="card-title">Top PO Vấn Đề</span>
        </div>
        <div class="card-sub">PO cần can thiệp</div>

        <div id="dyn-top-po">
          <div class="row-detail"><span class="row-detail-label">PO03 · AN NGUYÊN</span><span class="pill crit">−15d</span></div>
          <div class="row-detail"><span class="row-detail-label">PO07 · TALYNO</span><span class="pill crit">Today</span></div>
          <div class="row-detail"><span class="row-detail-label">PO01 · TALYNO</span><span class="pill crit">−2d</span></div>
          <div class="row-detail"><span class="row-detail-label">PO09 · ANH THƯ</span><span class="pill warn">+2d</span></div>
          <div class="row-detail"><span class="row-detail-label">PO12 · LC</span><span class="pill warn">+3d</span></div>
        </div>
      </div>

    </div>

    <!-- ACTION QUEUE TABLE -->
    <div class="actions-bar">
      <div class="card-head">
        <span class="dot"></span>
        <span class="card-title">Action Queue</span>
      </div>
      <div class="card-sub">Việc cần xử lý hôm nay · sort theo urgency</div>

      <table class="actions-table">
        <thead>
          <tr>
            <th>Mã PO</th>
            <th>Sản phẩm</th>
            <th>Nhà máy</th>
            <th>Việc cần làm</th>
            <th>Số lượng</th>
            <th>Giá trị</th>
            <th>Phụ trách</th>
            <th>Deadline</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="dyn-action-queue">
          <tr>
            <td><span class="po-link">PO07</span></td>
            <td>Polo SS26</td>
            <td><span class="factory-tag">TALYNO</span></td>
            <td>Duyệt vải shipping sample</td>
            <td>1,500 pcs</td>
            <td>95M ₫</td>
            <td>Linh</td>
            <td><span class="pill crit">Hôm nay</span></td>
            <td style="text-align:right;"><span style="color: var(--blue-accent); font-weight:600; font-size:11px;">Xử lý →</span></td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>

</div>
'''

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace everything inside #dashboardTab 
# from <style> to the end of <div class="dashboard">...</div>
# wait, my new HTML already contains `<div class="dashboard">`
# And we also need to append the JS snippet the user provided `<script>...`
# So we can just replace everything in #dashboardTab
pattern_content = r'(<div id="dashboardTab" class="tab-content">).*?(<!-- TAB: NPL & APPROVAL -->)'
replacement = r'\1\n<style>\n' + USER_HTML + '\n</style>\n' + USER_DOM + r'\n    </div>\n    \2'

content = re.sub(pattern_content, replacement, content, flags=re.DOTALL)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated HTML exactly per user's template!")
