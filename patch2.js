const fs = require('fs');
let html = fs.readFileSync('Index.html', 'utf8');

const oldPartner = `<input
                id="partnerName"
                placeholder="Tên xưởng / người đại diện..."
              />`;

const newPartner = `<input id="partnerName" list="partnerList" placeholder="VD: TALYNO..." onchange="onPartnerChange(this.value)" />\n              <datalist id="partnerList"></datalist>`;

if (html.includes(oldPartner)) {
    html = html.replace(oldPartner, newPartner);
} else {
    // try removing newlines
    let html2 = html.replace(/\s+/g, ' ');
    if (html2.includes('<input id="partnerName" placeholder="Tên xưởng / người đại diện..." />')) {
        html = html.replace(/<input\s+id="partnerName"\s+placeholder="Tên xưởng \/ người đại diện..."\s*\/>/m, newPartner);
    }
}

const oldArt = '<input id="artCode" placeholder="VD: PLM-01" />';
const newArt = '<input id="artCode" list="poList" placeholder="VD: PO88" onchange="onArtCodeChange(this.value)" />\n                <datalist id="poList"></datalist>';
html = html.replace(oldArt, newArt);

// In function printPDF, it uses const supplier = document.getElementById("partnerName").value.trim() OR document.getElementById("supplier").value.trim() !
// Let's ensure it handles both!
html = html.replace('const supplier = document.getElementById("supplier").value.trim();', 'const supplier = document.getElementById("partnerName").value.trim();');
// Wait, my write_patch.js earlier already did:
// html = html.replace('<div style="font-weight:bold">${supplier}</div>', '<div style="font-weight:bold">${supplier}${allPartnersData.find(p => p.tradeName === supplier) && allPartnersData.find(p => p.tradeName === supplier).representative ? ...');

fs.writeFileSync('Index.html', html);
console.log('Fixed DOM IDs');
