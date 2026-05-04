const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const target = 'if (tabId === "planTab") {\n        loadMonthlyPlan();\n      }';
const replacement = 'if (tabId === "planTab") {\n        loadMonthlyPlan();\n      }\n      if (tabId === "dashboardTab") {\n        loadDashboardData();\n      }\n      if (tabId === "nplTab") {\n        loadNplApprovals();\n      }';

if (html.includes(target)) {
    html = html.replace(target, replacement);
    fs.writeFileSync('index.html', html, 'utf8');
    console.log("Success!");
} else {
    console.log("Target not found!");
    // Try with different indentation or line endings
    const target2 = 'if (tabId === "planTab") {\\n        loadMonthlyPlan();\\n      }';
    console.log("Retrying with regex...");
    html = html.replace(/if \(tabId === "planTab"\) \{\s+loadMonthlyPlan\(\);\s+\}/, replacement);
    fs.writeFileSync('index.html', html, 'utf8');
}
