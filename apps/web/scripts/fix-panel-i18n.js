const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '../src/locales');

const panel = JSON.parse(fs.readFileSync(path.join(__dirname, 'panel-en.json'), 'utf8'));
const nePanel = JSON.parse(fs.readFileSync(path.join(__dirname, 'panel-ne.json'), 'utf8'));

for (const lng of ['en', 'ne', 'hi', 'es', 'fr', 'de', 'zh']) {
  const p = path.join(dir, lng, 'common.json');
  let raw = fs.readFileSync(p, 'utf8');
  if (raw.endsWith('}\\n') || raw.includes('}\\n')) {
    raw = raw.replace(/}\\n\s*$/, '}');
  }
  const j = JSON.parse(raw);
  j.panel = lng === 'ne' ? nePanel : panel;
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
  JSON.parse(fs.readFileSync(p, 'utf8'));
  console.log('fixed', lng);
}
