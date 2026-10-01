import fs from 'fs';
import path from 'path';

const catalogDir = path.join(process.cwd(), 'catalog', 'apps');
const files = fs.readdirSync(catalogDir).filter((f) => f.endsWith('.json'));

for (const file of files) {
  const filePath = path.join(catalogDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  // Ensure repositoryUrl, releasesUrl, sourceType, officialStatus
  if (!data.repository && data.repositoryUrl) {
    data.repository = data.repositoryUrl;
  }
  if (!data.repositoryUrl && data.repository) {
    data.repositoryUrl = data.repository;
  }
  if (!data.releasesUrl && data.repository) {
    data.releasesUrl = `${data.repository.replace(/\/$/, '')}/releases`;
  }
  if (!data.sourceType) {
    data.sourceType = data.developer?.toLowerCase().includes('community') ? 'Community' : 'Official';
  }
  if (data.officialStatus === undefined) {
    data.officialStatus = data.sourceType === 'Official';
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

console.log(`Updated all ${files.length} catalog JSON files with complete repository & release metadata!`);
