import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

new_filter = r'''      let filteredHistory = window.dashHistory.filter(o => {
          // Lấy tháng từ ngày giao hàng (benchmarkD27), nếu không có thì lấy poMonth
          let targetDateStr = o.benchmarkD27 || o.poMonth || "";
          if (!targetDateStr) return false;
          
          let d27 = new Date(targetDateStr);
          if (isNaN(d27)) {
              let str = targetDateStr.toString();
              let mMonth = -1, mYear = -1;
              // Thử DD/MM/YYYY hoặc MM/YYYY
              let m1 = str.match(/(?:^|\D)(\d{1,2})[\/\-](\d{4})(?:\D|$)/);
              if (m1) {
                 mMonth = parseInt(m1[1], 10);
                 mYear = parseInt(m1[2], 10);
              } else {
                 // Thử YYYY-MM
                 let m2 = str.match(/(\d{4})[\/\-](\d{1,2})/);
                 if (m2) {
                     mYear = parseInt(m2[1], 10);
                     mMonth = parseInt(m2[2], 10);
                 }
              }
              return (mMonth === month && mYear === year);
          } else {
              return (d27.getMonth() + 1 === month && d27.getFullYear() === year);
          }
      });'''

old_filter_regex = r'let filteredHistory = window\.dashHistory\.filter\(o => \{.*?\n      \}\);'

match = re.search(old_filter_regex, content, flags=re.DOTALL)
if match:
    content = content[:match.start()] + new_filter + content[match.end():]
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Done!')
else:
    print('Not found')
