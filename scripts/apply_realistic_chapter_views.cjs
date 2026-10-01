const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_STORE_PATH = path.join(ROOT_DIR, 'data_store.json');

if (!fs.existsSync(DATA_STORE_PATH)) {
  console.error('data_store.json not found!');
  process.exit(1);
}

const store = JSON.parse(fs.readFileSync(DATA_STORE_PATH, 'utf8'));
const comics = store.comics || [];

console.log(`Loaded ${comics.length} comics from data_store.json.`);

function getHashFactor(str) {
  let h = 0;
  for (let k = 0; k < str.length; k++) {
    h = (Math.imul(31, h) + str.charCodeAt(k)) | 0;
  }
  const norm = ((Math.abs(h) % 1000) / 1000) * 0.12 - 0.06;
  return 1 + norm;
}

function distributeChapterViews(c) {
  const chapters = c.chapters || [];
  const N = chapters.length;
  if (N === 0) return;
  if (N === 1) {
    chapters[0].views = Math.max(1, c.views || 100);
    return;
  }

  let totalViews = typeof c.views === 'number' && !isNaN(c.views) ? c.views : 500;
  if (totalViews < N * 15) {
    totalViews = Math.max(totalViews, N * 25);
    c.views = totalViews;
  }

  // Weight according to chapter progression: earlier chapters have higher retention
  const weights = [];
  for (let i = 1; i <= N; i++) {
    let base = 1 / Math.pow(i, 0.32);
    let recency = 1;
    if (N >= 5) {
      if (i === N) recency = 0.72;
      else if (i === N - 1) recency = 0.82;
      else if (i === N - 2) recency = 0.90;
    }
    const hash = getHashFactor((c.slug || c.id || 'comic') + '-' + i);
    weights.push(base * recency * hash);
  }

  const sumWeights = weights.reduce((a, b) => a + b, 0);
  const allocated = weights.map((w) => Math.max(1, Math.round(totalViews * (w / sumWeights))));

  let currentSum = allocated.reduce((a, b) => a + b, 0);
  let diff = totalViews - currentSum;

  let idx = 0;
  while (diff !== 0 && idx < N) {
    const step = diff > 0 ? 1 : -1;
    if (allocated[idx] + step >= 1) {
      allocated[idx] += step;
      diff -= step;
    }
    idx = (idx + 1) % N;
  }

  chapters.forEach((ch, i) => {
    ch.views = allocated[i];
  });
}

let totalChaptersCount = 0;
comics.forEach((c) => {
  distributeChapterViews(c);
  totalChaptersCount += (c.chapters || []).length;
});

fs.writeFileSync(DATA_STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
console.log(`Successfully distributed realistic chapter views across ${comics.length} comics and ${totalChaptersCount} chapters.`);
