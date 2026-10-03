-- ============================================================================
-- Niruvi Store — Catalog Migration: Static JSON to Supabase PostgreSQL
-- Migration: 0005_seed_catalog_data.sql
-- ============================================================================

BEGIN;


-- App: Blender (blender)
INSERT INTO public.apps (id, slug, name, short_description, description, category, license, website_url, source_url, icon_url, status, verified, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'blender',
  'Blender',
  'Blender is the world-renowned free and open source 3D pipeline suite. It covers modeling, sculpting, rigging, 3D animation, simulation, GPU raytraced rendering with Cycles, video editing, and 2D storyboard drawing with Grease Pencil.',
  'Blender is the world-renowned free and open source 3D pipeline suite. It covers modeling, sculpting, rigging, 3D animation, simulation, GPU raytraced rendering with Cycles, video editing, and 2D storyboard drawing with Grease Pencil.',
  'Graphics',
  'GPL-3.0',
  'https://projects.blender.org/blender/blender',
  'https://projects.blender.org/blender/blender',
  NULL,
  'published',
  FALSE,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  updated_at = NOW();


INSERT INTO public.app_versions (id, app_id, version, release_notes, release_date, status, created_at, updated_at)
SELECT
  gen_random_uuid(),
  a.id,
  '4.3.2',
  'Verified upstream AppImage release.',
  NOW(),
  'published',
  NOW(),
  NOW()
FROM public.apps a
WHERE a.slug = 'blender'
ON CONFLICT (app_id, version, arch) DO NOTHING;


INSERT INTO public.app_assets (id, version_id, architecture, download_url, sha256, file_size, filename, asset_type, created_at)
SELECT
  gen_random_uuid(),
  av.id,
  'x86_64',
  'https://download.blender.org/release/Blender4.3/blender-4.3.2-linux-x64.AppImage',
  '4e375ab838531980ee9f57a3e811c7fae98f02969b8219c490ff7a1c1d01931a',
  NULL,
  'Blender.AppImage',
  'appimage',
  NOW()
FROM public.app_versions av
JOIN public.apps a ON a.id = av.app_id
WHERE a.slug = 'blender' AND av.version = '4.3.2'
ON CONFLICT (version_id, architecture) DO NOTHING;


-- App: KeePassXC (keepassxc)
INSERT INTO public.apps (id, slug, name, short_description, description, category, license, website_url, source_url, icon_url, status, verified, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'keepassxc',
  'KeePassXC',
  'KeePassXC is a modern, secure, and open-source password manager that stores and manages your most sensitive information offline in an encrypted database using AES-256 and Argon2. You can safely save your logins, credit cards, TOTP 2FA token',
  'KeePassXC is a modern, secure, and open-source password manager that stores and manages your most sensitive information offline in an encrypted database using AES-256 and Argon2. You can safely save your logins, credit cards, TOTP 2FA tokens, and private notes.',
  'System/Utilities',
  'GPL-3.0',
  'https://github.com/keepassxreboot/keepassxc',
  'https://github.com/keepassxreboot/keepassxc',
  NULL,
  'published',
  FALSE,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  updated_at = NOW();


INSERT INTO public.app_versions (id, app_id, version, release_notes, release_date, status, created_at, updated_at)
SELECT
  gen_random_uuid(),
  a.id,
  '2.7.9',
  'Verified upstream AppImage release.',
  NOW(),
  'published',
  NOW(),
  NOW()
FROM public.apps a
WHERE a.slug = 'keepassxc'
ON CONFLICT (app_id, version, arch) DO NOTHING;


INSERT INTO public.app_assets (id, version_id, architecture, download_url, sha256, file_size, filename, asset_type, created_at)
SELECT
  gen_random_uuid(),
  av.id,
  'x86_64',
  'https://github.com/keepassxreboot/keepassxc/releases/download/2.7.9/KeePassXC-2.7.9-x86_64.AppImage',
  'e3057e9fe5b3da59f71297a73cb941ae1529177114b7e80f9353982e5b774656',
  NULL,
  'KeePassXC.AppImage',
  'appimage',
  NOW()
FROM public.app_versions av
JOIN public.apps a ON a.id = av.app_id
WHERE a.slug = 'keepassxc' AND av.version = '2.7.9'
ON CONFLICT (version_id, architecture) DO NOTHING;


-- App: Krita (krita)
INSERT INTO public.apps (id, slug, name, short_description, description, category, license, website_url, source_url, icon_url, status, verified, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'krita',
  'Krita',
  'Krita is a creative sketching and painting tool designed for concept artists, illustrators, matte and texture artists, and the VFX industry. It features over 100 professionally designed brushes, 9 brush engines, stabilizer support, and seam',
  'Krita is a creative sketching and painting tool designed for concept artists, illustrators, matte and texture artists, and the VFX industry. It features over 100 professionally designed brushes, 9 brush engines, stabilizer support, and seamless wrap-around pattern creation.',
  'Graphics',
  'GPL-3.0',
  'https://invent.kde.org/graphics/krita',
  'https://invent.kde.org/graphics/krita',
  NULL,
  'published',
  FALSE,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  updated_at = NOW();


INSERT INTO public.app_versions (id, app_id, version, release_notes, release_date, status, created_at, updated_at)
SELECT
  gen_random_uuid(),
  a.id,
  '5.2.6',
  'Verified upstream AppImage release.',
  NOW(),
  'published',
  NOW(),
  NOW()
FROM public.apps a
WHERE a.slug = 'krita'
ON CONFLICT (app_id, version, arch) DO NOTHING;


INSERT INTO public.app_assets (id, version_id, architecture, download_url, sha256, file_size, filename, asset_type, created_at)
SELECT
  gen_random_uuid(),
  av.id,
  'x86_64',
  'https://download.kde.org/stable/krita/5.2.6/krita-5.2.6-x86_64.appimage',
  'a17bc698a27d6d3381a179eef39a67e9f3b55c2bfdc93952d7ee46d034220b39',
  NULL,
  'Krita.AppImage',
  'appimage',
  NOW()
FROM public.app_versions av
JOIN public.apps a ON a.id = av.app_id
WHERE a.slug = 'krita' AND av.version = '5.2.6'
ON CONFLICT (version_id, architecture) DO NOTHING;


-- App: OBS Studio (obs-studio)
INSERT INTO public.apps (id, slug, name, short_description, description, category, license, website_url, source_url, icon_url, status, verified, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'obs-studio',
  'OBS Studio',
  'OBS Studio is the gold standard for live streaming and offline screen recording on Linux. It provides low-latency capture via PipeWire and X11, multi-view production monitors, hardware-accelerated video encoding (NVENC, VA-API, QuickSync), ',
  'OBS Studio is the gold standard for live streaming and offline screen recording on Linux. It provides low-latency capture via PipeWire and X11, multi-view production monitors, hardware-accelerated video encoding (NVENC, VA-API, QuickSync), and modular scene composition.',
  'Audio/Video',
  'GPL-2.0',
  'https://github.com/obsproject/obs-studio',
  'https://github.com/obsproject/obs-studio',
  NULL,
  'published',
  FALSE,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  updated_at = NOW();


INSERT INTO public.app_versions (id, app_id, version, release_notes, release_date, status, created_at, updated_at)
SELECT
  gen_random_uuid(),
  a.id,
  '31.0.1',
  'Verified upstream AppImage release.',
  NOW(),
  'published',
  NOW(),
  NOW()
FROM public.apps a
WHERE a.slug = 'obs-studio'
ON CONFLICT (app_id, version, arch) DO NOTHING;


INSERT INTO public.app_assets (id, version_id, architecture, download_url, sha256, file_size, filename, asset_type, created_at)
SELECT
  gen_random_uuid(),
  av.id,
  'x86_64',
  'https://github.com/obsproject/obs-studio/releases/download/31.0.1/OBS-Studio-31.0.1-Ubuntu-x86_64.AppImage',
  'c3d9a11fa3571d796791c530bb1507f352136067727e4c30c806509f6f663d12',
  NULL,
  'OBS_Studio.AppImage',
  'appimage',
  NOW()
FROM public.app_versions av
JOIN public.apps a ON a.id = av.app_id
WHERE a.slug = 'obs-studio' AND av.version = '31.0.1'
ON CONFLICT (version_id, architecture) DO NOTHING;


-- App: VSCodium (vscodium)
INSERT INTO public.apps (id, slug, name, short_description, description, category, license, website_url, source_url, icon_url, status, verified, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'vscodium',
  'VSCodium',
  'VSCodium provides binary releases of Microsoft''s Visual Studio Code built from the MIT-licensed vscode repository. It completely strips all proprietary telemetry, tracking, and proprietary license agreements, giving developers a privacy-res',
  'VSCodium provides binary releases of Microsoft''s Visual Studio Code built from the MIT-licensed vscode repository. It completely strips all proprietary telemetry, tracking, and proprietary license agreements, giving developers a privacy-respecting code editor with complete access to debugging, syntax highlighting, and extensions.',
  'Development',
  'MIT',
  'https://github.com/VSCodium/vscodium',
  'https://github.com/VSCodium/vscodium',
  NULL,
  'published',
  FALSE,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  updated_at = NOW();


INSERT INTO public.app_versions (id, app_id, version, release_notes, release_date, status, created_at, updated_at)
SELECT
  gen_random_uuid(),
  a.id,
  '1.96.2',
  'Verified upstream AppImage release.',
  NOW(),
  'published',
  NOW(),
  NOW()
FROM public.apps a
WHERE a.slug = 'vscodium'
ON CONFLICT (app_id, version, arch) DO NOTHING;


INSERT INTO public.app_assets (id, version_id, architecture, download_url, sha256, file_size, filename, asset_type, created_at)
SELECT
  gen_random_uuid(),
  av.id,
  'x86_64',
  'https://github.com/VSCodium/vscodium/releases/download/1.96.2.25015/VSCodium-1.96.2.25015.glibc2.28-x86_64.AppImage',
  '9f8b4618e28f3b2591b65b6a782b1c2a129037cba8b99c75620be2f627a3c748',
  NULL,
  'VSCodium.AppImage',
  'appimage',
  NOW()
FROM public.app_versions av
JOIN public.apps a ON a.id = av.app_id
WHERE a.slug = 'vscodium' AND av.version = '1.96.2'
ON CONFLICT (version_id, architecture) DO NOTHING;


-- App: Audacity (audacity)
INSERT INTO public.apps (id, slug, name, short_description, description, category, license, website_url, source_url, icon_url, status, verified, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'audacity',
  'Audacity',
  'Audacity is an easy-to-use, multi-track audio editor and recorder for Linux. Record live audio through a microphone or mixer, import sound files, edit them, combine them with other tracks, and apply extensive DSP audio effects.',
  'Audacity is an easy-to-use, multi-track audio editor and recorder for Linux. Record live audio through a microphone or mixer, import sound files, edit them, combine them with other tracks, and apply extensive DSP audio effects.',
  'Audio/Video',
  'GPL-3.0',
  'https://github.com/audacity/audacity',
  'https://github.com/audacity/audacity',
  NULL,
  'published',
  FALSE,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  updated_at = NOW();


INSERT INTO public.app_versions (id, app_id, version, release_notes, release_date, status, created_at, updated_at)
SELECT
  gen_random_uuid(),
  a.id,
  '3.7.1',
  'Verified upstream AppImage release.',
  NOW(),
  'published',
  NOW(),
  NOW()
FROM public.apps a
WHERE a.slug = 'audacity'
ON CONFLICT (app_id, version, arch) DO NOTHING;


INSERT INTO public.app_assets (id, version_id, architecture, download_url, sha256, file_size, filename, asset_type, created_at)
SELECT
  gen_random_uuid(),
  av.id,
  'x86_64',
  'https://github.com/audacity/audacity/releases/download/Audacity-3.7.1/audacity-linux-3.7.1-x64.AppImage',
  '4b68e919864ca078f44ff94d455ec3533ecf5ef7497d52f6bfa79f0ce6f66aa6',
  NULL,
  'Audacity.AppImage',
  'appimage',
  NOW()
FROM public.app_versions av
JOIN public.apps a ON a.id = av.app_id
WHERE a.slug = 'audacity' AND av.version = '3.7.1'
ON CONFLICT (version_id, architecture) DO NOTHING;


-- App: balenaEtcher (etcher)
INSERT INTO public.apps (id, slug, name, short_description, description, category, license, website_url, source_url, icon_url, status, verified, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'etcher',
  'balenaEtcher',
  'balenaEtcher is a powerful OS image flasher built with web technologies to ensure flashing SD Cards or USB drives is a pleasant and safe experience. It protects you from accidentally writing to your hard-drives, and ensures every byte of da',
  'balenaEtcher is a powerful OS image flasher built with web technologies to ensure flashing SD Cards or USB drives is a pleasant and safe experience. It protects you from accidentally writing to your hard-drives, and ensures every byte of data is written correctly.',
  'System/Utilities',
  'Apache-2.0',
  'https://github.com/balena-io/etcher',
  'https://github.com/balena-io/etcher',
  NULL,
  'published',
  FALSE,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  updated_at = NOW();


INSERT INTO public.app_versions (id, app_id, version, release_notes, release_date, status, created_at, updated_at)
SELECT
  gen_random_uuid(),
  a.id,
  '1.19.21',
  'Verified upstream AppImage release.',
  NOW(),
  'published',
  NOW(),
  NOW()
FROM public.apps a
WHERE a.slug = 'etcher'
ON CONFLICT (app_id, version, arch) DO NOTHING;


INSERT INTO public.app_assets (id, version_id, architecture, download_url, sha256, file_size, filename, asset_type, created_at)
SELECT
  gen_random_uuid(),
  av.id,
  'x86_64',
  'https://github.com/balena-io/etcher/releases/download/v1.19.21/balenaEtcher-1.19.21-x64.AppImage',
  '4b2e84c4e7fae29f8f4a13d80cb5f19001a1db6c1e345cb5774a38a9a202bc51',
  NULL,
  'balenaEtcher.AppImage',
  'appimage',
  NOW()
FROM public.app_versions av
JOIN public.apps a ON a.id = av.app_id
WHERE a.slug = 'etcher' AND av.version = '1.19.21'
ON CONFLICT (version_id, architecture) DO NOTHING;


-- App: FreeCAD (freecad)
INSERT INTO public.apps (id, slug, name, short_description, description, category, license, website_url, source_url, icon_url, status, verified, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'freecad',
  'FreeCAD',
  'FreeCAD is an open-source parametric 3D modeler made primarily to design real-life objects of any size. Parametric modeling allows you to easily modify your design by going back into your model history and changing its parameters.',
  'FreeCAD is an open-source parametric 3D modeler made primarily to design real-life objects of any size. Parametric modeling allows you to easily modify your design by going back into your model history and changing its parameters.',
  'Graphics',
  'LGPL-2.1',
  'https://github.com/FreeCAD/FreeCAD',
  'https://github.com/FreeCAD/FreeCAD',
  NULL,
  'published',
  FALSE,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  updated_at = NOW();


INSERT INTO public.app_versions (id, app_id, version, release_notes, release_date, status, created_at, updated_at)
SELECT
  gen_random_uuid(),
  a.id,
  '1.0.0',
  'Verified upstream AppImage release.',
  NOW(),
  'published',
  NOW(),
  NOW()
FROM public.apps a
WHERE a.slug = 'freecad'
ON CONFLICT (app_id, version, arch) DO NOTHING;


INSERT INTO public.app_assets (id, version_id, architecture, download_url, sha256, file_size, filename, asset_type, created_at)
SELECT
  gen_random_uuid(),
  av.id,
  'x86_64',
  'https://github.com/FreeCAD/FreeCAD/releases/download/1.0.0/FreeCAD_1.0.0-conda-Linux-x86_64-py311.AppImage',
  '7a35e80f930ad178229ef9fa48419615a97dd5f76b5cf849a9ea43a1a681ce4e',
  NULL,
  'FreeCAD.AppImage',
  'appimage',
  NOW()
FROM public.app_versions av
JOIN public.apps a ON a.id = av.app_id
WHERE a.slug = 'freecad' AND av.version = '1.0.0'
ON CONFLICT (version_id, architecture) DO NOTHING;


-- App: FreeTube (freetube)
INSERT INTO public.apps (id, slug, name, short_description, description, category, license, website_url, source_url, icon_url, status, verified, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'freetube',
  'FreeTube',
  'FreeTube is a YouTube client for Windows, Mac, and Linux built to let you use YouTube more privately. You can subscribe to creators without an account, block ads, and prevent Google from tracking you with cookies and JavaScript.',
  'FreeTube is a YouTube client for Windows, Mac, and Linux built to let you use YouTube more privately. You can subscribe to creators without an account, block ads, and prevent Google from tracking you with cookies and JavaScript.',
  'Audio/Video',
  'GPL-3.0',
  'https://github.com/FreeTubeApp/FreeTube',
  'https://github.com/FreeTubeApp/FreeTube',
  NULL,
  'published',
  FALSE,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  updated_at = NOW();


INSERT INTO public.app_versions (id, app_id, version, release_notes, release_date, status, created_at, updated_at)
SELECT
  gen_random_uuid(),
  a.id,
  '0.25.3',
  'Verified upstream AppImage release.',
  NOW(),
  'published',
  NOW(),
  NOW()
FROM public.apps a
WHERE a.slug = 'freetube'
ON CONFLICT (app_id, version, arch) DO NOTHING;


INSERT INTO public.app_assets (id, version_id, architecture, download_url, sha256, file_size, filename, asset_type, created_at)
SELECT
  gen_random_uuid(),
  av.id,
  'x86_64',
  'https://github.com/FreeTubeApp/FreeTube/releases/download/v0.25.3-beta/freetube_0.25.3_amd64.AppImage',
  '38a16dbb7c0ceefbc1c7ce6ad260c675ef7a02c3efc1746c1a1fa930fc495632',
  NULL,
  'FreeTube.AppImage',
  'appimage',
  NOW()
FROM public.app_versions av
JOIN public.apps a ON a.id = av.app_id
WHERE a.slug = 'freetube' AND av.version = '0.25.3'
ON CONFLICT (version_id, architecture) DO NOTHING;


-- App: GIMP (gimp)
INSERT INTO public.apps (id, slug, name, short_description, description, category, license, website_url, source_url, icon_url, status, verified, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'gimp',
  'GIMP',
  'GIMP is a cross-platform image editor available for Linux. Whether you are a graphic designer, photographer, illustrator, or scientist, GIMP provides you with sophisticated tools to get your job done with high quality photo manipulation and',
  'GIMP is a cross-platform image editor available for Linux. Whether you are a graphic designer, photographer, illustrator, or scientist, GIMP provides you with sophisticated tools to get your job done with high quality photo manipulation and original artwork creation.',
  'Graphics',
  'GPL-3.0',
  'https://gitlab.gnome.org/GNOME/gimp',
  'https://gitlab.gnome.org/GNOME/gimp',
  NULL,
  'published',
  FALSE,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  updated_at = NOW();


INSERT INTO public.app_versions (id, app_id, version, release_notes, release_date, status, created_at, updated_at)
SELECT
  gen_random_uuid(),
  a.id,
  '2.10.38',
  'Verified upstream AppImage release.',
  NOW(),
  'published',
  NOW(),
  NOW()
FROM public.apps a
WHERE a.slug = 'gimp'
ON CONFLICT (app_id, version, arch) DO NOTHING;


INSERT INTO public.app_assets (id, version_id, architecture, download_url, sha256, file_size, filename, asset_type, created_at)
SELECT
  gen_random_uuid(),
  av.id,
  'x86_64',
  'https://github.com/aferrero2707/gimp-appimage/releases/download/continuous/GIMP_AppImage-release-2.10.38-withplugins-x86_64.AppImage',
  '16ce6f112e4be8c642646ea8c857732adfb2a3449303666d403efcce360dbbcf',
  NULL,
  'GIMP.AppImage',
  'appimage',
  NOW()
FROM public.app_versions av
JOIN public.apps a ON a.id = av.app_id
WHERE a.slug = 'gimp' AND av.version = '2.10.38'
ON CONFLICT (version_id, architecture) DO NOTHING;


-- App: HandBrake (handbrake)
INSERT INTO public.apps (id, slug, name, short_description, description, category, license, website_url, source_url, icon_url, status, verified, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'handbrake',
  'HandBrake',
  'HandBrake is a tool for converting video from nearly any format to a selection of modern, widely supported codecs. It supports hardware encoding via Intel QSV, AMD VCN, and NVIDIA NVENC alongside high quality software encoders.',
  'HandBrake is a tool for converting video from nearly any format to a selection of modern, widely supported codecs. It supports hardware encoding via Intel QSV, AMD VCN, and NVIDIA NVENC alongside high quality software encoders.',
  'Audio/Video',
  'GPL-2.0',
  'https://github.com/HandBrake/HandBrake',
  'https://github.com/HandBrake/HandBrake',
  NULL,
  'published',
  FALSE,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  updated_at = NOW();


INSERT INTO public.app_versions (id, app_id, version, release_notes, release_date, status, created_at, updated_at)
SELECT
  gen_random_uuid(),
  a.id,
  '1.9.0',
  'Verified upstream AppImage release.',
  NOW(),
  'published',
  NOW(),
  NOW()
FROM public.apps a
WHERE a.slug = 'handbrake'
ON CONFLICT (app_id, version, arch) DO NOTHING;


INSERT INTO public.app_assets (id, version_id, architecture, download_url, sha256, file_size, filename, asset_type, created_at)
SELECT
  gen_random_uuid(),
  av.id,
  'x86_64',
  'https://github.com/HandBrake/HandBrake/releases/download/1.9.0/HandBrake-1.9.0-x86_64.AppImage',
  '3491f03f5ad676994a5a54fe59a4bb3ef06093d939634fa68b9195eeb00d046c',
  NULL,
  'HandBrake.AppImage',
  'appimage',
  NOW()
FROM public.app_versions av
JOIN public.apps a ON a.id = av.app_id
WHERE a.slug = 'handbrake' AND av.version = '1.9.0'
ON CONFLICT (version_id, architecture) DO NOTHING;


-- App: Inkscape (inkscape)
INSERT INTO public.apps (id, slug, name, short_description, description, category, license, website_url, source_url, icon_url, status, verified, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'inkscape',
  'Inkscape',
  'Inkscape is a professional quality vector graphics software which runs on Linux. It is used by design professionals and hobbyists worldwide for creating a wide variety of graphics such as illustrations, icons, logos, diagrams, maps, and web',
  'Inkscape is a professional quality vector graphics software which runs on Linux. It is used by design professionals and hobbyists worldwide for creating a wide variety of graphics such as illustrations, icons, logos, diagrams, maps, and web graphics.',
  'Graphics',
  'GPL-3.0',
  'https://gitlab.com/inkscape/inkscape',
  'https://gitlab.com/inkscape/inkscape',
  NULL,
  'published',
  FALSE,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  updated_at = NOW();


INSERT INTO public.app_versions (id, app_id, version, release_notes, release_date, status, created_at, updated_at)
SELECT
  gen_random_uuid(),
  a.id,
  '1.4.0',
  'Verified upstream AppImage release.',
  NOW(),
  'published',
  NOW(),
  NOW()
FROM public.apps a
WHERE a.slug = 'inkscape'
ON CONFLICT (app_id, version, arch) DO NOTHING;


INSERT INTO public.app_assets (id, version_id, architecture, download_url, sha256, file_size, filename, asset_type, created_at)
SELECT
  gen_random_uuid(),
  av.id,
  'x86_64',
  'https://media.inkscape.org/dl/resources/file/Inkscape-e7c3feb-x86_64.AppImage',
  'bb3c2b87f46ad61517c5eb87a55cbb661cf6a53696f8c79c855a8dc65b4cbf4d',
  NULL,
  'Inkscape.AppImage',
  'appimage',
  NOW()
FROM public.app_versions av
JOIN public.apps a ON a.id = av.app_id
WHERE a.slug = 'inkscape' AND av.version = '1.4.0'
ON CONFLICT (version_id, architecture) DO NOTHING;


-- App: Joplin (joplin)
INSERT INTO public.apps (id, slug, name, short_description, description, category, license, website_url, source_url, icon_url, status, verified, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'joplin',
  'Joplin',
  'Joplin is an open source note taking and to-do application, which can handle a large number of notes organized into notebooks. The notes are searchable, can be copied, tagged and modified with full Markdown formatting and math equations.',
  'Joplin is an open source note taking and to-do application, which can handle a large number of notes organized into notebooks. The notes are searchable, can be copied, tagged and modified with full Markdown formatting and math equations.',
  'Office',
  'AGPL-3.0',
  'https://github.com/laurent22/joplin',
  'https://github.com/laurent22/joplin',
  NULL,
  'published',
  FALSE,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  updated_at = NOW();


INSERT INTO public.app_versions (id, app_id, version, release_notes, release_date, status, created_at, updated_at)
SELECT
  gen_random_uuid(),
  a.id,
  '3.2.11',
  'Verified upstream AppImage release.',
  NOW(),
  'published',
  NOW(),
  NOW()
FROM public.apps a
WHERE a.slug = 'joplin'
ON CONFLICT (app_id, version, arch) DO NOTHING;


INSERT INTO public.app_assets (id, version_id, architecture, download_url, sha256, file_size, filename, asset_type, created_at)
SELECT
  gen_random_uuid(),
  av.id,
  'x86_64',
  'https://github.com/laurent22/joplin/releases/download/v3.2.11/Joplin-3.2.11.AppImage',
  '4392815777894a8c903fa6eb7c04ff8dfab06e7887258fe536da4dc12521c7fa',
  NULL,
  'Joplin.AppImage',
  'appimage',
  NOW()
FROM public.app_versions av
JOIN public.apps a ON a.id = av.app_id
WHERE a.slug = 'joplin' AND av.version = '3.2.11'
ON CONFLICT (version_id, architecture) DO NOTHING;


-- App: Kdenlive (kdenlive)
INSERT INTO public.apps (id, slug, name, short_description, description, category, license, website_url, source_url, icon_url, status, verified, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'kdenlive',
  'Kdenlive',
  'Kdenlive is an acronym for KDE Non-Linear Video Editor. It is a powerful multi-track video editor that supports almost all audio and video formats via FFmpeg, with keyframe animation, proxy editing, auto-subtitling with Whisper AI, and colo',
  'Kdenlive is an acronym for KDE Non-Linear Video Editor. It is a powerful multi-track video editor that supports almost all audio and video formats via FFmpeg, with keyframe animation, proxy editing, auto-subtitling with Whisper AI, and color grading.',
  'Audio/Video',
  'GPL-3.0',
  'https://invent.kde.org/multimedia/kdenlive',
  'https://invent.kde.org/multimedia/kdenlive',
  NULL,
  'published',
  FALSE,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  updated_at = NOW();


INSERT INTO public.app_versions (id, app_id, version, release_notes, release_date, status, created_at, updated_at)
SELECT
  gen_random_uuid(),
  a.id,
  '24.12.1',
  'Verified upstream AppImage release.',
  NOW(),
  'published',
  NOW(),
  NOW()
FROM public.apps a
WHERE a.slug = 'kdenlive'
ON CONFLICT (app_id, version, arch) DO NOTHING;


INSERT INTO public.app_assets (id, version_id, architecture, download_url, sha256, file_size, filename, asset_type, created_at)
SELECT
  gen_random_uuid(),
  av.id,
  'x86_64',
  'https://download.kde.org/stable/kdenlive/24.12/linux/kdenlive-24.12.1-x86_64.AppImage',
  'df06e6bf4710166299b9cf95924716900ee123f990ad312ba30c5e6319c5c76c',
  NULL,
  'Kdenlive.AppImage',
  'appimage',
  NOW()
FROM public.app_versions av
JOIN public.apps a ON a.id = av.app_id
WHERE a.slug = 'kdenlive' AND av.version = '24.12.1'
ON CONFLICT (version_id, architecture) DO NOTHING;


-- App: SuperTuxKart (supertuxkart)
INSERT INTO public.apps (id, slug, name, short_description, description, category, license, website_url, source_url, icon_url, status, verified, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'supertuxkart',
  'SuperTuxKart',
  'SuperTuxKart is a 3D open-source arcade racing game featuring mascot characters of various free software projects. Race through tracks against AI or friends in local split-screen or networked multiplayer battle arenas.',
  'SuperTuxKart is a 3D open-source arcade racing game featuring mascot characters of various free software projects. Race through tracks against AI or friends in local split-screen or networked multiplayer battle arenas.',
  'Games',
  'GPL-3.0',
  'https://github.com/supertuxkart/stk-code',
  'https://github.com/supertuxkart/stk-code',
  NULL,
  'published',
  FALSE,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  updated_at = NOW();


INSERT INTO public.app_versions (id, app_id, version, release_notes, release_date, status, created_at, updated_at)
SELECT
  gen_random_uuid(),
  a.id,
  '1.4.0',
  'Verified upstream AppImage release.',
  NOW(),
  'published',
  NOW(),
  NOW()
FROM public.apps a
WHERE a.slug = 'supertuxkart'
ON CONFLICT (app_id, version, arch) DO NOTHING;


INSERT INTO public.app_assets (id, version_id, architecture, download_url, sha256, file_size, filename, asset_type, created_at)
SELECT
  gen_random_uuid(),
  av.id,
  'x86_64',
  'https://github.com/supertuxkart/stk-code/releases/download/v1.4/SuperTuxKart-1.4-linux-x86_64.AppImage',
  '61a7a0301a2f6ca46e919ff72ca4cba799307779b9ba1b42602161f3eb129759',
  NULL,
  'SuperTuxKart.AppImage',
  'appimage',
  NOW()
FROM public.app_versions av
JOIN public.apps a ON a.id = av.app_id
WHERE a.slug = 'supertuxkart' AND av.version = '1.4.0'
ON CONFLICT (version_id, architecture) DO NOTHING;


COMMIT;
