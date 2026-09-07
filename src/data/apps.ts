import { AppMetadata, Category } from '../types';

export const APPS_CATALOG: AppMetadata[] = [
  {
    id: 'vscodium',
    name: 'VSCodium',
    tagline: 'Free/Libre Open Source Software binaries of VS Code',
    description: 'VSCodium is a community-driven, freely-licensed binary distribution of Microsoft’s editor VS Code. It is built from the vscode repository with telemetry, tracking, and proprietary licenses completely removed, giving you full control over your privacy while retaining access to rich language support, extensions, and integrated terminal workflows.',
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
    iconName: 'Code2',
    iconBg: 'from-blue-600 to-indigo-600',
    screenshots: [
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80'
    ],
    homepageUrl: 'https://vscodium.com',
    sourceUrl: 'https://github.com/VSCodium/vscodium',
    tags: ['editor', 'ide', 'code', 'programming', 'typescript', 'python'],
    featured: true,
    downloadsCount: 142800,
    rating: 4.9,
    changelog: [
      'Updated to VS Code 1.96.2 engine',
      'Enhanced ARM64 native builds',
      'Fix for keyring integration in Wayland sessions'
    ],
    requirements: 'GLIBC >= 2.28, system fuse2 or libfuse3'
  },
  {
    id: 'blender',
    name: 'Blender',
    tagline: 'Free and open 3D creation pipeline suite',
    description: 'Blender is the free and open source 3D creation suite. It supports the entirety of the 3D pipeline—modeling, rigging, animation, simulation, rendering, compositing, motion tracking, video editing, and 2D animation pipeline with Grease Pencil. Widely adopted by professionals, indie animators, and game studios worldwide.',
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
    iconName: 'Shapes',
    iconBg: 'from-amber-500 to-orange-600',
    screenshots: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1633493106115-f2679237ec94?auto=format&fit=crop&w=1200&q=80'
    ],
    homepageUrl: 'https://www.blender.org',
    sourceUrl: 'https://projects.blender.org/blender/blender',
    tags: ['3d', 'modeling', 'animation', 'rendering', 'cycles', 'vfx'],
    featured: true,
    downloadsCount: 289400,
    rating: 5.0,
    changelog: [
      'Cycles hardware raytracing updates for newer GPUs',
      'Grease Pencil v3 performance improvements',
      'Enhanced node system and compositing speed'
    ],
    requirements: 'OpenGL 4.3 capable GPU, 8GB RAM minimum'
  },
  {
    id: 'krita',
    name: 'Krita',
    tagline: 'Professional digital painting and 2D illustration program',
    description: 'Krita is a professional, free, and open-source painting program made by artists that want to see affordable art tools for everyone. It offers concept art, illustration, comics, matte painting, textures, and VFX support with top-tier brush stabilizers, color management, and wrap-around mode.',
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
    iconName: 'Palette',
    iconBg: 'from-pink-500 to-rose-600',
    screenshots: [
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80'
    ],
    homepageUrl: 'https://krita.org',
    sourceUrl: 'https://invent.kde.org/graphics/krita',
    tags: ['painting', 'drawing', 'illustration', 'raster', 'art', 'kde'],
    featured: false,
    downloadsCount: 97300,
    rating: 4.8,
    changelog: [
      'Fixed audio playback issues in animation workspace',
      'Improved tablet stylus pressure curve responsiveness',
      'Optimized memory usage for multi-layer canvases'
    ]
  },
  {
    id: 'obs-studio',
    name: 'OBS Studio',
    tagline: 'Free and open source software for video recording and live streaming',
    description: 'OBS Studio is an industry standard for video capture, compositing, encoding, and streaming. Equipped with powerful real-time audio/video mixing, unlimited scenes, intuitive audio mixer with per-source filters (noise gate, suppression, gain), and support for Twitch, YouTube, Kick, and custom RTMP endpoints.',
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
    iconName: 'Video',
    iconBg: 'from-zinc-700 to-slate-900',
    screenshots: [
      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80'
    ],
    homepageUrl: 'https://obsproject.com',
    sourceUrl: 'https://github.com/obsproject/obs-studio',
    tags: ['streaming', 'screen-recorder', 'broadcast', 'twitch', 'youtube', 'pipewire'],
    featured: true,
    downloadsCount: 310500,
    rating: 4.9,
    changelog: [
      'Wayland and PipeWire capture stabilization',
      'NVENC and VA-API AV1 hardware encoding enhancements',
      'New WebSocket 5.x remote control controls'
    ]
  },
  {
    id: 'audacity',
    name: 'Audacity',
    tagline: 'Easy-to-use, multi-track audio editor and recorder',
    description: 'Audacity is the world’s most popular multi-track audio editor and recorder for Linux and other operating systems. Record live audio, import/export sound files, edit with cut/copy/paste, adjust tempo, and apply high-end studio effects including pitch correction, noise reduction, and VST3 plugins.',
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
    iconName: 'AudioWaveform',
    iconBg: 'from-blue-500 to-cyan-600',
    screenshots: [
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80'
    ],
    homepageUrl: 'https://www.audacityteam.org',
    sourceUrl: 'https://github.com/audacity/audacity',
    tags: ['audio', 'sound', 'podcast', 'recording', 'music', 'vst'],
    featured: false,
    downloadsCount: 165000,
    rating: 4.7,
    changelog: [
      'Non-destructive clip effects pipeline',
      'Upgraded master effects chain',
      'Improved Jack and ALSA audio latency'
    ]
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    tagline: 'Sharpen your thinking with private, extensible Markdown notes',
    description: 'Obsidian is a powerful knowledge base that works on local plain-text Markdown files. It lets you create connections between your thoughts using bi-directional links, interactive graph views, canvas brainstorm spaces, and thousands of community plugins, with complete offline security.',
    category: 'Productivity',
    version: '1.7.7',
    releaseDate: '2024-12-10',
    size: '95.1 MB',
    architectures: ['x86_64', 'aarch64'],
    license: 'Proprietary (Personal Free)',
    licenseCategory: 'Proprietary',
    publisher: {
      name: 'Dynalist Inc.',
      website: 'https://obsidian.md',
      verified: true
    },
    sha256: 'df3697e7aa3f01901a1c36082729969ca13c8f85cb1fbf9f6f6ef429ef956942',
    downloadUrl: 'https://github.com/obsidianmd/obsidian-releases/releases/download/v1.7.7/Obsidian-1.7.7.AppImage',
    iconName: 'BookOpen',
    iconBg: 'from-purple-600 to-violet-800',
    screenshots: [
      'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=1200&q=80'
    ],
    homepageUrl: 'https://obsidian.md',
    tags: ['notes', 'markdown', 'knowledge-graph', 'pkm', 'zettelkasten'],
    featured: true,
    downloadsCount: 220100,
    rating: 4.9,
    changelog: [
      'Markdown live preview rendering performance enhancements',
      'Canvas cards multi-select and export additions',
      'Dynamic search operators and bookmark folders'
    ]
  },
  {
    id: 'keepassxc',
    name: 'KeePassXC',
    tagline: 'Secure, modern cross-platform community password manager',
    description: 'KeePassXC is an offline password manager that securely stores passwords, credentials, keys, and 2FA TOTP tokens in an encrypted SQLite-like .kdbx file using AES-256 and Argon2. Includes browser integration with Firefox, Chrome, and Brave, auto-type, and SSH agent synchronization.',
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
    iconName: 'ShieldCheck',
    iconBg: 'from-emerald-600 to-teal-700',
    screenshots: [
      'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80'
    ],
    homepageUrl: 'https://keepassxc.org',
    sourceUrl: 'https://github.com/keepassxreboot/keepassxc',
    tags: ['security', 'passwords', 'encryption', 'kdbx', '2fa', 'totp'],
    featured: true,
    downloadsCount: 118400,
    rating: 4.9,
    changelog: [
      'Passkey / WebAuthn credentials support',
      'Hardware token (YubiKey) compatibility improvements',
      'Security audit patches for KeePassHTTP protocol deprecation'
    ]
  },
  {
    id: 'bruno',
    name: 'Bruno',
    tagline: 'Fast and Git-friendly open-source API client',
    description: 'Bruno is an innovative API client revolutionizing how developer teams test and collaborate on REST and GraphQL APIs. It stores collections directly in your filesystem folder as plain Bru files, allowing complete version control via Git without vendor cloud lock-in.',
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
    iconName: 'Layers',
    iconBg: 'from-amber-600 to-yellow-600',
    screenshots: [
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80'
    ],
    homepageUrl: 'https://www.usebruno.com',
    sourceUrl: 'https://github.com/usebruno/bruno',
    tags: ['api', 'rest', 'graphql', 'git', 'postman-alternative', 'developer-tools'],
    featured: false,
    downloadsCount: 84300,
    rating: 4.8,
    changelog: [
      'Automated OAuth2 token refresh support',
      'Multi-environment variables secret manager',
      'Bru CLI test runner output enhancements'
    ]
  },
  {
    id: 'vlc',
    name: 'VLC Media Player',
    tagline: 'The ultimate universal multimedia player and framework',
    description: 'VLC is a free and open source cross-platform multimedia player that plays most multimedia files as well as DVDs, Audio CDs, VCDs, and various streaming protocols. It features built-in hardware acceleration, zero codec pack requirements, and zero spyware.',
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
    iconName: 'PlayCircle',
    iconBg: 'from-orange-500 to-amber-600',
    screenshots: [
      'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=1200&q=80'
    ],
    homepageUrl: 'https://www.videolan.org/vlc/',
    sourceUrl: 'https://code.videolan.org/videolan/vlc',
    tags: ['video', 'media', 'player', 'audio', 'streaming', 'codecs'],
    featured: false,
    downloadsCount: 420000,
    rating: 4.8,
    changelog: [
      'Security fixes in demuxers and codecs',
      'Audio output fixes on modern Pipewire systems',
      'Improved subtitle text rendering'
    ]
  },
  {
    id: 'inkscape',
    name: 'Inkscape',
    tagline: 'Professional vector graphics editor for SVG illustration',
    description: 'Whether you are an illustrator, designer, web designer or just someone who needs to create vector imagery, Inkscape is for you! Flexible drawing tools, broad file format compatibility (SVG, EPS, PDF), powerful text tool, and bezier curves with Bezier envelope deformation.',
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
    iconName: 'PenTool',
    iconBg: 'from-slate-700 to-indigo-900',
    screenshots: [
      'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=1200&q=80'
    ],
    homepageUrl: 'https://inkscape.org',
    sourceUrl: 'https://gitlab.com/inkscape/inkscape',
    tags: ['vector', 'svg', 'graphics', 'illustration', 'design', 'drawing'],
    featured: false,
    downloadsCount: 154000,
    rating: 4.7,
    changelog: [
      'Filter Gallery dialog rewrite',
      'New Shape Builder tool for rapid geometric combining',
      'Modular grid snapping enhancements'
    ]
  },
  {
    id: 'freecad',
    name: 'FreeCAD',
    tagline: 'Parametric 3D modeler for CAD, MCAD, CAx, and CAE',
    description: 'FreeCAD is an open-source parametric 3D modeler made primarily to design real-life objects of any size. Parametric modeling allows you to easily modify your design by going back into your model history and changing its parameters.',
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
    iconName: 'Box',
    iconBg: 'from-red-600 to-rose-700',
    screenshots: [
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80'
    ],
    homepageUrl: 'https://www.freecad.org',
    sourceUrl: 'https://github.com/FreeCAD/FreeCAD',
    tags: ['cad', '3d-printing', 'engineering', 'parametric', 'mesh', 'cax'],
    featured: false,
    downloadsCount: 89000,
    rating: 4.8,
    changelog: [
      'Landmark 1.0 release with integrated Toponaming solution',
      'Unified modern default dark and light theme',
      'New integrated Assembly workbench'
    ]
  },
  {
    id: 'supertuxkart',
    name: 'SuperTuxKart',
    tagline: '3D open-source arcade kart racing game',
    description: 'SuperTuxKart is a 3D open-source arcade kart racer with a variety of characters, tracks, and modes to play. Race against the clock or your friends in local split-screen or networked multiplayer with Tux, Beastie, and friends.',
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
    iconName: 'Gamepad2',
    iconBg: 'from-emerald-500 to-green-700',
    screenshots: [
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80'
    ],
    homepageUrl: 'https://supertuxkart.net',
    sourceUrl: 'https://github.com/supertuxkart/stk-code',
    tags: ['game', 'racing', 'arcade', 'multiplayer', 'tux', 'kart'],
    featured: false,
    downloadsCount: 76000,
    rating: 4.6,
    changelog: [
      'Antarctica rendering engine performance improvements',
      'Updated soccer field and bonus tracks',
      'Controller force feedback updates'
    ]
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
    icon: app.name.toLowerCase()
  });
  return `niruvi://install?${params.toString()}`;
}
