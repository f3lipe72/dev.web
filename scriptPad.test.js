const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

class MockElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.className = "";
    this.onclick = null;
    this.value = "";
    this._innerHTML = "";
    this._textContent = "";
  }

  appendChild(child) {
    this.children.push(child);
    child.parentNode = this;
    return child;
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
    return this._textContent;
  }
}

function createScriptContext() {
  const elements = {
    tbody: new MockElement("tbody"),
    desc: new MockElement("input"),
    amount: new MockElement("input"),
    type: new MockElement("select"),
    btnNew: new MockElement("button"),
    incomes: new MockElement("span"),
    expenses: new MockElement("span"),
    total: new MockElement("span"),
  };

  const document = {
    createElement: (tagName) => new MockElement(tagName),
    querySelector: (selector) => {
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
    getItem: () => null,
    setItem: () => {},
  };

  return {
    context: vm.createContext({
      alert: () => {},
      document,
      localStorage,
    }),
    elements,
  };
}

test("insertItem renders transaction descriptions as text", () => {
  const { context, elements } = createScriptContext();
  const script = readFileSync(join(__dirname, "scriptPad.js"), "utf8");
  vm.runInContext(script, context);

  const payload = '<img src=x onerror="alert(1)">';
  context.insertItem(
    {
      desc: payload,
      amount: "10.00",
      type: "Entrada",
    },
    0
  );

  const row = elements.tbody.children[0];

  assert.equal(row.children[0].textContent, payload);
  assert.equal(row.children[0].children.length, 0);
  assert.equal(row.innerHTML, "");
  assert.equal(row.children[1].textContent, "R$ 10.00");
  assert.equal(row.children[2].children[0].className, "bx bxs-chevron-up-circle");
  assert.equal(row.children[3].children[0].children[0].className, "bx bx-trash");
});
