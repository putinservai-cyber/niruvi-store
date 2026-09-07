import { AppMetadata, Category } from '../types';

export const APPS_CATALOG: AppMetadata[] = [
  {
    id: 'vscodium',
    name: 'VSCodium',
    tagline: 'Telemetry-free, community-driven distribution of Microsoft VS Code',
    description: 'VSCodium provides binary releases of Microsoft’s Visual Studio Code built from the MIT-licensed vscode repository. It completely strips all proprietary telemetry, tracking, and proprietary license agreements, giving developers a privacy-respecting code editor with complete access to debugging, syntax highlighting, and extensions.',
    category: 'Development',
    version: '1.96.2',
    releaseDate: '2025-01-14',
    size: '104.2 MB',
    architectures: ['x86_64', 'aarch64'],
    license: 'MIT',
    licenseCategory: 'Permissive',
    publisher: {
      name: 'VSCodium Project',
      website: 'https://vscodium.com',
      verified: true,
      github: 'https://github.com/VSCodium/vscodium'
    },
    sha256: '9f8b4618e28f3b2591b65b6a782b1c2a129037cba8b99c75620be2f627a3c748',
    downloadUrl: 'https://github.com/VSCodium/vscodium/releases/download/1.96.2.25015/VSCodium-1.96.2.25015.glibc2.28-x86_64.AppImage',
    iconSlug: 'vscodium',
    brandColor: '#2F80ED',
    features: [
      'Zero telemetry, tracking, or background analytics',
      'Full TypeScript, JavaScript, Python, Rust, and Go support',
      'Open VSX Registry extension compatibility',
      'Integrated Git source control and multi-root terminal'
    ],
    homepageUrl: 'https://vscodium.com',
    sourceUrl: 'https://github.com/VSCodium/vscodium',
    tags: ['editor', 'ide', 'code', 'programming', 'typescript', 'python'],
    featured: true,
    downloadsCount: 142800,
    rating: 4.9,
    changelog: [
      'Updated upstream engine to VS Code 1.96.2',
      'Optimized ARM64 native builds for Linux devices',
      'Improved Secret Storage service on Wayland sessions'
    ],
    requirements: 'GLIBC >= 2.28, libfuse2 or libfuse3'
  },
  {
    id: 'blender',
    name: 'Blender',
    tagline: 'Professional 3D creation pipeline for modeling, rigging, and rendering',
    description: 'Blender is the world-renowned free and open source 3D pipeline suite. It covers modeling, sculpting, rigging, 3D animation, simulation, GPU raytraced rendering with Cycles, video editing, and 2D storyboard drawing with Grease Pencil.',
    category: 'Graphics & Design',
    version: '4.3.2',
    releaseDate: '2025-01-20',
    size: '312.8 MB',
    architectures: ['x86_64'],
    license: 'GPL-3.0',
    licenseCategory: 'Open Source',
    publisher: {
      name: 'Blender Foundation',
      website: 'https://www.blender.org',
      verified: true,
      github: 'https://github.com/blender/blender'
    },
    sha256: '4e375ab838531980ee9f57a3e811c7fae98f02969b8219c490ff7a1c1d01931a',
    downloadUrl: 'https://download.blender.org/release/Blender4.3/blender-4.3.2-linux-x64.AppImage',
    iconSlug: 'blender',
    brandColor: '#EA7600',
    features: [
      'Cycles GPU ray-tracing with OptiX, HIP, and Vulkan backends',
      'Advanced geometry node modeling systems',
      'Grease Pencil 2D illustration and storyboard suite',
      'Full Python 3 API for pipeline scripting and automation'
    ],
    homepageUrl: 'https://www.blender.org',
    sourceUrl: 'https://projects.blender.org/blender/blender',
    tags: ['3d', 'modeling', 'animation', 'rendering', 'cycles', 'vfx'],
    featured: true,
    downloadsCount: 289400,
    rating: 5.0,
    changelog: [
      'Cycles hardware acceleration enhancements for modern GPUs',
      'Significant Grease Pencil rewrite for high-density vectors',
      'Compositor node cache optimizations'
    ],
    requirements: 'OpenGL 4.3 capable GPU, 8GB RAM minimum'
  },
  {
    id: 'krita',
    name: 'Krita',
    tagline: 'Professional painting application made by artists for artists',
    description: 'Krita is a creative sketching and painting tool designed for concept artists, illustrators, matte and texture artists, and the VFX industry. It features over 100 professionally designed brushes, 9 brush engines, stabilizer support, and seamless wrap-around pattern creation.',
    category: 'Graphics & Design',
    version: '5.2.6',
    releaseDate: '2024-11-28',
    size: '228.4 MB',
    architectures: ['x86_64'],
    license: 'GPL-3.0',
    licenseCategory: 'Open Source',
    publisher: {
      name: 'Krita Foundation',
      website: 'https://krita.org',
      verified: true,
      github: 'https://invent.kde.org/graphics/krita'
    },
    sha256: 'a17bc698a27d6d3381a179eef39a67e9f3b55c2bfdc93952d7ee46d034220b39',
    downloadUrl: 'https://download.kde.org/stable/krita/5.2.6/krita-5.2.6-x86_64.appimage',
    iconSlug: 'krita',
    brandColor: '#3B82F6',
    features: [
      'Brush stabilizers for smooth inking curves',
      'Wrap-around tiling mode for game textures and patterns',
      'Full color management with ICC and HDR support',
      'Integrated frame-by-frame animation workspace with audio playback'
    ],
    homepageUrl: 'https://krita.org',
    sourceUrl: 'https://invent.kde.org/graphics/krita',
    tags: ['painting', 'drawing', 'illustration', 'raster', 'art', 'kde'],
    featured: true,
    downloadsCount: 97300,
    rating: 4.8,
    changelog: [
      'Audio sync improvements during frame-by-frame rendering',
      'Fixed stylus pressure curves on Wayland drawing tablets',
      'Reduced memory footprint on high resolution PSD imports'
    ],
    requirements: 'Graphics card with OpenGL 3.0 or higher'
  },
  {
    id: 'obs-studio',
    name: 'OBS Studio',
    tagline: 'High-performance video recording and live broadcasting software',
    description: 'OBS Studio is the gold standard for live streaming and offline screen recording on Linux. It provides low-latency capture via PipeWire and X11, multi-view production monitors, hardware-accelerated video encoding (NVENC, VA-API, QuickSync), and modular scene composition.',
    category: 'Audio & Video',
    version: '31.0.1',
    releaseDate: '2025-01-08',
    size: '188.0 MB',
    architectures: ['x86_64', 'aarch64'],
    license: 'GPL-2.0',
    licenseCategory: 'Open Source',
    publisher: {
      name: 'OBS Project',
      website: 'https://obsproject.com',
      verified: true,
      github: 'https://github.com/obsproject/obs-studio'
    },
    sha256: 'c3d9a11fa3571d796791c530bb1507f352136067727e4c30c806509f6f663d12',
    downloadUrl: 'https://github.com/obsproject/obs-studio/releases/download/31.0.1/OBS-Studio-31.0.1-Ubuntu-x86_64.AppImage',
    iconSlug: 'obs-studio',
    brandColor: '#475569',
    features: [
      'Real-time audio & video capture via PipeWire and V4L2',
      'Per-source audio filters including RNNoise noise suppression',
      'Hardware AV1, HEVC, and H.264 hardware encoders',
      'Native virtual camera for video conferencing'
    ],
    homepageUrl: 'https://obsproject.com',
    sourceUrl: 'https://github.com/obsproject/obs-studio',
    tags: ['streaming', 'screen-recorder', 'broadcast', 'twitch', 'youtube', 'pipewire'],
    featured: true,
    downloadsCount: 310500,
    rating: 4.9,
    changelog: [
      'Native Wayland desktop capture optimizations',
      'Enhanced NVENC AV1 encoding stability on Linux',
      'WebRTC output latency improvements'
    ],
    requirements: 'PipeWire or PulseAudio, OpenGL 3.3 compatible GPU'
  },
  {
    id: 'audacity',
    name: 'Audacity',
    tagline: 'Multi-track audio editor, recorder, and mastering utility',
    description: 'Audacity is an easy-to-use, multi-track audio workstation and editor for Linux. Record live sound from microphoned sources, edit and slice WAV/FLAC/MP3 clips, remove background noise with spectral editing, and process with real-time VST3 audio effects.',
    category: 'Audio & Video',
    version: '3.7.1',
    releaseDate: '2024-12-19',
    size: '89.5 MB',
    architectures: ['x86_64'],
    license: 'GPL-3.0',
    licenseCategory: 'Open Source',
    publisher: {
      name: 'Muse Group & Community',
      website: 'https://www.audacityteam.org',
      verified: true,
      github: 'https://github.com/audacity/audacity'
    },
    sha256: '72bcf932145b41059f81cb4378f447a11eb3422daeb2b0051e5927ad9a66718d',
    downloadUrl: 'https://github.com/audacity/audacity/releases/download/Audacity-3.7.1/audacity-linux-3.7.1-x64.AppImage',
    iconSlug: 'audacity',
    brandColor: '#2563EB',
    features: [
      'Non-destructive real-time effect chains',
      'High-precision spectral selection and frequency editing',
      'Support for 16-bit, 24-bit, and 32-bit floating point audio',
      'Extensive plugin ecosystem (VST, VST3, LV2, LADSPA)'
    ],
    homepageUrl: 'https://www.audacityteam.org',
    sourceUrl: 'https://github.com/audacity/audacity',
    tags: ['audio', 'sound', 'podcast', 'recording', 'music', 'vst'],
    featured: false,
    downloadsCount: 165000,
    rating: 4.7,
    changelog: [
      'Added non-destructive clip stretching without pitch shifting',
      'Optimized ALSA and JACK buffer low-latency handling',
      'Fixed FLAC tag export encoding'
    ],
    requirements: 'ALSA or PulseAudio sound driver'
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    tagline: 'Private, offline Markdown notebook and interconnected knowledge graph',
    description: 'Obsidian is a powerful knowledge base that sits on top of a local folder of plain text Markdown files. It features bi-directional note links, an interactive visual graph view of your thoughts, a visual canvas board, and over 1,500 community plugins.',
    category: 'Productivity',
    version: '1.7.7',
    releaseDate: '2024-12-10',
    size: '95.1 MB',
    architectures: ['x86_64', 'aarch64'],
    license: 'Proprietary (Free for Personal Use)',
    licenseCategory: 'Proprietary',
    publisher: {
      name: 'Dynalist Inc.',
      website: 'https://obsidian.md',
      verified: true
    },
    sha256: 'df3697e7aa3f01901a1c36082729969ca13c8f85cb1fbf9f6f6ef429ef956942',
    downloadUrl: 'https://github.com/obsidianmd/obsidian-releases/releases/download/v1.7.7/Obsidian-1.7.7.AppImage',
    iconSlug: 'obsidian',
    brandColor: '#7C3AED',
    features: [
      '100% local Markdown storage on your own disk',
      'Bi-directional links and interactive network graph visualization',
      'Endless extensibility with community themes and CSS snippets',
      'Canvas tool for infinite spatial note layout'
    ],
    homepageUrl: 'https://obsidian.md',
    tags: ['notes', 'markdown', 'knowledge-graph', 'pkm', 'zettelkasten'],
    featured: true,
    downloadsCount: 220100,
    rating: 4.9,
    changelog: [
      'Performance enhancements for large 10,000+ file vaults',
      'Canvas node multi-selection improvements',
      'Quick switcher fuzzy search speedups'
    ],
    requirements: 'Standard desktop Linux environment'
  },
  {
    id: 'keepassxc',
    name: 'KeePassXC',
    tagline: 'Offline, secure password manager with hardware key support',
    description: 'KeePassXC is a community fork of KeePassX aimed to extend and improve it with new features and bugfixes. Your database is encrypted using industry-standard AES-256 or ChaCha20 with Argon2 key derivation, stored purely offline on your own machine without remote servers.',
    category: 'Utilities',
    version: '2.7.9',
    releaseDate: '2024-06-25',
    size: '64.3 MB',
    architectures: ['x86_64', 'aarch64'],
    license: 'GPL-3.0',
    licenseCategory: 'Open Source',
    publisher: {
      name: 'KeePassXC Team',
      website: 'https://keepassxc.org',
      verified: true,
      github: 'https://github.com/keepassxreboot/keepassxc'
    },
    sha256: '55776d400196831d1ea3427fbf3a30364d9528f895d52cfcf2b557b77f1854bc',
    downloadUrl: 'https://github.com/keepassxreboot/keepassxc/releases/download/2.7.9/KeePassXC-2.7.9-x86_64.AppImage',
    iconSlug: 'keepassxc',
    brandColor: '#059669',
    features: [
      'End-to-end encrypted .kdbx database stored locally',
      'Native TOTP 2-Factor authentication generator',
      'Browser extension integration for Firefox and Chromium',
      'Hardware token support (YubiKey challenge-response)'
    ],
    homepageUrl: 'https://keepassxc.org',
    sourceUrl: 'https://github.com/keepassxreboot/keepassxc',
    tags: ['security', 'passwords', 'encryption', 'kdbx', '2fa', 'totp'],
    featured: true,
    downloadsCount: 118400,
    rating: 4.9,
    changelog: [
      'Passkey / WebAuthn credentials support',
      'Enhanced SSH agent integration for modern OpenSSH keys',
      'Improved auto-type compatibility on Wayland'
    ],
    requirements: 'FUSE 2 or 3, libxcb'
  },
  {
    id: 'bruno',
    name: 'Bruno',
    tagline: 'Git-friendly, fast open-source REST & GraphQL API client',
    description: 'Bruno is an offline-first API exploration tool that stores API request collections in your filesystem as plain-text files using the Bru markup language. Teams can check collections directly into Git repositories and collaborate seamlessly without cloud accounts or fees.',
    category: 'Development',
    version: '1.38.1',
    releaseDate: '2025-01-18',
    size: '88.7 MB',
    architectures: ['x86_64'],
    license: 'MIT',
    licenseCategory: 'Permissive',
    publisher: {
      name: 'UseBruno Inc.',
      website: 'https://www.usebruno.com',
      verified: true,
      github: 'https://github.com/usebruno/bruno'
    },
    sha256: 'bc94821a8cd36e5f1b1c31911910da1268305f8eb0848ea38027727d14d2e5b8',
    downloadUrl: 'https://github.com/usebruno/bruno/releases/download/v1.38.1/bruno_1.38.1_x86_64_linux.AppImage',
    iconSlug: 'bruno',
    brandColor: '#D97706',
    features: [
      'Zero cloud sync: your API collections live in your own Git repository',
      'Bru declarative plain-text collection format',
      'Automated script testing with chai assertions',
      'Environment variables and secret protection'
    ],
    homepageUrl: 'https://www.usebruno.com',
    sourceUrl: 'https://github.com/usebruno/bruno',
    tags: ['api', 'rest', 'graphql', 'git', 'developer-tools'],
    featured: false,
    downloadsCount: 84300,
    rating: 4.8,
    changelog: [
      'Added automated OAuth 2.0 PKCE flow support',
      'CLI runner test reporting enhancements',
      'Fixed multi-part file upload memory buffers'
    ],
    requirements: 'Standard desktop Linux distribution'
  },
  {
    id: 'vlc',
    name: 'VLC Media Player',
    tagline: 'Universal multimedia player and streaming framework',
    description: 'VLC is a versatile, free, and open-source media player that plays virtually any video and audio file format without external codec packs. It plays DVDs, Blu-rays, audio CDs, network streams, and includes hardware video decoding.',
    category: 'Audio & Video',
    version: '3.0.21',
    releaseDate: '2024-09-04',
    size: '79.2 MB',
    architectures: ['x86_64'],
    license: 'GPL-2.0',
    licenseCategory: 'Open Source',
    publisher: {
      name: 'VideoLAN Organization',
      website: 'https://www.videolan.org',
      verified: true,
      github: 'https://code.videolan.org/videolan/vlc'
    },
    sha256: '7b830d97fe564177b8120ec2c32cf97686520bcf2e896fa2c92138ad1776ceee',
    downloadUrl: 'https://get.videolan.org/vlc/3.0.21/vlc-3.0.21-x86_64.AppImage',
    iconSlug: 'vlc',
    brandColor: '#EA580C',
    features: [
      'Plays all video formats: MKV, MP4, AVI, WebM, Ogg, FLV',
      'Hardware decoding acceleration on modern GPUs',
      'Subtitle auto-synchronization and online downloaders',
      'Network stream playback (RTSP, HLS, UDP)'
    ],
    homepageUrl: 'https://www.videolan.org/vlc/',
    sourceUrl: 'https://code.videolan.org/videolan/vlc',
    tags: ['video', 'media', 'player', 'audio', 'streaming', 'codecs'],
    featured: false,
    downloadsCount: 420000,
    rating: 4.8,
    changelog: [
      'Security patches across demuxers and decoders',
      'PipeWire audio sink stability fixes',
      'Updated TTML subtitle rendering'
    ],
    requirements: 'ALSA, PulseAudio, or PipeWire'
  },
  {
    id: 'inkscape',
    name: 'Inkscape',
    tagline: 'Vector graphics editor with native SVG format support',
    description: 'Inkscape is a professional vector graphics program for Linux. Used by graphic designers and illustrators worldwide for logos, web mockups, typography, diagramming, and laser cutting vector paths.',
    category: 'Graphics & Design',
    version: '1.4.0',
    releaseDate: '2024-10-15',
    size: '175.4 MB',
    architectures: ['x86_64'],
    license: 'GPL-3.0',
    licenseCategory: 'Open Source',
    publisher: {
      name: 'Inkscape Authors',
      website: 'https://inkscape.org',
      verified: true,
      github: 'https://gitlab.com/inkscape/inkscape'
    },
    sha256: 'e5cf09559c55b6ef12ea1ef9bebc7cb988a8f15858062cfba97e974e83769c84',
    downloadUrl: 'https://media.inkscape.org/dl/resources/file/Inkscape-1.4.0-x86_64.AppImage',
    iconSlug: 'inkscape',
    brandColor: '#0284C7',
    features: [
      'Native W3C SVG file format compliance',
      'Bezier curves, spiro splines, and boolean path operations',
      'New Shape Builder tool for quick geometry composition',
      'Comprehensive export formats: PDF, EPS, PNG, DXF'
    ],
    homepageUrl: 'https://inkscape.org',
    sourceUrl: 'https://gitlab.com/inkscape/inkscape',
    tags: ['vector', 'svg', 'graphics', 'illustration', 'design', 'drawing'],
    featured: false,
    downloadsCount: 154000,
    rating: 4.7,
    changelog: [
      'Brand new Filter Gallery browser',
      'Shape Builder tool addition',
      'Modular snapping system updates'
    ],
    requirements: 'GTK3 runtime, FUSE support'
  },
  {
    id: 'freecad',
    name: 'FreeCAD',
    tagline: 'Parametric 3D CAD modeler for mechanical engineering',
    description: 'FreeCAD is a general-purpose parametric 3D modeler. Parametric modeling allows you to modify your design by editing dimensions in the history tree. Ideal for mechanical engineering, 3D printing preparation, and architectural BIM modeling.',
    category: 'Graphics & Design',
    version: '1.0.0',
    releaseDate: '2024-11-18',
    size: '420.0 MB',
    architectures: ['x86_64', 'aarch64'],
    license: 'LGPL-2.1',
    licenseCategory: 'Open Source',
    publisher: {
      name: 'FreeCAD Community',
      website: 'https://www.freecad.org',
      verified: true,
      github: 'https://github.com/FreeCAD/FreeCAD'
    },
    sha256: '9981881b29a67a6d81997d8c0b561c142ec4cfb31525287fcebf88a6d65377f0',
    downloadUrl: 'https://github.com/FreeCAD/FreeCAD/releases/download/1.0.0/FreeCAD_1.0.0-conda-Linux-x86_64-py311.AppImage',
    iconSlug: 'freecad',
    brandColor: '#DC2626',
    features: [
      'Parametric constraint sketcher and solid modeling',
      'Integrated Toponaming solution in 1.0 release',
      'Native assembly workbench with motion constraints',
      'Direct mesh generation for 3D printing (STL, OBJ)'
    ],
    homepageUrl: 'https://www.freecad.org',
    sourceUrl: 'https://github.com/FreeCAD/FreeCAD',
    tags: ['cad', '3d-printing', 'engineering', 'parametric', 'mesh', 'cax'],
    featured: false,
    downloadsCount: 89000,
    rating: 4.8,
    changelog: [
      'Milestone 1.0 release addressing topological naming issues',
      'Unified modern dark theme styling',
      'Integrated official Assembly workbench'
    ],
    requirements: 'OpenGL 3.0+ graphics, 4GB RAM minimum'
  },
  {
    id: 'supertuxkart',
    name: 'SuperTuxKart',
    tagline: '3D arcade kart racer starring Tux, Beastie, and friends',
    description: 'SuperTuxKart is a 3D open-source arcade racing game featuring mascot characters of various free software projects. Race through tracks against AI or friends in local split-screen or networked multiplayer battle arenas.',
    category: 'Games',
    version: '1.4.0',
    releaseDate: '2023-11-01',
    size: '640.2 MB',
    architectures: ['x86_64'],
    license: 'GPL-3.0',
    licenseCategory: 'Open Source',
    publisher: {
      name: 'SuperTuxKart Team',
      website: 'https://supertuxkart.net',
      verified: true,
      github: 'https://github.com/supertuxkart/stk-code'
    },
    sha256: '61a7a0301a2f6ca46e919ff72ca4cba799307779b9ba1b42602161f3eb129759',
    downloadUrl: 'https://github.com/supertuxkart/stk-code/releases/download/v1.4/SuperTuxKart-1.4-linux-x86_64.AppImage',
    iconSlug: 'supertuxkart',
    brandColor: '#10B981',
    features: [
      'Over 20 story tracks and multiplayer battle arenas',
      'Networked online multiplayer and local split-screen',
      'Full game controller and steering wheel compatibility',
      'Custom addon manager to download user-made tracks'
    ],
    homepageUrl: 'https://supertuxkart.net',
    sourceUrl: 'https://github.com/supertuxkart/stk-code',
    tags: ['game', 'racing', 'arcade', 'multiplayer', 'tux', 'kart'],
    featured: false,
    downloadsCount: 76000,
    rating: 4.6,
    changelog: [
      'Antarctica 3D engine physics optimizations',
      'Updated track visual assets and textures',
      'Gamepad force feedback enhancements'
    ],
    requirements: 'Hardware 3D accelerator with OpenGL 3.1+'
  }
];

export const CATEGORIES: Category[] = [
  'All',
  'Development',
  'Graphics & Design',
  'Audio & Video',
  'Productivity',
  'Utilities',
  'Games'
];

/**
 * Generates the official Niruvi desktop application protocol link
 * Format: niruvi://install?id=<id>&name=<name>&url=<encoded_url>&sha256=<sha256>&version=<version>
 */
export function generateNiruviProtocolUrl(app: AppMetadata): string {
  const params = new URLSearchParams({
    id: app.id,
    name: app.name,
    version: app.version,
    url: app.downloadUrl,
    sha256: app.sha256,
    arch: app.architectures.join(','),
    icon: app.iconSlug
  });
  return `niruvi://install?${params.toString()}`;
}
