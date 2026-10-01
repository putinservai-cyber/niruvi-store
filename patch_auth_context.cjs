const fs = require('fs');
let content = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');

// Add to AuthContextType
content = content.replace('  signInWithGoogle: () => Promise<void>;', '  signInWithGoogle: () => Promise<void>;\n  sandboxLogin: () => Promise<void>;');

// Add implementation before loginWithCredentials
const sandboxImpl = `  // Sandbox Login for Iframe Preview
  const sandboxLogin = async () => {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'developer@niruvi.store',
          displayName: 'Linux AppImage Craft',
          photoURL: 'https://api.dicebear.com/7.x/identicon/svg?seed=google_developer',
          uid: 'demo_developer_uid_12345'
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          setToken(data.token);
          sessionStorage.setItem('niruvi_auth_token', data.token);
          localStorage.setItem('niruvi_auth_token', data.token);
          setUser({
            ...data.user,
            plan: data.user.role === 'DEVELOPER' ? 'pro_developer' : 'free',
            isPro: data.user.role === 'DEVELOPER' || data.user.role === 'ADMIN',
          });
          setDeveloperProfile(data.developerProfile);
          setIsAuthModalOpen(false);
          return;
        }
      }
      throw new Error('Sandbox login failed.');
    } catch (err: any) {
      console.error('Sandbox login error:', err);
      throw err;
    }
  };

  // Login via credentials`;

content = content.replace('  // Login via credentials', sandboxImpl);

// Add to provider export
content = content.replace('        signInWithGoogle,', '        signInWithGoogle,\n        sandboxLogin,');

fs.writeFileSync('src/context/AuthContext.tsx', content);
console.log("AuthContext patched");
