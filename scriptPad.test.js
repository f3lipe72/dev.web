const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

class MockElement {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.className = "";
    this.listeners = {};
    this.value = "";
    this._innerHTML = "";
    this._textContent = "";
  }

  appendChild(child) {
    this.children.push(child);
    child.parentNode = this;
    return child;
  }

  addEventListener(eventName, handler) {
    this.listeners[eventName] = this.listeners[eventName] || [];
    this.listeners[eventName].push(handler);
  }

  click() {
    for (const handler of this.listeners.click || []) {
      handler({ target: this });
    }
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    this.children = [];

    if (/\son\w+\s*=/i.test(this._innerHTML)) {
      this.ownerDocument.executedInlineHandler = true;
    }
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set textContent(value) {
    this._textContent = String(value);
    this.children = [];
  }

  get textContent() {
    return this._textContent;
  }
}

function createDocument() {
  const document = {
    executedInlineHandler: false,
  };

  document.createElement = (tagName) => new MockElement(tagName, document);

  const elements = new Map(
    ["tbody", "#desc", "#amount", "#type", "#btnNew", ".incomes", ".expenses", ".total"].map(
      (selector) => [selector, document.createElement("div")]
    )
  );

  document.querySelector = (selector) => {
    const element = elements.get(selector);

    if (!element) {
      throw new Error(`Unexpected selector: ${selector}`);
    }

    return element;
  };

  return document;
}

function runScriptWithItems(items) {
  const document = createDocument();
  const storage = new Map([["db_items", JSON.stringify(items)]]);
  const localStorage = {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
      storage.set(key, String(value));
    },
  };
  const sandbox = {
    alert() {},
    document,
    localStorage,
  };
  const script = fs.readFileSync(path.join(__dirname, "scriptPad.js"), "utf8");

  vm.runInNewContext(script, sandbox);

  return { document, storage };
}

test("stored transaction descriptions render as inert text", () => {
  const payload = '<img src=x onerror="globalThis.__xss = true">';
  const { document } = runScriptWithItems([
    { desc: payload, amount: "12.00", type: "Entrada" },
  ]);
  const tbody = document.querySelector("tbody");
  const row = tbody.children[0];

  assert.equal(document.executedInlineHandler, false);
  assert.equal(row.children[0].textContent, payload);
  assert.equal(row.children[1].textContent, "R$ 12.00");
});

test("delete buttons still remove the selected transaction", () => {
  const { document, storage } = runScriptWithItems([
    { desc: "first", amount: "5.00", type: "Entrada" },
    { desc: "second", amount: "2.00", type: "Saída" },
  ]);
  const tbody = document.querySelector("tbody");
  const deleteButton = tbody.children[0].children[3].children[0];

  deleteButton.click();

  assert.deepEqual(JSON.parse(storage.get("db_items")), [
    { desc: "second", amount: "2.00", type: "Saída" },
  ]);
  assert.equal(tbody.children.length, 1);
  assert.equal(tbody.children[0].children[0].textContent, "second");
});
