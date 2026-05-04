const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Fix switchTab logic
const switchMatch = /if \(tabId === "planTab"\) \{[\s\S]*?loadMonthlyPlan\(\);[\s\S]*?\}[\s\S]*?\}/;
const switchNew = \`if (tabId === "planTab") {
        loadMonthlyPlan();
      }
      if (tabId === "dashboardTab") {
        loadDashboardData();
      }
      if (tabId === "nplTab") {
        loadNplApprovals();
      }
    }\`;

if (html.match(switchMatch)) {
    html = html.replace(switchMatch, switchNew);
    console.log("switchTab fixed!");
} else {
    console.log("switchTab match failed!");
}

fs.writeFileSync('index.html', html, 'utf8');
