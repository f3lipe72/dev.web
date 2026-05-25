const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this._innerHTML = "";
    this.textContent = "";
    this.onclick = null;
    this.value = "";
    this.classes = [];
    this.classList = {
      add: (...classNames) => {
        this.classes.push(...classNames);
      },
    };
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  append(...children) {
    children.forEach((child) => this.appendChild(child));
  }

  set innerHTML(value) {
    this._innerHTML = value;
    if (value === "") {
      this.children = [];
    }
  }

  get innerHTML() {
    return this._innerHTML;
  }
}

function loadScriptWithItems(items) {
  const elements = {
    tbody: new FakeElement("tbody"),
    desc: new FakeElement("input"),
    amount: new FakeElement("input"),
    type: new FakeElement("select"),
    btnNew: new FakeElement("button"),
    incomes: new FakeElement("span"),
    expenses: new FakeElement("span"),
    total: new FakeElement("span"),
  };

  const document = {
    createElement: (tagName) => new FakeElement(tagName),
    querySelector: (selector) => {
      const selectorMap = {
        tbody: elements.tbody,
        "#desc": elements.desc,
        "#amount": elements.amount,
        "#type": elements.type,
        "#btnNew": elements.btnNew,
        ".incomes": elements.incomes,
        ".expenses": elements.expenses,
        ".total": elements.total,
      };

      return selectorMap[selector];
    },
  };

  const context = {
    document,
    localStorage: {
      getItem: (key) => (key === "db_items" ? JSON.stringify(items) : null),
      setItem: () => {},
    },
    alert: () => {},
  };

  vm.createContext(context);
  vm.runInContext(readFileSync(join(__dirname, "scriptPad.js"), "utf8"), context);

  return elements;
}

test("transaction descriptions render as text instead of executable HTML", () => {
  const payload = '<img src=x onerror="globalThis.wasExecuted = true">';
  const elements = loadScriptWithItems([
    { desc: payload, amount: "10.00", type: "Entrada" },
  ]);

  const [row] = elements.tbody.children;

  assert.equal(row.children[0].textContent, payload);
  assert.equal(row.innerHTML, "");
  assert.equal(row.children[3].children[0].onclick instanceof Function, true);
});
