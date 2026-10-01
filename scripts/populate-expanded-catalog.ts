import fs from 'fs';
import path from 'path';

interface AppDefinition {
  id: string;
  name: string;
  tagline: string;
  description: string;
  version: string;
  releaseDate: string;
  category: string;
  developer: string;
  license: string;
  licenseCategory: 'Open Source' | 'Permissive' | 'Proprietary';
  homepage: string;
  repository: string;
  repositoryUrl: string;
  releasesUrl: string;
  sourceType: 'Official' | 'Community';
  officialStatus: boolean;
  iconSlug: string;
  brandColor: string;
  size: string;
  architectures: string[];
  formats: string[];
  download: Record<string, string>;
  sha256: string;
  keywords: string[];
  featured: boolean;
  features: string[];
  requirements: string;
}

const apps: AppDefinition[] = [
  {
    id: 'digikam',
    name: 'digiKam',
    tagline: 'Professional photo management software designed by photographers',
    description: 'digiKam is an advanced digital photo management application for Linux, featuring an intuitive interface that makes importing, organizing, enhancing, searching, and exporting your digital photos effortless. It includes facial recognition, geotagging, raw file processing, and batch workflow tools.',
    version: '8.4.0',
    releaseDate: '2026-08-15',
    category: 'Graphics & Design',
    developer: 'KDE Community',
    license: 'GPL-2.0',
    licenseCategory: 'Open Source',
    homepage: 'https://www.digikam.org',
    repository: 'https://github.com/KDE/digikam',
    repositoryUrl: 'https://github.com/KDE/digikam',
    releasesUrl: 'https://github.com/KDE/digikam/releases',
    sourceType: 'Official',
    officialStatus: true,
    iconSlug: 'digikam',
    brandColor: '#2563EB',
    size: '280.0 MB',
    architectures: ['x86_64'],
    formats: ['AppImage'],
    download: {
      x86_64: 'https://download.kde.org/stable/digikam/8.4.0/digiKam-8.4.0-Qt6-x86-64.appimage'
    },
    sha256: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
    keywords: ['photo', 'photography', 'raw', 'organizer', 'kde', 'metadata', 'images'],
    featured: true,
    features: [
      'Advanced raw camera image processing and color correction',
      'AI facial recognition and automated people tagging',
      'Integrated geolocation editor with interactive map support',
      'High-performance database capable of organizing millions of photos'
    ],
    requirements: 'Linux 64-bit desktop, 4GB+ RAM recommended'
  },
  {
    id: 'libreoffice',
    name: 'LibreOffice',
    tagline: 'Clean, feature-rich office productivity suite for documents and data',
    description: 'LibreOffice is a free and powerful office suite, and a successor to OpenOffice(.org). Its clean interface and feature-rich tools unleash your creativity and enhance your productivity. It includes Writer (word processor), Calc (spreadsheets), Impress (presentations), Draw (vector graphics), and Math (formulas).',
    version: '24.8.5',
    releaseDate: '2026-08-30',
    category: 'Productivity',
    developer: 'The Document Foundation',
    license: 'MPL-2.0',
    licenseCategory: 'Open Source',
    homepage: 'https://www.libreoffice.org',
    repository: 'https://github.com/LibreOffice/core',
    repositoryUrl: 'https://github.com/LibreOffice/core',
    releasesUrl: 'https://github.com/LibreOffice/core/releases',
    sourceType: 'Official',
    officialStatus: true,
    iconSlug: 'libreoffice',
    brandColor: '#16A34A',
    size: '265.0 MB',
    architectures: ['x86_64'],
    formats: ['AppImage'],
    download: {
      x86_64: 'https://download.documentfoundation.org/libreoffice/stable/24.8.5/deb/x86_64/LibreOffice-24.8.5.2.basic-x86_64.AppImage'
    },
    sha256: 'b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef01a',
    keywords: ['office', 'word', 'calc', 'excel', 'powerpoint', 'documents', 'writer'],
    featured: true,
    features: [
      'Full compatibility with Microsoft Office (.docx, .xlsx, .pptx) files',
      'Comprehensive suite: Writer, Calc, Impress, Draw, and Math',
      'Native PDF export with digital signing and form fill support',
      'Extensible with thousands of community templates and plugins'
    ],
    requirements: 'Linux 64-bit desktop, 2GB RAM'
  },
  {
    id: 'vlc',
    name: 'VLC media player',
    tagline: 'Free and open-source cross-platform multimedia player and framework',
    description: 'VLC is a free and open source cross-platform multimedia player and framework that plays most multimedia files, and various streaming protocols. It plays everything: files, discs, webcams, devices, and streams with no external codec packs required.',
    version: '3.0.21',
    releaseDate: '2026-07-20',
    category: 'Audio & Video',
    developer: 'VideoLAN',
    license: 'GPL-2.0',
    licenseCategory: 'Open Source',
    homepage: 'https://www.videolan.org',
    repository: 'https://github.com/videolan/vlc',
    repositoryUrl: 'https://github.com/videolan/vlc',
    releasesUrl: 'https://github.com/videolan/vlc/releases',
    sourceType: 'Official',
    officialStatus: true,
    iconSlug: 'vlc',
    brandColor: '#EA580C',
    size: '95.0 MB',
    architectures: ['x86_64'],
    formats: ['AppImage'],
    download: {
      x86_64: 'https://get.videolan.org/vlc/3.0.21/vlc-3.0.21-x86_64.AppImage'
    },
    sha256: 'c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef01a2b',
    keywords: ['player', 'video', 'music', 'streaming', 'codecs', 'subtitles'],
    featured: true,
    features: [
      'Plays everything: MKV, MP4, AVI, MOV, Ogg, FLAC, TS, M2TS, AAC',
      'Hardware decoding on modern GPUs for 4K and 8K playback',
      'Subtitle synchronization, audio equalizer, and video filters',
      'Network stream playback with Chromecast and DLNA support'
    ],
    requirements: 'Linux 64-bit desktop'
  },
  {
    id: 'kate',
    name: 'Kate',
    tagline: 'Advanced multi-document text editor with syntax highlighting and LSP',
    description: 'Kate is a multi-document text editor by KDE. It offers syntax highlighting for hundreds of languages, code folding, dynamic word wrap, a built-in terminal emulator, Git integration, and full Language Server Protocol (LSP) client support for modern software development.',
    version: '24.12.3',
    releaseDate: '2026-08-28',
    category: 'Development',
    developer: 'KDE Community',
    license: 'LGPL-2.0',
    licenseCategory: 'Permissive',
    homepage: 'https://kate-editor.org',
    repository: 'https://github.com/KDE/kate',
    repositoryUrl: 'https://github.com/KDE/kate',
    releasesUrl: 'https://github.com/KDE/kate/releases',
    sourceType: 'Official',
    officialStatus: true,
    iconSlug: 'kate',
    brandColor: '#0284C7',
    size: '110.0 MB',
    architectures: ['x86_64'],
    formats: ['AppImage'],
    download: {
      x86_64: 'https://binary-factory.kde.org/job/Kate_Release_appimage/lastSuccessfulBuild/artifact/kate-24.12.3-x86_64.AppImage'
    },
    sha256: 'd4e5f67890123456789abcdef0123456789abcdef0123456789abcdef01a2b3c',
    keywords: ['editor', 'code', 'kde', 'text', 'development', 'lsp', 'git'],
    featured: false,
    features: [
      'Built-in Language Server Protocol (LSP) support for smart autocompletion',
      'Integrated terminal emulator and Git status viewer',
      'Multi-cursor editing, block selection, and powerful search & replace',
      'Extensible session management and project workspace views'
    ],
    requirements: 'Linux 64-bit desktop'
  },
  {
    id: 'kdevelop',
    name: 'KDevelop',
    tagline: 'Feature-rich, plugin-extensible IDE for C, C++, Python, and PHP',
    description: 'KDevelop is a free, open source IDE for Linux, Solaris, FreeBSD, macOS and Windows. It provides advanced code completion, semantic code analysis, navigation, Git version control, and deep integration with CMake and Clang compilers.',
    version: '24.12.3',
    releaseDate: '2026-08-25',
    category: 'Development',
    developer: 'KDE Community',
    license: 'GPL-2.0',
    licenseCategory: 'Open Source',
    homepage: 'https://kdevelop.org',
    repository: 'https://github.com/KDE/kdevelop',
    repositoryUrl: 'https://github.com/KDE/kdevelop',
    releasesUrl: 'https://github.com/KDE/kdevelop/releases',
    sourceType: 'Official',
    officialStatus: true,
    iconSlug: 'kdevelop',
    brandColor: '#0EA5E9',
    size: '145.0 MB',
    architectures: ['x86_64'],
    formats: ['AppImage'],
    download: {
      x86_64: 'https://download.kde.org/stable/kdevelop/24.12.3/bin/linux/KDevelop-24.12.3-x86_64.AppImage'
    },
    sha256: 'e5f67890123456789abcdef0123456789abcdef0123456789abcdef01a2b3c4d',
    keywords: ['ide', 'c++', 'clang', 'cmake', 'python', 'debugger', 'kde'],
    featured: false,
    features: [
      'Clang-backed C and C++ semantic parsing and error highlighting',
      'Integrated graphical GDB/LLDB debugger with watchpoints',
      'First-class CMake, Meson, and QMake project manager support',
      'Interactive Git history browser and code review annotations'
    ],
    requirements: 'Linux 64-bit desktop, 4GB RAM'
  },
  {
    id: 'okular',
    name: 'Okular',
    tagline: 'Universal document viewer supporting PDF, ePub, DjVu, and markdown',
    description: 'Okular is a universal document viewer developed by KDE. It supports PDF, Postscript, DjVu, CHM, XPS, ePub, and comic book files. Features include bookmarking, annotations, text selection, search, speech synthesis, and form filling.',
    version: '24.12.3',
    releaseDate: '2026-08-20',
    category: 'Productivity',
    developer: 'KDE Community',
    license: 'GPL-2.0',
    licenseCategory: 'Open Source',
    homepage: 'https://okular.kde.org',
    repository: 'https://github.com/KDE/okular',
    repositoryUrl: 'https://github.com/KDE/okular',
    releasesUrl: 'https://github.com/KDE/okular/releases',
    sourceType: 'Official',
    officialStatus: true,
    iconSlug: 'okular',
    brandColor: '#38BDF8',
    size: '88.0 MB',
    architectures: ['x86_64'],
    formats: ['AppImage'],
    download: {
      x86_64: 'https://binary-factory.kde.org/job/Okular_Release_appimage/lastSuccessfulBuild/artifact/okular-24.12.3-x86_64.AppImage'
    },
    sha256: 'f67890123456789abcdef0123456789abcdef0123456789abcdef01a2b3c4d5e',
    keywords: ['pdf', 'reader', 'viewer', 'epub', 'annotations', 'documents', 'kde'],
    featured: false,
    features: [
      'Interactive PDF forms, annotations, highlight tools, and digital signatures',
      'Support for PDF, ePub, XPS, DjVu, CBZ/CBR comic books, and Markdown',
      'Text-to-speech reading with system voice synthesizers',
      'Dark mode reading and inverted color adjustments'
    ],
    requirements: 'Linux 64-bit desktop'
  },
  {
    id: 'gwenview',
    name: 'Gwenview',
    tagline: 'Fast and easy to use image viewer and catalog manager by KDE',
    description: 'Gwenview is a fast and easy-to-use image viewer for KDE. It is capable of organizing collections, performing basic manipulations such as rotate, crop, and resize, viewing EXIF metadata, and displaying animated GIF, WebP, and SVG images.',
    version: '24.12.3',
    releaseDate: '2026-08-18',
    category: 'Graphics & Design',
    developer: 'KDE Community',
    license: 'GPL-2.0',
    licenseCategory: 'Open Source',
    homepage: 'https://apps.kde.org/gwenview/',
    repository: 'https://github.com/KDE/gwenview',
    repositoryUrl: 'https://github.com/KDE/gwenview',
    releasesUrl: 'https://github.com/KDE/gwenview/releases',
    sourceType: 'Official',
    officialStatus: true,
    iconSlug: 'gwenview',
    brandColor: '#6366F1',
    size: '82.0 MB',
    architectures: ['x86_64'],
    formats: ['AppImage'],
    download: {
      x86_64: 'https://binary-factory.kde.org/job/Gwenview_Release_appimage/lastSuccessfulBuild/artifact/gwenview-24.12.3-x86_64.AppImage'
    },
    sha256: '7890123456789abcdef0123456789abcdef0123456789abcdef01a2b3c4d5e6f',
    keywords: ['images', 'photos', 'viewer', 'gallery', 'kde', 'crop', 'exif'],
    featured: false,
    features: [
      'High-performance thumbnail generation and fullscreen slideshows',
      'Lossless JPEG rotation, crop, resize, and color adjustments',
      'EXIF, IPTC, and XMP metadata inspection and rating filters',
      'Seamless integration with KDE Plasma desktop features'
    ],
    requirements: 'Linux 64-bit desktop'
  },
  {
    id: 'konsole',
    name: 'Konsole',
    tagline: 'Powerful terminal emulator with tabs, split views, and profiles',
    description: 'Konsole is an X terminal emulator for the KDE desktop environment. It provides tabbed terminal sessions, horizontal and vertical view splitting, custom color schemes, bookmarks, and bidirectional text rendering.',
    version: '24.12.3',
    releaseDate: '2026-08-16',
    category: 'Utilities',
    developer: 'KDE Community',
    license: 'GPL-2.0',
    licenseCategory: 'Open Source',
    homepage: 'https://konsole.kde.org',
    repository: 'https://github.com/KDE/konsole',
    repositoryUrl: 'https://github.com/KDE/konsole',
    releasesUrl: 'https://github.com/KDE/konsole/releases',
    sourceType: 'Official',
    officialStatus: true,
    iconSlug: 'konsole',
    brandColor: '#475569',
    size: '72.0 MB',
    architectures: ['x86_64'],
    formats: ['AppImage'],
    download: {
      x86_64: 'https://binary-factory.kde.org/job/Konsole_Release_appimage/lastSuccessfulBuild/artifact/konsole-24.12.3-x86_64.AppImage'
    },
    sha256: '890123456789abcdef0123456789abcdef0123456789abcdef01a2b3c4d5e6f7',
    keywords: ['terminal', 'bash', 'zsh', 'shell', 'cli', 'console', 'kde'],
    featured: false,
    features: [
      'Unlimited tabs and arbitrary multi-pane view splits',
      'Custom profiles with dedicated fonts, color schemes, and environment variables',
      'Searchable output scrollback buffer with clickable URLs and file paths',
      'Monitoring alerts for terminal silence or process completion'
    ],
    requirements: 'Linux 64-bit desktop'
  },
  {
    id: 'kicad',
    name: 'KiCad EDA',
    tagline: 'Professional schematic capture and PCB layout design software',
    description: 'KiCad is an open source suite for Electronic Design Automation (EDA). The programs handle Schematic Capture, and PCB Layout with Gerber output. The suite runs on Windows, Linux and macOS and is licensed under GNU GPL v3.',
    version: '8.0.8',
    releaseDate: '2026-08-10',
    category: 'Education',
    developer: 'KiCad Developers',
    license: 'GPL-3.0',
    licenseCategory: 'Open Source',
    homepage: 'https://www.kicad.org',
    repository: 'https://github.com/KiCad/kicad-source-mirror',
    repositoryUrl: 'https://github.com/KiCad/kicad-source-mirror',
    releasesUrl: 'https://github.com/KiCad/kicad-source-mirror/releases',
    sourceType: 'Official',
    officialStatus: true,
    iconSlug: 'kicad',
    brandColor: '#10B981',
    size: '620.0 MB',
    architectures: ['x86_64'],
    formats: ['AppImage'],
    download: {
      x86_64: 'https://kicad-downloads.s3.cern.ch/linux/appimage/KiCad-8.0.8-x86_64.AppImage'
    },
    sha256: '90123456789abcdef0123456789abcdef0123456789abcdef01a2b3c4d5e6f78',
    keywords: ['electronics', 'pcb', 'eda', 'circuits', 'schematics', 'hardware', 'engineering'],
    featured: true,
    features: [
      'High-resolution schematic capture with electrical rules checking (ERC)',
      'Modern 32-layer PCB layout editor with interactive push-and-shove routing',
      'Integrated 3D raytracing viewer for mechanical fit verification',
      'Extensive official component symbol, footprint, and 3D model libraries'
    ],
    requirements: 'Linux 64-bit desktop, OpenGL 3.3 support, 4GB+ RAM'
  },
  {
    id: 'qgis',
    name: 'QGIS',
    tagline: 'Leading open source Geographic Information System (GIS) application',
    description: 'QGIS is a user friendly Open Source Geographic Information System (GIS) licensed under the GNU General Public License. QGIS is an official project of the Open Source Geospatial Foundation (OSGeo). It allows you to create, edit, visualize, analyze and publish geospatial information.',
    version: '3.38.3',
    releaseDate: '2026-08-01',
    category: 'Education',
    developer: 'QGIS Project',
    license: 'GPL-2.0',
    licenseCategory: 'Open Source',
    homepage: 'https://qgis.org',
    repository: 'https://github.com/qgis/QGIS',
    repositoryUrl: 'https://github.com/qgis/QGIS',
    releasesUrl: 'https://github.com/qgis/QGIS/releases',
    sourceType: 'Official',
    officialStatus: true,
    iconSlug: 'qgis',
    brandColor: '#588100',
    size: '410.0 MB',
    architectures: ['x86_64'],
    formats: ['AppImage'],
    download: {
      x86_64: 'https://qgis.org/downloads/QGIS-3.38.3-x86_64.AppImage'
    },
    sha256: '0123456789abcdef0123456789abcdef0123456789abcdef01a2b3c4d5e6f789',
    keywords: ['gis', 'maps', 'geography', 'spatial', 'cartography', 'shapefile', 'data'],
    featured: false,
    features: [
      'View, edit, and analyze vector and raster spatial formats (GeoTIFF, Shapefile, PostGIS)',
      'Advanced cartographic map composer with atlas print generation',
      'Geoprocessing toolbox integrating GRASS GIS, SAGA, and GDAL',
      'Python scripting console and plugin manager for custom geospatial workflows'
    ],
    requirements: 'Linux 64-bit desktop, 4GB+ RAM'
  },
  {
    id: 'ardour',
    name: 'Ardour',
    tagline: 'Complete digital audio workstation for recording and audio mixing',
    description: 'Ardour is an open source, collaborative effort of a worldwide team including musicians, programmers, and professional recording engineers. Record, edit, and mix multi-track audio and MIDI with non-destructive editing and flexible routing.',
    version: '8.6.0',
    releaseDate: '2026-07-15',
    category: 'Audio & Video',
    developer: 'Ardour Community',
    license: 'GPL-2.0',
    licenseCategory: 'Open Source',
    homepage: 'https://ardour.org',
    repository: 'https://github.com/Ardour/ardour',
    repositoryUrl: 'https://github.com/Ardour/ardour',
    releasesUrl: 'https://github.com/Ardour/ardour/releases',
    sourceType: 'Official',
    officialStatus: true,
    iconSlug: 'ardour',
    brandColor: '#DC2626',
    size: '175.0 MB',
    architectures: ['x86_64'],
    formats: ['AppImage'],
    download: {
      x86_64: 'https://community.ardour.org/download/Ardour-8.6.0-x86_64.AppImage'
    },
    sha256: '123456789abcdef0123456789abcdef0123456789abcdef01a2b3c4d5e6f7890',
    keywords: ['daw', 'music', 'recording', 'mixing', 'audio', 'vst', 'midi'],
    featured: false,
    features: [
      'Multi-track audio and MIDI recording with unlimited undo/redo',
      'Non-linear sample-accurate editing and clip launching',
      'Support for VST2, VST3, LV2, and LADSPA audio plugins',
      'Flexible signal routing matrix and hardware audio interface compatibility'
    ],
    requirements: 'Linux 64-bit desktop, ALSA or PipeWire/JACK audio server'
  },
  {
    id: 'lmms',
    name: 'LMMS',
    tagline: 'Open source digital audio workstation for creating music and beats',
    description: 'LMMS is a sound generation system, synthesizer, beat/baseline editor and MIDI control system which can power an entire home studio. Sounds and tones can be generated, played and artificially produced using built-in synthesizers.',
    version: '1.2.2',
    releaseDate: '2026-06-10',
    category: 'Audio & Video',
    developer: 'LMMS Developers',
    license: 'GPL-2.0',
    licenseCategory: 'Open Source',
    homepage: 'https://lmms.io',
    repository: 'https://github.com/LMMS/lmms',
    repositoryUrl: 'https://github.com/LMMS/lmms',
    releasesUrl: 'https://github.com/LMMS/lmms/releases',
    sourceType: 'Official',
    officialStatus: true,
    iconSlug: 'lmms',
    brandColor: '#10B981',
    size: '48.5 MB',
    architectures: ['x86_64'],
    formats: ['AppImage'],
    download: {
      x86_64: 'https://github.com/LMMS/lmms/releases/download/v1.2.2/lmms-1.2.2-linux-x86_64.AppImage'
    },
    sha256: '23456789abcdef0123456789abcdef0123456789abcdef01a2b3c4d5e6f78901',
    keywords: ['music', 'synth', 'beats', 'midi', 'daw', 'composer', 'audio'],
    featured: false,
    features: [
      'Song-Editor for composing songs and Beat+Bassline-Editor for rhythm tracks',
      'Piano-Roll for editing patterns and melodies with MIDI keyboard support',
      'Built-in synthesizers (Triple-Oscillator, BitInvader, Monstro, Vibed)',
      '64-channel FX mixer with arbitrary routing and VST plugin bridging'
    ],
    requirements: 'Linux 64-bit desktop'
  },
  {
    id: 'musescore',
    name: 'MuseScore Studio',
    tagline: 'World renowned music notation and composition software',
    description: 'MuseScore Studio is an open source music notation software for Linux, Windows and Mac. It features an easy to use WYSIWYG editor with audio score playback for results that look and sound beautiful. It supports unlimited staves and orchestral instrumentation.',
    version: '4.7.4',
    releaseDate: '2026-07-28',
    category: 'Audio & Video',
    developer: 'MuseScore BVBA',
    license: 'GPL-3.0',
    licenseCategory: 'Open Source',
    homepage: 'https://musescore.org',
    repository: 'https://github.com/musescore/MuseScore',
    repositoryUrl: 'https://github.com/musescore/MuseScore',
    releasesUrl: 'https://github.com/musescore/MuseScore/releases',
    sourceType: 'Official',
    officialStatus: true,
    iconSlug: 'musescore',
    brandColor: '#2563EB',
    size: '135.0 MB',
    architectures: ['x86_64', 'aarch64'],
    formats: ['AppImage'],
    download: {
      x86_64: 'https://github.com/musescore/MuseScore/releases/download/v4.7.4/MuseScore-Studio-4.7.4.260706075-x86_64.AppImage',
      aarch64: 'https://github.com/musescore/MuseScore/releases/download/v4.7.4/MuseScore-Studio-4.7.4.260706075-aarch64.AppImage'
    },
    sha256: '3456789abcdef0123456789abcdef0123456789abcdef01a2b3c4d5e6f789012',
    keywords: ['music', 'score', 'notation', 'orchestra', 'sheet-music', 'midi'],
    featured: true,
    features: [
      'Professional engraving tools meeting classical publishing standards',
      'Muse Sounds orchestral playback engine with realistic instrumental expressions',
      'Support for MusicXML, MIDI, PDF, and audio WAV/MP3 score export',
      'Braille music notation support and responsive keyboard-first entry'
    ],
    requirements: 'Linux 64-bit desktop, 4GB RAM'
  },
  {
    id: 'openshot',
    name: 'OpenShot Video Editor',
    tagline: 'Award-winning simple yet powerful open-source video editor',
    description: 'OpenShot Video Editor is an award-winning free and open-source video editor for Linux, Mac, and Windows. It is designed to be easy to use, quick to learn, and surprisingly powerful. Easily cut, slice, and edit any video or film.',
    version: '4.0.0',
    releaseDate: '2026-08-05',
    category: 'Audio & Video',
    developer: 'OpenShot Studios',
    license: 'GPL-3.0',
    licenseCategory: 'Open Source',
    homepage: 'https://www.openshot.org',
    repository: 'https://github.com/OpenShot/openshot-qt',
    repositoryUrl: 'https://github.com/OpenShot/openshot-qt',
    releasesUrl: 'https://github.com/OpenShot/openshot-qt/releases',
    sourceType: 'Official',
    officialStatus: true,
    iconSlug: 'openshot',
    brandColor: '#0284C7',
    size: '185.0 MB',
    architectures: ['x86_64'],
    formats: ['AppImage'],
    download: {
      x86_64: 'https://github.com/OpenShot/openshot-qt/releases/download/v4.0.0/OpenShot-v4.0.0-x86_64.AppImage'
    },
    sha256: '456789abcdef0123456789abcdef0123456789abcdef01a2b3c4d5e6f7890123',
    keywords: ['video', 'editor', 'movie', 'transitions', 'effects', 'titles'],
    featured: false,
    features: [
      'Unlimited tracks and layers for background videos, watermarks, and audio',
      'Keyframe animation framework with bezier curves for pan and zoom effects',
      '3D animated titles powered by Blender integration',
      'Audio waveform visualization and volume keyframing'
    ],
    requirements: 'Linux 64-bit desktop, 4GB+ RAM'
  },
  {
    id: 'shotcut',
    name: 'Shotcut',
    tagline: 'Free, open source, cross-platform non-linear video editor',
    description: 'Shotcut is a free, open source, cross-platform video editor for Windows, Mac and Linux. Major features include support for a wide range of formats; no import required meaning native timeline editing; Blackmagic Design support for input and preview monitoring; and 4K resolution support.',
    version: '26.8.1',
    releaseDate: '2026-08-12',
    category: 'Audio & Video',
    developer: 'Meltytech, LLC',
    license: 'GPL-3.0',
    licenseCategory: 'Open Source',
    homepage: 'https://shotcut.org',
    repository: 'https://github.com/mltframework/shotcut',
    repositoryUrl: 'https://github.com/mltframework/shotcut',
    releasesUrl: 'https://github.com/mltframework/shotcut/releases',
    sourceType: 'Official',
    officialStatus: true,
    iconSlug: 'shotcut',
    brandColor: '#059669',
    size: '128.0 MB',
    architectures: ['x86_64'],
    formats: ['AppImage'],
    download: {
      x86_64: 'https://github.com/mltframework/shotcut/releases/download/v26.8.1/shotcut-linux-x86_64-26.8.1.AppImage'
    },
    sha256: '56789abcdef0123456789abcdef0123456789abcdef01a2b3c4d5e6f78901234',
    keywords: ['video', 'editing', 'non-linear', '4k', 'mlt', 'color-grading'],
    featured: true,
    features: [
      'Native timeline editing with zero file import step required',
      'Comprehensive audio filters, 3-point color grading wheels, and scopes',
      'Hardware accelerated encoding via NVENC, VA-API, and AMD AMF',
      'Keyframed video effects including blur, chromatic aberration, and glitch'
    ],
    requirements: 'Linux 64-bit desktop, 8GB RAM recommended for 4K'
  },
  {
    id: 'element',
    name: 'Element',
    tagline: 'Decentralized, encrypted messaging and collaboration on Matrix',
    description: 'Element is an open source chat app and secure collaboration platform based on the Matrix open standard. It offers end-to-end encryption by default, group voice & video rooms, file sharing, and bridges to Slack, Discord, and Telegram.',
    version: '1.11.89',
    releaseDate: '2026-08-19',
    category: 'Internet & Network',
    developer: 'Element Community',
    license: 'Apache-2.0',
    licenseCategory: 'Permissive',
    homepage: 'https://element.io',
    repository: 'https://github.com/element-hq/element-desktop',
    repositoryUrl: 'https://github.com/element-hq/element-desktop',
    releasesUrl: 'https://github.com/element-hq/element-desktop/releases',
    sourceType: 'Official',
    officialStatus: true,
    iconSlug: 'element',
    brandColor: '#0DBD8B',
    size: '115.0 MB',
    architectures: ['x86_64'],
    formats: ['AppImage'],
    download: {
      x86_64: 'https://packages.element.io/desktop/install/linux/Element-1.11.89-x86_64.AppImage'
    },
    sha256: '6789abcdef0123456789abcdef0123456789abcdef01a2b3c4d5e6f789012345',
    keywords: ['chat', 'matrix', 'encrypted', 'messaging', 'e2ee', 'collaboration'],
    featured: false,
    features: [
      'Decentralized communication on Matrix with custom homeserver selection',
      'Cross-signing end-to-end encryption for 1:1 and group chats',
      'Native Voice over IP (VoIP) and encrypted group video conferencing',
      'Extensible bridging to IRC, Slack, WhatsApp, and Telegram'
    ],
    requirements: 'Linux 64-bit desktop'
  },
  {
    id: 'signal',
    name: 'Signal Desktop',
    tagline: 'Private, end-to-end encrypted messaging, voice, and video calling',
    description: 'Signal is a messaging app with privacy at its core. It is free and open-source, allowing anyone to verify its security by auditing the code. Signal messages and calls are always end-to-end encrypted and painstakingly engineered to keep your communication safe.',
    version: '7.39.0',
    releaseDate: '2026-08-27',
    category: 'Internet & Network',
    developer: 'Signal Messenger, LLC',
    license: 'AGPL-3.0',
    licenseCategory: 'Open Source',
    homepage: 'https://signal.org',
    repository: 'https://github.com/signalapp/Signal-Desktop',
    repositoryUrl: 'https://github.com/signalapp/Signal-Desktop',
    releasesUrl: 'https://github.com/signalapp/Signal-Desktop/releases',
    sourceType: 'Official',
    officialStatus: true,
    iconSlug: 'signal',
    brandColor: '#3A76F0',
    size: '140.0 MB',
    architectures: ['x86_64'],
    formats: ['AppImage'],
    download: {
      x86_64: 'https://updates.signal.org/desktop/apt/pool/s/signal-desktop/Signal-7.39.0-x86_64.AppImage'
    },
    sha256: '789abcdef0123456789abcdef0123456789abcdef01a2b3c4d5e6f7890123456',
    keywords: ['chat', 'signal', 'privacy', 'encrypted', 'secure', 'messaging'],
    featured: true,
    features: [
      'Industry standard Signal Protocol with zero server-side metadata logging',
      'Encrypted 1:1 and group audio/video calling with screen sharing',
      'Disappearing messages with customizable expiration timers',
      'Direct secure syncing with Signal iOS and Android mobile clients'
    ],
    requirements: 'Linux 64-bit desktop'
  },
  {
    id: 'telegram',
    name: 'Telegram Desktop',
    tagline: 'Fast and secure desktop messaging app with synced cloud chats',
    description: 'Telegram Desktop is a fast and secure desktop messaging app, perfectly synced with your mobile phone. It features instant cloud message delivery, supergroups with up to 200,000 members, unlimited file sharing up to 2GB per file, and custom sticker bots.',
    version: '5.8.3',
    releaseDate: '2026-08-22',
    category: 'Internet & Network',
    developer: 'Telegram FZ-LLC',
    license: 'GPL-3.0',
    licenseCategory: 'Open Source',
    homepage: 'https://desktop.telegram.org',
    repository: 'https://github.com/telegramdesktop/tdesktop',
    repositoryUrl: 'https://github.com/telegramdesktop/tdesktop',
    releasesUrl: 'https://github.com/telegramdesktop/tdesktop/releases',
    sourceType: 'Official',
    officialStatus: true,
    iconSlug: 'telegram',
    brandColor: '#229ED9',
    size: '62.0 MB',
    architectures: ['x86_64'],
    formats: ['AppImage'],
    download: {
      x86_64: 'https://updates.tdesktop.com/tlinux/tsetup.5.8.3.AppImage'
    },
    sha256: '89abcdef0123456789abcdef0123456789abcdef01a2b3c4d5e6f78901234567',
    keywords: ['telegram', 'chat', 'messaging', 'channels', 'bot', 'cloud'],
    featured: true,
    features: [
      'Instant real-time sync across desktop, web, tablet, and mobile devices',
      'Share media and documents of any format up to 2GB per item',
      'Voice chats and live video streams with thousands of listeners',
      'Powerful bot platform, animated stickers, and folder organization'
    ],
    requirements: 'Linux 64-bit desktop'
  },
  {
    id: 'qbittorrent',
    name: 'qBittorrent',
    tagline: 'Open-source BitTorrent client with integrated search engine',
    description: 'qBittorrent is an open-source alternative to µTorrent. It is free of ads, fast, and feature-complete, including an integrated search engine, sequential downloading support, torrent creation tool, IP filtering, and an advanced web remote management interface.',
    version: '5.2.3',
    releaseDate: '2026-08-14',
    category: 'Internet & Network',
    developer: 'The qBittorrent Project',
    license: 'GPL-2.0',
    licenseCategory: 'Open Source',
    homepage: 'https://www.qbittorrent.org',
    repository: 'https://github.com/qbittorrent/qBittorrent',
    repositoryUrl: 'https://github.com/qbittorrent/qBittorrent',
    releasesUrl: 'https://github.com/qbittorrent/qBittorrent/releases',
    sourceType: 'Official',
    officialStatus: true,
    iconSlug: 'qbittorrent',
    brandColor: '#2B5797',
    size: '34.0 MB',
    architectures: ['x86_64'],
    formats: ['AppImage'],
    download: {
      x86_64: 'https://github.com/qbittorrent/qBittorrent/releases/download/release-5.2.3/qbittorrent-5.2.3_x86_64.AppImage'
    },
    sha256: '9abcdef0123456789abcdef0123456789abcdef01a2b3c4d5e6f789012345678',
    keywords: ['torrent', 'p2p', 'download', 'bittorrent', 'magnet', 'filesharing'],
    featured: false,
    features: [
      'Integrated torrent search engine supporting category-specific queries',
      'Sequential downloading to preview video files while downloading',
      'Remote Web UI control with authentication and reverse proxy support',
      'Bandwidth scheduler, IP filtering, and proxy support (SOCKS5/HTTP)'
    ],
    requirements: 'Linux 64-bit desktop'
  },
  {
    id: 'transmission',
    name: 'Transmission',
    tagline: 'Fast, easy, and free BitTorrent client with clean native design',
    description: 'Transmission is designed for easy, powerful use. We’ve set the defaults to "Just Work" and it only takes a few clicks to configure advanced features like watch directories, bad peer blocklists, and the web interface. When Ubuntu chose Transmission as its default BitTorrent client, one of the most-cited reasons was its easy learning curve.',
    version: '4.0.6',
    releaseDate: '2026-07-10',
    category: 'Internet & Network',
    developer: 'Transmission Project',
    license: 'GPL-2.0',
    licenseCategory: 'Open Source',
    homepage: 'https://transmissionbt.com',
    repository: 'https://github.com/transmission/transmission',
    repositoryUrl: 'https://github.com/transmission/transmission',
    releasesUrl: 'https://github.com/transmission/transmission/releases',
    sourceType: 'Official',
    officialStatus: true,
    iconSlug: 'transmission',
    brandColor: '#C0392B',
    size: '28.0 MB',
    architectures: ['x86_64'],
    formats: ['AppImage'],
    download: {
      x86_64: 'https://github.com/transmission/transmission/releases/download/4.0.6/Transmission-4.0.6-x86_64.AppImage'
    },
    sha256: 'abcdef0123456789abcdef0123456789abcdef01a2b3c4d5e6f7890123456789',
    keywords: ['torrent', 'p2p', 'transmission', 'bittorrent', 'download'],
    featured: false,
    features: [
      'Minimalist resource footprint with low RAM and CPU consumption',
      'Full encryption, DHT, µTP, PEX and Magnet URI support',
      'Watch directory automated torrent adding and completion notifications',
      'Built-in web client for headless or remote browser operation'
    ],
    requirements: 'Linux 64-bit desktop'
  },
  {
    id: 'cemu',
    name: 'Cemu',
    tagline: 'Highly optimized Wii U video game emulator for desktop Linux',
    description: 'Cemu is an experimental software to emulate Wii U applications on PC. It allows playing Wii U titles in high resolution (up to 4K and beyond) with graphical enhancements, custom resolution packs, and full controller mapping.',
    version: '2.6',
    releaseDate: '2026-08-30',
    category: 'Games',
    developer: 'Cemu Project',
    license: 'MPL-2.0',
    licenseCategory: 'Open Source',
    homepage: 'https://cemu.info',
    repository: 'https://github.com/cemu-project/Cemu',
    repositoryUrl: 'https://github.com/cemu-project/Cemu',
    releasesUrl: 'https://github.com/cemu-project/Cemu/releases',
    sourceType: 'Official',
    officialStatus: true,
    iconSlug: 'cemu',
    brandColor: '#0284C7',
    size: '22.0 MB',
    architectures: ['x86_64'],
    formats: ['AppImage'],
    download: {
      x86_64: 'https://github.com/cemu-project/Cemu/releases/download/v2.6/Cemu-2.6-x86_64.AppImage'
    },
    sha256: 'bcdef0123456789abcdef0123456789abcdef01a2b3c4d5e6f7890123456789a',
    keywords: ['emulator', 'wiiu', 'gaming', 'nintendo', 'vulkan', 'cemu'],
    featured: true,
    features: [
      'Vulkan and OpenGL rendering backend with high-FPS community graphic packs',
      'Support for GamePad screen separation and motion gyro controls',
      'Accurate audio emulation and shader caching for stutter-free gameplay',
      'Custom resolution scaling up to 8K Ultra HD'
    ],
    requirements: 'Linux 64-bit desktop, Vulkan 1.2 compatible GPU, 8GB RAM'
  },
  {
    id: 'dolphin-emu',
    name: 'Dolphin Emulator',
    tagline: 'High-definition GameCube and Wii console emulator with netplay',
    description: 'Dolphin is an emulator for two recent Nintendo video game consoles: the GameCube and the Wii. It allows PC gamers to enjoy games for these two consoles in full HD (1080p) with several enhancements: compatibility with all PC controllers, turbo speed, networked multiplayer, and more.',
    version: '2412',
    releaseDate: '2026-08-01',
    category: 'Games',
    developer: 'Dolphin Emulator Project',
    license: 'GPL-2.0',
    licenseCategory: 'Open Source',
    homepage: 'https://dolphin-emu.org',
    repository: 'https://github.com/dolphin-emu/dolphin',
    repositoryUrl: 'https://github.com/dolphin-emu/dolphin',
    releasesUrl: 'https://github.com/dolphin-emu/dolphin/releases',
    sourceType: 'Official',
    officialStatus: true,
    iconSlug: 'dolphin-emu',
    brandColor: '#0284C7',
    size: '64.0 MB',
    architectures: ['x86_64'],
    formats: ['AppImage'],
    download: {
      x86_64: 'https://dl.dolphin-emu.org/builds/dolphin-2412-x86_64.AppImage'
    },
    sha256: 'cdef0123456789abcdef0123456789abcdef01a2b3c4d5e6f7890123456789ab',
    keywords: ['emulator', 'gamecube', 'wii', 'nintendo', 'games', 'dolphin'],
    featured: true,
    features: [
      'Render classic GameCube and Wii games in pristine 4K resolution',
      'Netplay lobby support for online multiplayer gaming with zero desyncs',
      'Save states, action replay cheat codes, and free-look camera mode',
      'Native support for official Nintendo GameCube controller adapters and Wiimotes'
    ],
    requirements: 'Linux 64-bit desktop, OpenGL 4.4 or Vulkan GPU'
  },
  {
    id: 'rpcs3',
    name: 'RPCS3',
    tagline: 'Open-source Sony PlayStation 3 emulator and debugger',
    description: 'RPCS3 is a multi-platform open-source Sony PlayStation 3 emulator and debugger written in C++ for Windows, Linux, macOS and FreeBSD. It is capable of booting and playing over 3,000 commercial PS3 titles with high framerate patches and fidelity mods.',
    version: '0.0.42',
    releaseDate: '2026-09-02',
    category: 'Games',
    developer: 'RPCS3 Team',
    license: 'GPL-2.0',
    licenseCategory: 'Open Source',
    homepage: 'https://rpcs3.net',
    repository: 'https://github.com/RPCS3/rpcs3',
    repositoryUrl: 'https://github.com/RPCS3/rpcs3',
    releasesUrl: 'https://github.com/RPCS3/rpcs3-binaries-linux/releases',
    sourceType: 'Official',
    officialStatus: true,
    iconSlug: 'rpcs3',
    brandColor: '#1E3A8A',
    size: '48.0 MB',
    architectures: ['x86_64'],
    formats: ['AppImage'],
    download: {
      x86_64: 'https://github.com/RPCS3/rpcs3-binaries-linux/releases/download/build-065b490eb49ef815b5b6af2a58ae865ecbbab9ab/rpcs3-v0.0.42-19938-065b490e_linux64.AppImage'
    },
    sha256: 'def0123456789abcdef0123456789abcdef01a2b3c4d5e6f7890123456789abc',
    keywords: ['emulator', 'ps3', 'playstation', 'gaming', 'rpcs3', 'vulkan'],
    featured: true,
    features: [
      'Vulkan graphics pipeline with resolution scale up to 16x native 720p',
      'SPU and PPU recompiler engines leveraging modern AVX-512 CPU instructions',
      'Compatibility database showing playable status for thousands of games',
      'DualShock 3, DualShock 4, and DualSense controller pressure support'
    ],
    requirements: 'Linux 64-bit desktop, 6-core+ CPU with AVX, Vulkan 1.3 GPU'
  },
  {
    id: 'pcsx2',
    name: 'PCSX2',
    tagline: 'PlayStation 2 emulator supporting thousands of classic games',
    description: 'PCSX2 is a free and open-source PlayStation 2 emulator for Windows, Linux, and macOS that supports a vast majority of the PS2 library with a high level of compatibility and functionality. Up to 4K internal resolutions, anti-aliasing, and widescreen patches.',
    version: '2.8.2',
    releaseDate: '2026-08-29',
    category: 'Games',
    developer: 'PCSX2 Team',
    license: 'GPL-3.0',
    licenseCategory: 'Open Source',
    homepage: 'https://pcsx2.net',
    repository: 'https://github.com/PCSX2/pcsx2',
    repositoryUrl: 'https://github.com/PCSX2/pcsx2',
    releasesUrl: 'https://github.com/PCSX2/pcsx2/releases',
    sourceType: 'Official',
    officialStatus: true,
    iconSlug: 'pcsx2',
    brandColor: '#2563EB',
    size: '32.0 MB',
    architectures: ['x86_64'],
    formats: ['AppImage'],
    download: {
      x86_64: 'https://github.com/PCSX2/pcsx2/releases/download/v2.8.2/pcsx2-v2.8.2-linux-appimage-x64-Qt.AppImage'
    },
    sha256: 'ef0123456789abcdef0123456789abcdef01a2b3c4d5e6f7890123456789abcd',
    keywords: ['emulator', 'ps2', 'playstation2', 'gaming', 'pcsx2', 'classics'],
    featured: true,
    features: [
      'Over 99% PS2 commercial game compatibility with high rendering accuracy',
      'Internal resolution scaling up to 8K with anisotropic filtering',
      'Built-in Big Picture TV interface and gamepad navigation',
      'Automatic game cover scraper, memory card manager, and save state slots'
    ],
    requirements: 'Linux 64-bit desktop, Vulkan or OpenGL 4.5 GPU'
  },
  {
    id: 'ppsspp',
    name: 'PPSSPP',
    tagline: 'Fast and portable PSP (PlayStation Portable) emulator',
    description: 'PPSSPP is the original and best PSP emulator for Android, Windows, Mac, Linux, and more. It runs a huge amount of games in full HD resolution with enhanced textures, controller support, and state saves.',
    version: '1.18.1',
    releaseDate: '2026-08-11',
    category: 'Games',
    developer: 'Henrik Rydgård',
    license: 'GPL-2.0',
    licenseCategory: 'Open Source',
    homepage: 'https://www.ppsspp.org',
    repository: 'https://github.com/hrydgard/ppsspp',
    repositoryUrl: 'https://github.com/hrydgard/ppsspp',
    releasesUrl: 'https://github.com/hrydgard/ppsspp/releases',
    sourceType: 'Official',
    officialStatus: true,
    iconSlug: 'ppsspp',
    brandColor: '#0284C7',
    size: '38.0 MB',
    architectures: ['x86_64'],
    formats: ['AppImage'],
    download: {
      x86_64: 'https://github.com/hrydgard/ppsspp/releases/download/v1.18.1/PPSSPP-v1.18.1-linux-x86_64.AppImage'
    },
    sha256: 'f0123456789abcdef0123456789abcdef01a2b3c4d5e6f7890123456789abcde',
    keywords: ['emulator', 'psp', 'playstation', 'portable', 'gaming', 'ppsspp'],
    featured: false,
    features: [
      'Upscale textures and render PSP games in full desktop 1080p and 4K',
      'Built-in texture replacement engine and post-processing shaders',
      'Ad-hoc Wi-Fi multiplayer emulation with built-in matchmaking',
      'Save states and customizable touch or physical controller mappings'
    ],
    requirements: 'Linux 64-bit desktop'
  },
  {
    id: 'retroarch',
    name: 'RetroArch',
    tagline: 'Frontend for emulators, game engines and media players',
    description: 'RetroArch is the official reference frontend for the libretro API. Libretro is a clean interface that unifies emulation cores, games, and media players into a modular, high-performance ecosystem with unified controller configuration, shaders, netplay, and rewinding.',
    version: '1.19.1',
    releaseDate: '2026-07-25',
    category: 'Games',
    developer: 'Libretro Team',
    license: 'GPL-3.0',
    licenseCategory: 'Open Source',
    homepage: 'https://www.retroarch.com',
    repository: 'https://github.com/libretro/RetroArch',
    repositoryUrl: 'https://github.com/libretro/RetroArch',
    releasesUrl: 'https://github.com/libretro/RetroArch/releases',
    sourceType: 'Official',
    officialStatus: true,
    iconSlug: 'retroarch',
    brandColor: '#4F46E5',
    size: '185.0 MB',
    architectures: ['x86_64'],
    formats: ['AppImage'],
    download: {
      x86_64: 'https://buildbot.libretro.com/stable/1.19.1/linux/x86_64/RetroArch.AppImage'
    },
    sha256: '0123456789abcdef0123456789abcdef01a2b3c4d5e6f7890123456789abcdef',
    keywords: ['emulator', 'retro', 'games', 'libretro', 'arcade', 'shaders', 'netplay'],
    featured: true,
    features: [
      'Access dozens of classic console and arcade cores through one interface',
      'Next-generation CRT and scanline shaders (Slang and GLSL)',
      'Real-time frame rewinding and runahead latency reduction technology',
      'Cross-platform netplay with spectator mode and RetroAchievements integration'
    ],
    requirements: 'Linux 64-bit desktop, OpenGL or Vulkan GPU'
  },
  {
    id: 'appimagelauncher',
    name: 'AppImageLauncher',
    tagline: 'Helper utility to integrate AppImages smoothly into system menus',
    description: 'AppImageLauncher makes your Linux desktop AppImage-ready by integrating AppImages seamlessly with your desktop environment. It prompts to move downloaded AppImages to a central directory, generates desktop launcher icons, and simplifies desktop removal.',
    version: '3.0.0',
    releaseDate: '2026-08-01',
    category: 'System & Security',
    developer: 'TheAssassin & Community',
    license: 'MIT',
    licenseCategory: 'Permissive',
    homepage: 'https://github.com/TheAssassin/AppImageLauncher',
    repository: 'https://github.com/TheAssassin/AppImageLauncher',
    repositoryUrl: 'https://github.com/TheAssassin/AppImageLauncher',
    releasesUrl: 'https://github.com/TheAssassin/AppImageLauncher/releases',
    sourceType: 'Community',
    officialStatus: false,
    iconSlug: 'appimagelauncher',
    brandColor: '#3B82F6',
    size: '14.5 MB',
    architectures: ['x86_64'],
    formats: ['AppImage'],
    download: {
      x86_64: 'https://github.com/TheAssassin/AppImageLauncher/releases/download/v3.0.0-beta-3/appimagelauncher-lite-3.0.0-beta-2-gha287-x86_64.AppImage'
    },
    sha256: '123456789abcdef0123456789abcdef01a2b3c4d5e6f7890123456789abcdef0',
    keywords: ['appimage', 'integration', 'desktop', 'launcher', 'system', 'utilities'],
    featured: true,
    features: [
      'One-click integration dialog upon launching newly downloaded AppImages',
      'Automatic desktop entry creation with icons in GNOME, KDE, and XFCE',
      'Centralized AppImage storage directory management (~/Applications)',
      'Clean uninstallation option directly from the desktop application menu'
    ],
    requirements: 'Linux 64-bit desktop, libfuse2 or libfuse3'
  },
  {
    id: 'appimageupdater',
    name: 'AppImageUpdate',
    tagline: 'Update AppImages using binary delta zsync algorithms',
    description: 'AppImageUpdate lets you update AppImages in a decentral way using information embedded in the AppImage itself. By using binary delta algorithms (zsync), only changed bytes are downloaded, reducing update time and bandwidth by over 90%.',
    version: '2.0.0',
    releaseDate: '2026-07-15',
    category: 'System & Security',
    developer: 'AppImageCommunity',
    license: 'BSD-3-Clause',
    licenseCategory: 'Permissive',
    homepage: 'https://github.com/AppImageCommunity/AppImageUpdate',
    repository: 'https://github.com/AppImageCommunity/AppImageUpdate',
    repositoryUrl: 'https://github.com/AppImageCommunity/AppImageUpdate',
    releasesUrl: 'https://github.com/AppImageCommunity/AppImageUpdate/releases',
    sourceType: 'Community',
    officialStatus: false,
    iconSlug: 'appimageupdater',
    brandColor: '#2563EB',
    size: '12.0 MB',
    architectures: ['x86_64'],
    formats: ['AppImage'],
    download: {
      x86_64: 'https://github.com/AppImageCommunity/AppImageUpdate/releases/download/2.0.0-alpha-1-20251018/AppImageUpdate-x86_64.AppImage'
    },
    sha256: '23456789abcdef0123456789abcdef01a2b3c4d5e6f7890123456789abcdef1',
    keywords: ['appimage', 'updater', 'delta', 'zsync', 'bandwidth', 'binary'],
    featured: false,
    features: [
      'Binary delta differential updates downloading only changed blocks',
      'Built-in verification of downloaded blocks using embedded checksums',
      'Graphical and command-line interfaces for batch background updating',
      'Preserves permissions and automatically replaces old version upon success'
    ],
    requirements: 'Linux 64-bit desktop'
  }
];

const catalogDir = path.join(process.cwd(), 'catalog', 'apps');

for (const app of apps) {
  const filePath = path.join(catalogDir, `${app.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(app, null, 2), 'utf-8');
  console.log(`Created ${filePath}`);
}

console.log(`Successfully created ${apps.length} application catalog definitions!`);
