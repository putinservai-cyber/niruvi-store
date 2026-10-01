const fs = require('fs');

function patchModal(file, isOpenVar) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('usePreventBodyScroll')) return;

  // Try to find imports
  let match = content.match(/import React[^;]+;/);
  if (match) {
    content = content.replace(match[0], match[0] + "\nimport { usePreventBodyScroll } from '../hooks/usePreventBodyScroll';");
  } else {
    content = "import { usePreventBodyScroll } from '../hooks/usePreventBodyScroll';\n" + content;
  }

  // Add hook call right before if (!isOpenVar) return null;
  const target = `  if (!${isOpenVar}) return null;`;
  const replacement = `  usePreventBodyScroll(${isOpenVar});\n\n  if (!${isOpenVar}) return null;`;
  content = content.replace(target, replacement);

  fs.writeFileSync(file, content);
  console.log("Patched " + file);
}

patchModal('src/components/AccountManagementModal.tsx', 'isAccountModalOpen');
patchModal('src/components/PaymentModal.tsx', 'isOpen');
patchModal('src/components/AppDetailModal.tsx', 'isOpen');
patchModal('src/components/SponsorModal.tsx', 'isOpen');
patchModal('src/components/NiruviBridgeModal.tsx', 'isOpen');
patchModal('src/components/JsonExportModal.tsx', 'isOpen');
patchModal('src/components/NiruviInfoModal.tsx', 'isOpen');

