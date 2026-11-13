/* DOM integration tests. These do not measure browser layout or visual appearance. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');
const root = path.resolve(__dirname, '..');
class LocalResources extends ResourceLoader {
  fetch(url) {
    const parsed = new URL(url);
    if (parsed.origin !== 'https://sentimentalarse.github.io') return Promise.resolve(Buffer.from(''));
    return Promise.resolve(fs.readFileSync(path.join(root, decodeURIComponent(parsed.pathname))));
  }
}
async function open(file, failure) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error.message));
  virtualConsole.on('error', error => errors.push(String(error)));
  const dom = new JSDOM(fs.readFileSync(path.join(root, file), 'utf8'), {
    url: 'https://sentimentalarse.github.io/' + file,
    runScripts: 'dangerously', resources: new LocalResources(), virtualConsole,
    beforeParse(window) {
      // SVG label wrapping needs a browser measurement; approximate only for DOM tests.
      window.SVGElement.prototype.getComputedTextLength = function () { return this.textContent.length * 6; };
      window.XMLHttpRequest = class {
        constructor() { this.onload = null; this.onerror = null; this.status = 0; }
        open(method, url) { this.url = new URL(url, window.location.href); }
        setRequestHeader() {}
        overrideMimeType() {}
        send() {
          window.setTimeout(() => {
            if (failure && this.url.pathname.endsWith(failure)) {
              this.status = 404; this.onerror(new Error('Missing test fixture')); return;
            }
            try {
              this.responseText = fs.readFileSync(path.join(root, decodeURIComponent(this.url.pathname)), 'utf8');
              this.status = 200;
            } catch (error) { this.status = 404; this.onerror(error); return; }
            this.onload();
          }, 0);
        }
        abort() {}
      };
    }
  });
  await new Promise(resolve => dom.window.addEventListener('load', resolve, {once: true}));
  for (let i = 0; i < 100; i++) {
    const statuses = [...dom.window.document.querySelectorAll('.chart-status')];
    if (statuses.length && statuses.every(node => !node.textContent.startsWith('Loading '))) break;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.deepEqual(errors, [], file + ': unexpected runtime errors');
  return dom;
}
(async () => {
  const cases = [
    ['heatmap-of-all-the-arsenal-league-games.html', 1, 'data/arsenal-results.csv'],
    ['points-per-game-in-top-european-football-leagues-2015-2016.html', 1, 'data/combined.csv'],
    ['interseasonal-rank-mobility-in-english-premier-league-2000-2015.html', 3, 'data/eplrankchange.csv'],
    ['visualizing-arsenal-players-stats-using-radar-chart.html', 1, 'data/ars/attr.json']
  ];
  for (const [file, tables, data] of cases) {
    const dom = await open(file);
    const doc = dom.window.document;
    assert.equal(doc.querySelectorAll('.chart-error').length, 0, file);
    assert.equal(doc.querySelectorAll('.data-table').length, tables, file);
    assert.ok(doc.querySelector('svg[viewBox]'), file + ': chart rendered');
    const ids = [...doc.querySelectorAll('[id]')].map(node => node.id);
    assert.equal(new Set(ids).size, ids.length, file + ': unique IDs');
    const detail = doc.querySelector('.data-table');
    const buttons = detail.querySelectorAll('button');
    if (!buttons[1].disabled) {
      buttons[1].click();
      assert.match(detail.querySelector('[aria-live]').textContent, /Records 51/);
      buttons[0].click();
      assert.match(detail.querySelector('[aria-live]').textContent, /Records 1–/);
    }
    if (file.startsWith('points-')) {
      assert.equal(doc.querySelectorAll('#chart image').length, 5, 'one flag per country');
      const mark = doc.querySelector('#chart circle');
      mark.dispatchEvent(new dom.window.KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
      assert.match(doc.querySelector('#chart-selection').textContent, /points per game/);
    }
    if (file.startsWith('heatmap-')) {
      const count = fs.readFileSync(path.join(root, data), 'utf8').trim().split('\n').length - 1;
      assert.equal(doc.querySelectorAll('#chart rect').length, count);
      doc.querySelector('#chart rect').dispatchEvent(new dom.window.MouseEvent('click', {bubbles: true}));
      assert.match(doc.querySelector('#chart-selection').textContent, /Arsenal vs/);
    }
    if (file.startsWith('interseasonal-')) {
      const button = doc.querySelector('#chart .box');
      button.dispatchEvent(new dom.window.KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
      const rows = [...doc.querySelectorAll('#rank-detail-table tbody tr')];
      assert.ok(rows.length);
      assert.ok(rows.every(row => row.cells[0].textContent === '1'), 'keyboard rank filtering');
    }
    if (file.startsWith('visualizing-')) {
      assert.equal(doc.querySelectorAll('.chart-container').length, 20, 'all outfield players rendered');
      assert.match(doc.querySelector('#midfielders').textContent, /Alex Iwobi/, 'position-based grouping includes last player');
    }
    dom.window.close();
    const broken = await open(file, data);
    assert.match(broken.window.document.querySelector('.chart-error').textContent, /Unable to load/);
    assert.equal(broken.window.document.querySelectorAll('.chart-status').length, tables);
    broken.window.close();
    console.log('PASS rendering, data alternatives, and failed request:', file);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
