import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

new_filter = r'''      let filteredHistory = window.dashHistory.filter(o => {
          if (!o.poMonth) return false;
          let str = o.poMonth.toString();
          let mMonth = -1, mYear = -1;
          
          let m1 = str.match(/(?:^|\D)(\d{1,2})[\/\-](\d{4})(?:\D|$)/);
          if (m1) {
             mMonth = parseInt(m1[1], 10);
             mYear = parseInt(m1[2], 10);
          } else {
             let m2 = str.match(/(\d{4})[\/\-](\d{1,2})/);
             if (m2) {
                 mYear = parseInt(m2[1], 10);
                 mMonth = parseInt(m2[2], 10);
             } else {
                 let d = new Date(str);
                 if (!isNaN(d)) {
                     mYear = d.getFullYear();
                     mMonth = d.getMonth() + 1;
                 }
             }
          }
          return (mMonth === month && mYear === year);
      });'''

old_filter_regex = r'let mm = month < 10 \?.*?let filteredHistory = window\.dashHistory\.filter\(o => o\.poMonth === targetMonth\);'

match = re.search(old_filter_regex, content, flags=re.DOTALL)
if match:
    content = content[:match.start()] + new_filter + content[match.end():]
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Done!')
else:
    print('Not found')
