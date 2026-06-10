const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "scriptPad.js"), "utf8");

class MockElement {
  constructor(tagName = "div") {
    this.tagName = tagName;
    this.children = [];
    this.className = "";
    this.onclick = null;
    this.value = "";
    this._textContent = "";
    this._innerHTML = "";
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  set textContent(value) {
    this._textContent = String(value);
  }

  get textContent() {
    return this._textContent;
  }

  set innerHTML(value) {
    const html = String(value);

    if (html.includes("<img")) {
      throw new Error("Unsafe transaction description was rendered as HTML");
    }

    this._innerHTML = html;
    this.children = [];
  }

  get innerHTML() {
    return this._innerHTML;
  }
}

function createHarness(initialItems) {
  let storedItems = JSON.stringify(initialItems);

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

  const context = {
    alert: () => {},
    document,
    localStorage: {
      getItem: (key) => (key === "db_items" ? storedItems : null),
      setItem: (key, value) => {
        if (key === "db_items") {
          storedItems = value;
        }
      },
    },
  };

  return {
    context,
    elements,
    getStoredItems: () => JSON.parse(storedItems),
  };
}

test("transaction descriptions are rendered as text instead of HTML", () => {
  const payload = '<img src=x onerror="globalThis.__xss = true">';
  const { context, elements } = createHarness([
    { desc: payload, amount: "12.50", type: "Entrada" },
  ]);

  vm.runInNewContext(source, context);

  const [row] = elements.tbody.children;
  assert.equal(row.children[0].textContent, payload);
  assert.equal(row.children[1].textContent, "R$ 12.50");
  assert.equal(row.children[2].children[0].className, "bx bxs-chevron-up-circle");
  assert.equal(context.__xss, undefined);
});

test("delete button still removes the selected transaction", () => {
  const { context, elements, getStoredItems } = createHarness([
    { desc: "Venda", amount: "10.00", type: "Entrada" },
    { desc: "Farinha", amount: "4.00", type: "Saída" },
  ]);

  vm.runInNewContext(source, context);

  const deleteButton = elements.tbody.children[0].children[3].children[0];
  deleteButton.onclick();

  assert.deepEqual(getStoredItems(), [
    { desc: "Farinha", amount: "4.00", type: "Saída" },
  ]);
  assert.equal(elements.tbody.children.length, 1);
  assert.equal(elements.tbody.children[0].children[0].textContent, "Farinha");
  assert.equal(elements.incomes.innerHTML, "0.00");
  assert.equal(elements.expenses.innerHTML, "4.00");
  assert.equal(elements.total.innerHTML, "-4.00");
});
