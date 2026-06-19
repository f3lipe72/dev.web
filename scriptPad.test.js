const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

const scriptPath = path.join(__dirname, "scriptPad.js");
const scriptSource = fs.readFileSync(scriptPath, "utf8");

class MockClassList {
  constructor() {
    this.values = new Set();
  }

  add(...classes) {
    classes.forEach((className) => this.values.add(className));
  }

  contains(className) {
    return this.values.has(className);
  }
}

class MockElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.listeners = {};
    this.classList = new MockClassList();
    this.innerHTMLWrites = [];
    this.textContent = "";
    this.value = "";
    this.onclick = null;
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  append(...children) {
    children.forEach((child) => this.appendChild(child));
  }

  addEventListener(eventName, listener) {
    this.listeners[eventName] = this.listeners[eventName] || [];
    this.listeners[eventName].push(listener);
  }

  click() {
    if (typeof this.onclick === "function") {
      this.onclick();
    }

    (this.listeners.click || []).forEach((listener) => listener());
  }

  set innerHTML(value) {
    this.innerHTMLWrites.push(value);
    this.children = [];
  }

  get innerHTML() {
    return this.innerHTMLWrites.at(-1) || "";
  }
}

function createDocument() {
  const elements = [];
  const selectors = {
    tbody: new MockElement("tbody"),
    "#desc": new MockElement("input"),
    "#amount": new MockElement("input"),
    "#type": new MockElement("select"),
    "#btnNew": new MockElement("button"),
    ".incomes": new MockElement("span"),
    ".expenses": new MockElement("span"),
    ".total": new MockElement("span"),
  };

  elements.push(...Object.values(selectors));

  return {
    elements,
    selectors,
    querySelector(selector) {
      return selectors[selector];
    },
    createElement(tagName) {
      const element = new MockElement(tagName);
      elements.push(element);
      return element;
    },
  };
}

function createLocalStorage(initialItems) {
  const store = new Map([["db_items", JSON.stringify(initialItems)]]);

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
  };
}

function runPadariaScript(initialItems) {
  const document = createDocument();
  const localStorage = createLocalStorage(initialItems);
  const context = {
    alert() {},
    document,
    localStorage,
  };

  vm.createContext(context);
  vm.runInContext(scriptSource, context);

  return { document, localStorage };
}

test("renders stored transaction descriptions as text, not HTML", () => {
  const payload = '<img src=x onerror="globalThis.__xss = true">';
  const { document } = runPadariaScript([
    { desc: payload, amount: "10.00", type: "Entrada" },
  ]);

  const tbody = document.selectors.tbody;
  const row = tbody.children[0];

  assert.equal(row.children[0].textContent, payload);
  assert.equal(row.children[1].textContent, "R$ 10.00");
  assert.equal(
    document.elements.some((element) =>
      element.innerHTMLWrites.some((value) => value.includes(payload))
    ),
    false
  );
});

test("delete button removes the selected stored transaction", () => {
  const { document, localStorage } = runPadariaScript([
    { desc: "Cafe", amount: "5.00", type: "Saída" },
  ]);

  const tbody = document.selectors.tbody;
  const deleteButton = tbody.children[0].children[3].children[0];

  deleteButton.click();

  assert.equal(localStorage.getItem("db_items"), "[]");
  assert.equal(tbody.children.length, 0);
});
