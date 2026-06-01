const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

class Element {
  constructor(tagName, document) {
    this.tagName = tagName.toUpperCase();
    this.document = document;
    this.children = [];
    this.className = "";
    this.value = "";
    this.listeners = {};
    this._textContent = "";
    this._innerHTML = "";
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  addEventListener(eventName, handler) {
    this.listeners[eventName] = handler;
  }

  click() {
    if (this.listeners.click) {
      this.listeners.click();
    }
  }

  set textContent(value) {
    this._textContent = String(value);
  }

  get textContent() {
    return this._textContent;
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    this.children = [];

    if (this._innerHTML.includes("onerror=")) {
      this.document.executedInlineHandler = true;
    }
  }

  get innerHTML() {
    return this._innerHTML;
  }
}

function createDocument() {
  const document = {
    executedInlineHandler: false,
    elements: {
      tbody: null,
      "#desc": null,
      "#amount": null,
      "#type": null,
      "#btnNew": null,
      ".incomes": null,
      ".expenses": null,
      ".total": null,
    },
    createElement(tagName) {
      return new Element(tagName, document);
    },
    querySelector(selector) {
      return document.elements[selector];
    },
  };

  Object.keys(document.elements).forEach((selector) => {
    const tagName = selector === "tbody" ? "tbody" : "div";
    document.elements[selector] = new Element(tagName, document);
  });

  return document;
}

function runScriptWithItems(items) {
  const document = createDocument();
  const storage = {
    db_items: JSON.stringify(items),
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(this, key) ? this[key] : null;
    },
    setItem(key, value) {
      this[key] = String(value);
    },
  };

  const context = {
    alert() {},
    document,
    localStorage: storage,
  };

  vm.createContext(context);
  const script = fs.readFileSync(path.join(__dirname, "scriptPad.js"), "utf8");
  vm.runInContext(script, context);

  return { document, storage };
}

test("renders stored descriptions as text instead of executable HTML", () => {
  const maliciousDescription = '<img src=x onerror="globalThis.compromised = true">';
  const { document } = runScriptWithItems([
    { desc: maliciousDescription, amount: "12.00", type: "Entrada" },
  ]);

  const tbody = document.elements.tbody;
  const row = tbody.children[0];
  const descriptionCell = row.children[0];

  assert.equal(document.executedInlineHandler, false);
  assert.equal(descriptionCell.textContent, maliciousDescription);
  assert.equal(descriptionCell.children.length, 0);
});

test("delete button still removes the selected stored item", () => {
  const { document, storage } = runScriptWithItems([
    { desc: "first", amount: "10.00", type: "Entrada" },
    { desc: "second", amount: "5.00", type: "Saída" },
  ]);

  const firstDeleteButton = document.elements.tbody.children[0].children[3].children[0];
  firstDeleteButton.click();

  assert.deepEqual(JSON.parse(storage.db_items), [
    { desc: "second", amount: "5.00", type: "Saída" },
  ]);
  assert.equal(document.elements.tbody.children.length, 1);
  assert.equal(document.elements.tbody.children[0].children[0].textContent, "second");
});
