const fs = require('fs');
let content = fs.readFileSync('src/components/AuthModal.tsx', 'utf8');

const useEffectImport = `import React, { useState, useEffect } from 'react';`;
content = content.replace(`import React, { useState } from 'react';`, useEffectImport);

const overflowEffect = `
  useEffect(() => {
    if (isAuthModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isAuthModalOpen]);

  if (!isAuthModalOpen) return null;
`;

content = content.replace(`  if (!isAuthModalOpen) return null;`, overflowEffect);

fs.writeFileSync('src/components/AuthModal.tsx', content);
console.log("AuthModal overflow patched");
