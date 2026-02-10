const content = document.getElementById('content');
const title = document.getElementById('title');

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }

    if (char === '\r') {
      if (next === '\n') {
        continue;
      }
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function groupHints(rows) {
  if (rows.length === 0) return [];
  const header = rows[0];
  const puzzleIndex = header.indexOf('謎');
  const stageIndex = header.indexOf('ヒント段階');
  const hintIndex = header.indexOf('ヒント');

  const groups = new Map();

  rows.slice(1).forEach((row) => {
    if (!row.length) return;
    const puzzle = row[puzzleIndex]?.trim();
    const stage = row[stageIndex]?.trim();
    const hint = row[hintIndex]?.trim();
    if (!puzzle || !stage || !hint) return;

    if (!groups.has(puzzle)) {
      groups.set(puzzle, []);
    }

    groups.get(puzzle).push({ stage, hint });
  });

  return Array.from(groups.entries()).map(([title, hints]) => ({ title, hints }));
}

function buildCard(group) {
  const card = document.createElement('details');
  card.className = 'card';

  const summary = document.createElement('summary');
  summary.textContent = group.title;

  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.textContent = `${group.hints.length} 件`;
  summary.appendChild(badge);

  card.appendChild(summary);

  const hintsContainer = document.createElement('div');
  hintsContainer.className = 'hints';

  const answer = group.hints.find((item) => item.stage === '答え');
  const hintItems = group.hints.filter((item) => item.stage !== '答え');

  hintItems.forEach((item) => {
    const hintDetails = document.createElement('details');
    hintDetails.className = 'hint';

    const hintSummary = document.createElement('summary');
    hintSummary.textContent = `ヒント ${item.stage}`;

    const hintBody = document.createElement('p');
    hintBody.textContent = item.hint;

    hintDetails.appendChild(hintSummary);
    hintDetails.appendChild(hintBody);
    hintsContainer.appendChild(hintDetails);
  });

  if (answer) {
    const answerDetails = document.createElement('details');
    answerDetails.className = 'hint';

    const answerSummary = document.createElement('summary');
    answerSummary.textContent = '答え';

    const answerBody = document.createElement('div');
    answerBody.className = 'answer';
    answerBody.innerHTML = `<strong>答え:</strong> ${answer.hint}`;

    answerDetails.appendChild(answerSummary);
    answerDetails.appendChild(answerBody);
    hintsContainer.appendChild(answerDetails);
  }

  card.appendChild(hintsContainer);
  card.dataset.search = [group.title, ...group.hints.map((h) => h.hint)].join(' ').toLowerCase();

  return card;
}

function render(groups) {
  content.innerHTML = '';

  if (groups.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'loading';
    empty.textContent = 'ヒントが見つかりませんでした。';
    content.appendChild(empty);
    return;
  }

  groups.forEach((group) => {
    content.appendChild(buildCard(group));
  });
}

function splitGroups(groups, hiddenTitle) {
  const visible = [];
  let hidden = null;

  groups.forEach((group) => {
    if (group.title === hiddenTitle) {
      hidden = group;
      return;
    }
    visible.push(group);
  });

  return { visible, hidden };
}


async function init() {
  try {
    const response = await fetch('./hints.csv');
    if (!response.ok) throw new Error('fetch failed');
    const text = await response.text();
    const rows = parseCSV(text);
    const groups = groupHints(rows);
    const hiddenTitle = 'お色直しが終わった後';
    const { visible, hidden } = splitGroups(groups, hiddenTitle);
    render(visible);

    if (hidden && title) {
      let clicks = 0;
      let revealed = false;

      title.addEventListener('click', () => {
        if (revealed) return;
        clicks += 1;
        if (clicks < 5) return;
        revealed = true;
        content.appendChild(buildCard(hidden));
        window.alert('追加ヒントが公開されました。');
      });
    }
  } catch (error) {
    content.innerHTML = '<div class="loading">読み込みに失敗しました。</div>';
  }
}

init();
