const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

class Element {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.listeners = {};
    this.parentNode = null;
    this.value = "";
    this._className = "";
    this._textContent = "";
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  addEventListener(eventName, listener) {
    this.listeners[eventName] = listener;
  }

  set className(value) {
    this._className = String(value);
  }

  get className() {
    return this._className;
  }

  set textContent(value) {
    this._textContent = String(value);
    this.children = [];
  }

  get textContent() {
    return (
      this._textContent + this.children.map((child) => child.textContent).join("")
    );
  }

  set innerHTML(value) {
    throw new Error(`Unsafe innerHTML assignment: ${value}`);
  }
}

function createDocument() {
  const elements = {
    tbody: new Element("tbody"),
    "#desc": new Element("input"),
    "#amount": new Element("input"),
    "#type": new Element("select"),
    "#btnNew": new Element("button"),
    ".incomes": new Element("span"),
    ".expenses": new Element("span"),
    ".total": new Element("span"),
  };

  return {
    elements,
    createElement: (tagName) => new Element(tagName),
    querySelector: (selector) => elements[selector],
  };
}

function createLocalStorage(initialValues = {}) {
  const storage = new Map(Object.entries(initialValues));

  return {
    getItem: (key) => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, String(value)),
  };
}

function loadScript({ storedItems = [] } = {}) {
  const document = createDocument();
  const localStorage = createLocalStorage({
    db_items: JSON.stringify(storedItems),
  });
  const source = fs.readFileSync(path.join(__dirname, "scriptPad.js"), "utf8");

  vm.runInNewContext(
    source,
    {
      alert: () => {},
      document,
      localStorage,
    },
    { filename: "scriptPad.js" }
  );

  return { document, localStorage };
}

test("renders persisted transaction descriptions as text", () => {
  const payload = '<img src=x onerror="globalThis.pwned = true">';
  const { document } = loadScript({
    storedItems: [{ desc: payload, amount: "12.34", type: "Entrada" }],
  });

  const tbody = document.elements.tbody;
  assert.equal(tbody.children.length, 1);

  const row = tbody.children[0];
  assert.equal(row.children.length, 4);
  assert.equal(row.children[0].textContent, payload);
  assert.equal(row.children[0].children.length, 0);
  assert.equal(row.children[1].textContent, "R$ 12.34");
  assert.equal(row.children[2].className, "columnType");
  assert.equal(row.children[2].children[0].className, "bx bxs-chevron-up-circle");
  assert.equal(document.elements[".incomes"].textContent, "12.34");
  assert.equal(document.elements[".expenses"].textContent, "0.00");
  assert.equal(document.elements[".total"].textContent, "12.34");
});
