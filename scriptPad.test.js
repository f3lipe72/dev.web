const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

class Element {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.className = "";
    this.eventListeners = {};
    this.parentNode = null;
    this.value = "";
    this._innerHTML = "";
    this._textContent = "";
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  addEventListener(type, listener) {
    this.eventListeners[type] = listener;
  }

  click() {
    this.eventListeners.click();
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    this.children = [];
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set textContent(value) {
    this._textContent = String(value);
    this.children = [];
  }

  get textContent() {
    return (
      this._textContent +
      this.children.map((child) => child.textContent).join("")
    );
  }
}

function loadScript(initialItems) {
  const elements = {
    tbody: new Element("tbody"),
    desc: new Element("input"),
    amount: new Element("input"),
    type: new Element("select"),
    btnNew: new Element("button"),
    incomes: new Element("span"),
    expenses: new Element("span"),
    total: new Element("span"),
  };

  const selectors = {
    tbody: elements.tbody,
    "#desc": elements.desc,
    "#amount": elements.amount,
    "#type": elements.type,
    "#btnNew": elements.btnNew,
    ".incomes": elements.incomes,
    ".expenses": elements.expenses,
    ".total": elements.total,
  };

  const storage = {
    db_items: JSON.stringify(initialItems),
  };

  const context = {
    document: {
      createElement: (tagName) => new Element(tagName),
      querySelector: (selector) => selectors[selector],
    },
    localStorage: {
      getItem: (key) =>
        Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null,
      setItem: (key, value) => {
        storage[key] = String(value);
      },
    },
  };

  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "scriptPad.js"), "utf8"),
    context
  );

  return { context, elements, storage };
}

test("renders persisted descriptions as text instead of HTML", () => {
  const payload = '<img src=x onerror="globalThis.xss = true">';
  const { context, elements } = loadScript([
    { desc: payload, amount: "25.00", type: "Entrada" },
  ]);

  const row = elements.tbody.children[0];

  assert.equal(row.children.length, 4);
  assert.equal(row.children[0].tagName, "TD");
  assert.equal(row.children[0].textContent, payload);
  assert.equal(row.children[0].children.length, 0);
  assert.equal(context.xss, undefined);
});

test("delete button keeps removing the selected transaction", () => {
  const { elements, storage } = loadScript([
    { desc: "first", amount: "10.00", type: "Entrada" },
    { desc: "second", amount: "5.00", type: "Entrada" },
  ]);

  const firstRow = elements.tbody.children[0];
  const deleteButton = firstRow.children[3].children[0];

  deleteButton.click();

  assert.deepEqual(JSON.parse(storage.db_items), [
    { desc: "second", amount: "5.00", type: "Entrada" },
  ]);
  assert.equal(elements.tbody.children.length, 1);
  assert.equal(elements.tbody.children[0].children[0].textContent, "second");
});
