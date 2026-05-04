import codecs
import json

with open(r'C:\Users\ASUS\Downloads\encoded-20260403140914.txt', 'r', encoding='utf-8') as f:
    b64_content = f.read().strip()
    if not b64_content.startswith('data:image/'):
        b64_content = 'data:image/png;base64,' + b64_content

with open(r'd:\APP\Index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '<img src="data:image/png;base64,' in line and 'referrerpolicy' not in line:
        lines[i] = '         <img src="' + b64_content + '"\n'
        break

with open(r'd:\APP\Index.html', 'w', encoding='utf-8') as f:
    f.writelines(lines)
