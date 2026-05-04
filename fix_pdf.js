const fs = require('fs');
let content = fs.readFileSync('Index.html', 'utf8');

// Find the Signature part in the PDF export
const exportMatchStr = '<div class="signature-box" style="text-align: right;">\\s*<div class="sign-title">Ð?I DI?N NHÀ CUNG C?P</div>\\s*<div class="sign-italic">\\(Ký & ghi rõ h? tên\\)</div>\\s*</div>';
const exportRegex = new RegExp(exportMatchStr, 's');

const replaceStr = '<div class="signature-box" style="text-align: right;">\\n                <div class="sign-title">Ð?I DI?N NHÀ CUNG C?P</div>\\n                <div class="sign-italic" id="pdfCompanyRep">(Ký & ghi rõ h? tên)</div>\\n              </div>';

content = content.replace(exportRegex, replaceStr);

// We need to inject the representative calculation right before html += ...
const htmlPlusRegex = /html \+= \\\s*<div class="pdf-signatures">/s;
const calcLogic = 
          // Signature Rep Logic
          const partnerName = document.getElementById("partnerName").value;
          const selectedPartner = allPartnersData.find(p => p.tradeName === partnerName);
          let repHTML = "(Ký & ghi rõ h? tên)";
          if (selectedPartner && selectedPartner.representative) {
              const repNameOnly = selectedPartner.representative.split("\\n")[0];
              repHTML = \<div style="font-weight: bold; margin-bottom: 5px;">\</div>(Ký & ghi rõ h? tên)\;
          }

          html += \
            <div class="pdf-signatures">\;
;

content = content.replace(htmlPlusRegex, calcLogic);
content = content.replace('id="pdfCompanyRep">(Ký & ghi rõ h? tên)', 'id="pdfCompanyRep">');

fs.writeFileSync('Index.html', content);
console.log("Replaced successfully!");
