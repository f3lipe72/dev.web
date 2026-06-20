const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const scriptSource = readFileSync(path.join(__dirname, "scriptPad.js"), "utf8");

class Element {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.className = "";
    this.listeners = {};
    this.onclick = null;
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

  addEventListener(type, handler) {
    this.listeners[type] = handler;
  }

  click() {
    if (typeof this.onclick === "function") {
      this.onclick();
    }

    if (typeof this.listeners.click === "function") {
      this.listeners.click();
    }
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
    this._innerHTML = "";
  }

  get textContent() {
    return [
      this._textContent,
      ...this.children.map((child) => child.textContent),
    ].join("");
  }
}

function runScriptWithItems(items) {
  const tbody = new Element("tbody");
  const descInput = new Element("input");
  const amountInput = new Element("input");
  const typeInput = new Element("select");
  const button = new Element("button");
  const incomes = new Element("span");
  const expenses = new Element("span");
  const total = new Element("span");

  const elementsBySelector = {
    tbody,
    "#desc": descInput,
    "#amount": amountInput,
    "#type": typeInput,
    "#btnNew": button,
    ".incomes": incomes,
    ".expenses": expenses,
    ".total": total,
  };

  const storage = {
    db_items: JSON.stringify(items),
  };

  const context = {
    document: {
      querySelector(selector) {
        return elementsBySelector[selector];
      },
      createElement(tagName) {
        return new Element(tagName);
      },
    },
    localStorage: {
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(storage, key)
          ? storage[key]
          : null;
      },
      setItem(key, value) {
        storage[key] = String(value);
      },
    },
    alert(message) {
      throw new Error(`Unexpected alert: ${message}`);
    },
    console,
    JSON,
    Math,
  };

  vm.runInNewContext(scriptSource, context, { filename: "scriptPad.js" });

  return { elementsBySelector, storage };
}

test("renders stored transaction descriptions as text", () => {
  const payload = '<img src=x onerror="globalThis.pwned=true">';
  const { elementsBySelector } = runScriptWithItems([
    {
      desc: payload,
      amount: "10.00",
      type: "Entrada",
    },
  ]);

  const [row] = elementsBySelector.tbody.children;

  assert.equal(row.children[0].textContent, payload);
  assert.equal(row.children[0].children.length, 0);
  assert.equal(row.children[0].innerHTML, "");
});

test("delete button still removes the selected transaction", () => {
  const { elementsBySelector, storage } = runScriptWithItems([
    {
      desc: "first",
      amount: "10.00",
      type: "Entrada",
    },
    {
      desc: "second",
      amount: "3.00",
      type: "Saída",
    },
  ]);

  const firstDeleteButton = elementsBySelector.tbody.children[0].children[3].children[0];

  firstDeleteButton.click();

  assert.deepEqual(JSON.parse(storage.db_items), [
    {
      desc: "second",
      amount: "3.00",
      type: "Saída",
    },
  ]);
  assert.equal(elementsBySelector.tbody.children.length, 1);
  assert.equal(elementsBySelector.tbody.children[0].children[0].textContent, "second");
});
