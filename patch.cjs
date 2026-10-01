const fs = require('fs');
let content = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');

const lines = content.split('\n');
const before = lines.slice(0, 221);
const after = lines.slice(259);

const replace = `    } catch (err: any) {
      console.error('Google Auth Error:', err);
      
      if (err.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in popup was closed before completing. Please try again.');
      }
      
      if (window.self !== window.top) {
        throw new Error('Google Sign-In may be blocked inside the preview iframe. Please open the app in a new tab using the arrow icon at the top right.');
      }

      throw new Error(err.message || 'Google authentication failed.');
    }`;

fs.writeFileSync('src/context/AuthContext.tsx', before.join('\n') + '\n' + replace + '\n' + after.join('\n'));
console.log("Patched successfully via lines");
