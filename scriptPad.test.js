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
    this.onclick = null;
    this.value = "";
    this._className = "";
    this._innerHTML = "";
    this._textContent = "";
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  addEventListener(type, listener) {
    this.listeners[type] = listener;
  }

  set className(value) {
    this._className = String(value);
  }

  get className() {
    return this._className;
  }

  set innerHTML(value) {
    this._innerHTML = String(value);

    if (value === "") {
      this.children = [];
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
    if (this.children.length > 0) {
      return this.children.map((child) => child.textContent).join("");
    }

    return this._textContent;
  }
}

function runScriptWithItems(items) {
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

  const document = {
    createElement(tagName) {
      return new Element(tagName);
    },
    querySelector(selector) {
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

      return selectors[selector];
    },
  };

  const localStorage = {
    getItem(key) {
      return key === "db_items" ? JSON.stringify(items) : null;
    },
    setItem() {},
  };

  const context = { alert() {}, document, localStorage };
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "scriptPad.js"), "utf8"),
    context,
    { filename: "scriptPad.js" }
  );

  return elements;
}

test("renders persisted descriptions as text instead of executable markup", () => {
  const payload = '<img src=x onerror="localStorage.clear()">';
  const elements = runScriptWithItems([
    { desc: payload, amount: "10.00", type: "Entrada" },
  ]);

  const row = elements.tbody.children[0];
  assert.ok(row, "expected one rendered transaction row");

  const descriptionCell = row.children[0];
  assert.equal(descriptionCell.tagName, "TD");
  assert.equal(descriptionCell.textContent, payload);
  assert.equal(descriptionCell.innerHTML, "");
});
