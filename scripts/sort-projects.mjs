import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const projectsDir = path.join(root, 'src/content/projects/en');
const publicDir = path.join(root, 'public');
const PORT = 4322; // astro dev uses 4321

async function readProjects() {
  const files = (await fs.readdir(projectsDir)).filter((f) => f.endsWith('.md'));
  const projects = [];
  for (const file of files) {
    const raw = await fs.readFile(path.join(projectsDir, file), 'utf8');
    const slug = file.replace(/\.md$/, '');
    const title = raw.match(/^title:\s*(.+)$/m)?.[1]?.trim() ?? slug;
    const cover = raw.match(/^cover:\s*(.+)$/m)?.[1]?.trim() ?? '';
    const order = Number(raw.match(/^order:\s*(\d+)$/m)?.[1] ?? 0);
    const featured = raw.match(/^featured:\s*(true|false)$/m)?.[1] === 'true';
    projects.push({ slug, title, cover, order, featured });
  }
  projects.sort((a, b) => a.order - b.order);
  return projects;
}

function renderPage(projects) {
  const rows = projects
    .map(
      (p) => `
    <li class="row" draggable="true" data-slug="${p.slug}">
      <span class="handle">&#9776;</span>
      <img src="${p.cover}" alt="" />
      <span class="title">${p.title}</span>
      <label class="featured">
        <input type="checkbox" ${p.featured ? 'checked' : ''} />
        featured
      </label>
    </li>`
    )
    .join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Sort projects</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto; background: #111; color: #eee; }
  h1 { font-size: 1.2rem; }
  ul { list-style: none; padding: 0; }
  .row { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem; margin-bottom: 0.4rem; background: #1c1c1c; border-radius: 8px; cursor: grab; }
  .row.dragging { opacity: 0.4; }
  .row img { width: 48px; height: 48px; object-fit: cover; border-radius: 6px; background: #333; }
  .title { flex: 1; }
  .featured { display: flex; align-items: center; gap: 0.3rem; font-size: 0.85rem; color: #aaa; }
  .handle { color: #666; }
  button { margin-top: 1rem; padding: 0.6rem 1.2rem; font-size: 1rem; cursor: pointer; }
  #status { margin-left: 1rem; color: #8f8; }
</style>
</head>
<body>
  <h1>Drag to reorder projects</h1>
  <ul id="list">${rows}</ul>
  <button id="save">Save</button>
  <span id="status"></span>
  <script>
    const list = document.getElementById('list');
    let dragEl = null;
    list.addEventListener('dragstart', (e) => {
      dragEl = e.target.closest('.row');
      dragEl.classList.add('dragging');
    });
    list.addEventListener('dragend', () => dragEl?.classList.remove('dragging'));
    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      const after = [...list.querySelectorAll('.row:not(.dragging)')].find((row) => {
        const box = row.getBoundingClientRect();
        return e.clientY < box.top + box.height / 2;
      });
      if (after) list.insertBefore(dragEl, after);
      else list.appendChild(dragEl);
    });

    document.getElementById('save').addEventListener('click', async () => {
      const rows = [...list.querySelectorAll('.row')];
      const order = rows.map((r) => r.dataset.slug);
      const featured = {};
      rows.forEach((r) => {
        featured[r.dataset.slug] = r.querySelector('input').checked;
      });
      const status = document.getElementById('status');
      status.textContent = 'Saving...';
      const res = await fetch('/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order, featured }),
      });
      status.textContent = res.ok ? 'Saved!' : 'Failed to save.';
    });
  </script>
</body>
</html>`;
}

async function saveOrder(body) {
  const { order, featured } = JSON.parse(body);
  const files = await fs.readdir(projectsDir);
  for (let i = 0; i < order.length; i++) {
    const slug = order[i];
    const file = files.find((f) => f === `${slug}.md`);
    if (!file) continue;
    const filePath = path.join(projectsDir, file);
    let raw = await fs.readFile(filePath, 'utf8');
    raw = raw.replace(/^order:\s*\d+$/m, `order: ${i + 1}`);
    raw = raw.replace(/^featured:\s*(true|false)$/m, `featured: ${Boolean(featured[slug])}`);
    await fs.writeFile(filePath, raw, 'utf8');
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/') {
      const projects = await readProjects();
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(renderPage(projects));
      return;
    }

    if (req.method === 'GET' && req.url.startsWith('/assets/')) {
      const filePath = path.join(publicDir, decodeURIComponent(req.url));
      const data = await fs.readFile(filePath);
      res.writeHead(200);
      res.end(data);
      return;
    }

    if (req.method === 'POST' && req.url === '/save') {
      let body = '';
      for await (const chunk of req) body += chunk;
      await saveOrder(body);
      res.writeHead(200);
      res.end('ok');
      return;
    }

    res.writeHead(404);
    res.end('not found');
  } catch (err) {
    res.writeHead(500);
    res.end(String(err));
  }
});

// 127.0.0.1 only: the page can write to your files, so keep it private
server.listen(PORT, '127.0.0.1', () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Sort projects UI: ${url}`);
  spawn(process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open', process.platform === 'win32' ? ['/c', 'start', url] : [url], { stdio: 'ignore', detached: true }).unref();
});
