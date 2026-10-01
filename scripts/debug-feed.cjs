const fs = require('fs');

const feed = require('../feed.json');
const items = feed.items ? feed.items : feed;

console.log(`Loaded ${items.length} apps from feed.`);

// Debugging: analyze categories
const categories = new Set();
let noLinks = 0;
let missingGithub = 0;

items.forEach(app => {
  if (app.categories) {
    app.categories.forEach(c => categories.add(c));
  }
  if (!app.links || app.links.length === 0) {
    noLinks++;
  } else {
    const gh = app.links.find(l => l.type === 'GitHub');
    if (!gh) missingGithub++;
  }
});

console.log('\n--- Feed Debug Stats ---');
console.log(`Unique categories found: ${categories.size}`);
console.log(`Apps missing links entirely: ${noLinks}`);
console.log(`Apps missing GitHub links: ${missingGithub}`);
console.log('Categories list:', Array.from(categories).join(', '));
