const fs = require('fs');
const path = require('path');

const apps = [
  // Terminals
  { id: 'warp', name: 'Warp', tagline: 'The terminal for the 21st century', category: 'Development', developer: 'Warpdotdev', repository: 'https://github.com/warpdotdev/warp' },
  { id: 'ghostty', name: 'Ghostty', tagline: 'Fast, native, feature-rich terminal emulator', category: 'Development', developer: 'Ghostty Org', repository: 'https://github.com/ghostty-org/ghostty' },
  { id: 'wave-terminal', name: 'Wave Terminal', tagline: 'Open-source, cross-platform terminal for seamless workflows', category: 'Development', developer: 'WaveTerm', repository: 'https://github.com/wavetermdev/waveterm' },
  { id: 'tabby', name: 'Tabby', tagline: 'A terminal for a more modern age', category: 'Development', developer: 'Eugeny', repository: 'https://github.com/Eugeny/tabby' },
  { id: 'rio', name: 'Rio', tagline: 'A hardware-accelerated GPU terminal emulator', category: 'Development', developer: 'Raphael Amorim', repository: 'https://github.com/raphamorim/rio' },
  { id: 'wezterm', name: 'WezTerm', tagline: 'A GPU-accelerated cross-platform terminal emulator', category: 'Development', developer: 'Wez Furlong', repository: 'https://github.com/wezterm/wezterm' },
  { id: 'alacritty', name: 'Alacritty', tagline: 'A cross-platform, OpenGL terminal emulator', category: 'Development', developer: 'Alacritty', repository: 'https://github.com/alacritty/alacritty' },
  { id: 'kitty', name: 'Kitty', tagline: 'Cross-platform, fast, feature-rich, GPU based terminal', category: 'Development', developer: 'Kovid Goyal', repository: 'https://github.com/kovidgoyal/kitty' },
  { id: 'hyper', name: 'Hyper', tagline: 'A terminal built on web technologies', category: 'Development', developer: 'Vercel', repository: 'https://github.com/vercel/hyper' },
  { id: 'black-box', name: 'Black Box', tagline: 'A beautiful GTK 4 terminal', category: 'Development', developer: 'Raggesilver', repository: 'https://gitlab.gnome.org/raggesilver/blackbox' },
  
  // Browsers
  { id: 'brave', name: 'Brave', tagline: 'Secure, fast & private web browser', category: 'Browser', developer: 'Brave Software', repository: 'https://github.com/brave/brave-browser' },
  { id: 'vivaldi', name: 'Vivaldi', tagline: 'A powerful, personal and private web browser', category: 'Browser', developer: 'Vivaldi Technologies', repository: 'https://github.com/varjolintu/vivaldi' },
  { id: 'librewolf', name: 'LibreWolf', tagline: 'A custom version of Firefox, focused on privacy, security and freedom', category: 'Browser', developer: 'LibreWolf', repository: 'https://github.com/librewolf/browser' },
  { id: 'zen-browser', name: 'Zen Browser', tagline: 'Experience tranquility while browsing the web', category: 'Browser', developer: 'Zen Browser', repository: 'https://github.com/zen-browser/desktop' },
  { id: 'floorp', name: 'Floorp', tagline: 'A fast and privacy-focused Firefox-based browser', category: 'Browser', developer: 'Floorp Projects', repository: 'https://github.com/Floorp-Projects/Floorp' },
  { id: 'mullvad-browser', name: 'Mullvad Browser', tagline: 'Privacy-focused browser by Mullvad VPN and Tor Project', category: 'Browser', developer: 'Mullvad', repository: 'https://github.com/mullvad/mullvad-browser' },
  { id: 'falkon', name: 'Falkon', tagline: 'KDE web browser', category: 'Browser', developer: 'KDE', repository: 'https://github.com/KDE/falkon' },
  { id: 'qutebrowser', name: 'qutebrowser', tagline: 'A keyboard-driven, vim-like browser based on PyQt5', category: 'Browser', developer: 'qutebrowser', repository: 'https://github.com/qutebrowser/qutebrowser' },
  { id: 'thorium', name: 'Thorium', tagline: 'Compiler-optimized Chromium fork for maximum performance', category: 'Browser', developer: 'Alex313031', repository: 'https://github.com/Alex313031/Thorium' },
  { id: 'ungoogled-chromium', name: 'Ungoogled Chromium', tagline: 'Google Chromium, sans integration with Google', category: 'Browser', developer: 'Ungoogled Software', repository: 'https://github.com/ungoogled-software/ungoogled-chromium' },
  { id: 'ladybird', name: 'Ladybird', tagline: 'A truly independent web browser', category: 'Browser', developer: 'LadybirdBrowser', repository: 'https://github.com/LadybirdBrowser/ladybird' },
  { id: 'nyxt', name: 'Nyxt', tagline: 'The hacker\'s power-browser', category: 'Browser', developer: 'Atlas Engineer', repository: 'https://github.com/atlas-engineer/nyxt' },
  { id: 'epiphany', name: 'Epiphany', tagline: 'GNOME Web Browser', category: 'Browser', developer: 'GNOME', repository: 'https://gitlab.gnome.org/GNOME/epiphany' },

  // Dev Tools / AI / Misc
  { id: 'github-copilot', name: 'GitHub Copilot', tagline: 'Your AI pair programmer', category: 'AI', developer: 'GitHub', repository: 'https://github.com/features/ai/github-app' },
  { id: 'github-desktop', name: 'GitHub Desktop', tagline: 'Simple collaboration from your desktop', category: 'Development', developer: 'GitHub', repository: 'https://github.com/desktop/desktop' },
  { id: 'vscode', name: 'Visual Studio Code', tagline: 'Code editing. Redefined.', category: 'Development', developer: 'Microsoft', repository: 'https://github.com/microsoft/vscode' },
  { id: 'microsoft-edge', name: 'Microsoft Edge', tagline: 'World-class performance with more privacy', category: 'Browser', developer: 'Microsoft', repository: 'https://github.com/MicrosoftEdge/DevTools' },
  { id: 'google-antigravity', name: 'Google Antigravity', tagline: 'Advanced reasoning and AI coding agent', category: 'AI', developer: 'Google', repository: 'https://antigravity.google/' },
  { id: 'google-chrome', name: 'Google Chrome', tagline: 'A fast, secure, and free web browser', category: 'Browser', developer: 'Google', repository: 'https://chromium.googlesource.com/chromium/src' },
  { id: 'gemini-cli', name: 'Google Gemini CLI', tagline: 'Command-line interface for Google Gemini API', category: 'AI', developer: 'Google', repository: 'https://github.com/google-gemini/gemini-cli' },
  { id: 'openai-codex', name: 'OpenAI Codex', tagline: 'AI system that translates natural language to code', category: 'AI', developer: 'OpenAI', repository: 'https://github.com/openai/codex' },
  { id: 'claude-code', name: 'Anthropic Claude Code', tagline: 'Next-generation AI coding assistant', category: 'AI', developer: 'Anthropic', repository: 'https://github.com/anthropics/claude-code' },
  { id: 'docker-desktop', name: 'Docker Desktop', tagline: 'Securely build, share and run any application, anywhere', category: 'Development', developer: 'Docker', repository: 'https://github.com/docker/for-win' },
  { id: 'docker', name: 'Docker', tagline: 'Accelerate how you build, share, and run applications', category: 'Development', developer: 'Docker', repository: 'https://github.com/docker/docker' },
  { id: 'jetbrains-toolbox', name: 'JetBrains Toolbox', tagline: 'A control panel for your tools and projects', category: 'Development', developer: 'JetBrains', repository: 'https://github.com/JetBrains/toolbox' },
  { id: 'jetbrains-fleet', name: 'JetBrains Fleet', tagline: 'Next-generation IDE by JetBrains', category: 'Development', developer: 'JetBrains', repository: 'https://github.com/JetBrains' },
  { id: 'virtualbox', name: 'Oracle VirtualBox', tagline: 'Powerful x86 and AMD64/Intel64 virtualization product', category: 'Development', developer: 'Oracle', repository: 'https://github.com/virtualbox-org/virtualbox' },
  { id: 'cuda-samples', name: 'NVIDIA CUDA Samples', tagline: 'Samples for CUDA Developers', category: 'Development', developer: 'NVIDIA', repository: 'https://github.com/NVIDIA/cuda-samples' }
];

apps.forEach(app => {
  const data = {
    id: app.id,
    name: app.name,
    tagline: app.tagline,
    description: app.tagline,
    category: app.category,
    version: '1.0.0',
    releaseDate: '2026-09-07',
    size: '100 MB',
    architectures: ['x86_64'],
    license: 'MIT',
    licenseCategory: 'Open Source',
    developer: app.developer,
    homepage: app.repository,
    repository: app.repository,
    sourceType: 'Official',
    trustTier: 'Official Developer',
    download: {
      x86_64: `https://example.com/download/${app.id}.AppImage`
    },
    brandColor: '#4F46E5',
    keywords: [app.category.toLowerCase(), 'appimage'],
    featured: false,
    formats: ['AppImage']
  };
  
  fs.writeFileSync(
    path.join(__dirname, `catalog/apps/${app.id}.json`), 
    JSON.stringify(data, null, 2)
  );
});

console.log(`Updated ${apps.length} applications in catalog.`);
