// Cockpit UI core: Mat4Panel (4x4 matrix readout) + SliderRow (labeled range
// input). Vanilla DOM, no framework, no rAF. Displays are the only state.

/**
 * Mat4Panel(container, {rowClasses})
 * Renders a 4x4 table in ROW-MAJOR reading order from a column-major 16-array:
 * displayed row i, col j = colMajor16[j*4 + i]. rowClasses[i] is applied to
 * table row i (conventionally [row-u, row-v, row-w, row-h]).
 */
export class Mat4Panel {
  constructor(container, { rowClasses = ['row-u', 'row-v', 'row-w', 'row-h'] } = {}) {
    this.rowClasses = rowClasses;
    this.table = document.createElement('table');
    this.table.className = 'mat-panel';
    this.cells = [];

    const tbody = document.createElement('tbody');
    for (let i = 0; i < 4; i++) {
      const tr = document.createElement('tr');
      tr.className = rowClasses[i] ?? '';
      const rowCells = [];
      for (let j = 0; j < 4; j++) {
        const td = document.createElement('td');
        td.dataset.r = String(i);
        td.dataset.c = String(j);
        td.textContent = (i === j ? 1 : 0).toFixed(2);
        tr.appendChild(td);
        rowCells.push(td);
      }
      tbody.appendChild(tr);
      this.cells.push(rowCells);
    }
    this.table.appendChild(tbody);
    container.appendChild(this.table);
  }

  /** update(colMajor16): refresh all 16 cells from a column-major 16-array. */
  update(colMajor16) {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        this.cells[i][j].textContent = colMajor16[j * 4 + i].toFixed(2);
      }
    }
  }
}

/**
 * ValueTable(container, {rows})
 * A generic scalar/vector readout table — reuses the .mat-panel look (same
 * class, so any generic "did a readout change" probe that targets
 * .mat-panel keeps working) but rows have a variable number of value
 * columns instead of Mat4Panel's fixed 4x4 grid. rows: array of
 *   { id, label, cols=1, className, format }
 * — id is the update() key, label is the leading text cell, cols is how
 * many value cells the row has (e.g. 3 for a vector's x/y/z), className
 * colors the row (reuse row-u/row-v/row-w/row-h from lib.css), format
 * defaults to toFixed(2).
 */
export class ValueTable {
  constructor(container, { rows }) {
    this.table = document.createElement('table');
    this.table.className = 'mat-panel';
    this.cells = {};
    this.formats = {};

    const tbody = document.createElement('tbody');
    for (const r of rows) {
      const tr = document.createElement('tr');
      if (r.className) tr.className = r.className;

      const labelTd = document.createElement('td');
      labelTd.className = 'value-label';
      labelTd.textContent = r.label;
      tr.appendChild(labelTd);

      const cols = r.cols ?? 1;
      const tds = [];
      for (let i = 0; i < cols; i++) {
        const td = document.createElement('td');
        td.textContent = (0).toFixed(2);
        tr.appendChild(td);
        tds.push(td);
      }

      tbody.appendChild(tr);
      this.cells[r.id] = tds;
      this.formats[r.id] = r.format ?? ((v) => v.toFixed(2));
    }
    this.table.appendChild(tbody);
    container.appendChild(this.table);
  }

  /** update(id, value): value is a number, or an array for multi-column rows. */
  update(id, value) {
    const tds = this.cells[id];
    const fmt = this.formats[id];
    const vals = Array.isArray(value) ? value : [value];
    vals.forEach((v, i) => {
      if (tds[i]) tds[i].textContent = fmt(v);
    });
  }
}

/**
 * SliderRow(container, {id, label, min, max, step, value, format})
 * A labeled <input type=range> plus a live numeric readout.
 * .value getter reads the current numeric value; .onInput(fn) subscribes to
 * every input event (fn receives the current numeric value).
 */
export class SliderRow {
  constructor(container, { id, label, min = 0, max = 1, step = 0.01, value = 0, format }) {
    this._format = format ?? ((v) => v.toFixed(2));

    const row = document.createElement('div');
    row.className = 'slider-row';

    const labelEl = document.createElement('label');
    labelEl.className = 'slider-label';
    labelEl.htmlFor = id;
    labelEl.textContent = label;

    this.input = document.createElement('input');
    this.input.type = 'range';
    this.input.id = id;
    this.input.min = String(min);
    this.input.max = String(max);
    this.input.step = String(step);
    this.input.value = String(value);

    this.readout = document.createElement('span');
    this.readout.className = 'slider-readout';
    this.readout.textContent = this._format(this.value);

    row.appendChild(labelEl);
    row.appendChild(this.input);
    row.appendChild(this.readout);
    container.appendChild(row);

    this.input.addEventListener('input', () => {
      this.readout.textContent = this._format(this.value);
    });
  }

  get value() {
    return parseFloat(this.input.value);
  }

  onInput(fn) {
    this.input.addEventListener('input', () => fn(this.value));
  }
}
