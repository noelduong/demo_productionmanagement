const fs = require('fs');
const html = fs.readFileSync('Index.html', 'utf8');

// Verify DOMContentLoaded has all calls
const match = html.match(/document\.addEventListener\("DOMContentLoaded"[\s\S]*?\}\);/);
if (match) {
    console.log('DOMContentLoaded block:');
    console.log(match[0]);
} else {
    console.log('DOMContentLoaded not found!');
}

// Verify key input elements  
console.log('\npartnerName has list?', html.includes('partnerName') && html.includes('partnerList'));
console.log('artCode has list?', html.includes('list="poList"'));
console.log('datalist#partnerList exists?', html.includes('id="partnerList"'));
console.log('datalist#poList exists?', html.includes('id="poList"'));
console.log('loadPartnersFromSheet called?', html.includes('loadPartnersFromSheet()'));
console.log('loadPODataFromSheet called?', html.includes('loadPODataFromSheet()'));
console.log('loadImagesFromSheet called?', html.includes('loadImagesFromSheet()'));
console.log('loadFactoryTabs called?', html.includes('loadFactoryTabs()'));
console.log('onPartnerChange handler?', html.includes('onPartnerChange'));
console.log('onArtCodeChange handler?', html.includes('onArtCodeChange'));
