const assert = require("node:assert/strict");
const test = require("node:test");

class Element {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.onclick = null;
    this._textContent = "";
    this._innerHTML = "";
    this.classList = {
      values: [],
      add: (...classes) => {
        this.classList.values.push(...classes);
      },
    };
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
    this._innerHTML = String(value);
    this.children = [];
  }

  get innerHTML() {
    return this._innerHTML;
  }
}

test("transaction descriptions are rendered as inert text", () => {
  const payload = '<img src=x onerror="globalThis.pwned = true">';
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

  global.document = {
    querySelector: (selector) => elements[selector],
    createElement: (tagName) => new Element(tagName),
  };
  global.localStorage = {
    getItem: (key) =>
      key === "db_items"
        ? JSON.stringify([{ desc: payload, amount: "12.50", type: "Entrada" }])
        : null,
    setItem: () => {},
  };

  delete require.cache[require.resolve("./scriptPad.js")];
  require("./scriptPad.js");

  const [row] = elements.tbody.children;
  assert.ok(row, "expected saved transaction to render");

  const [descCell, amountCell, typeCell, actionCell] = row.children;
  assert.equal(descCell.textContent, payload);
  assert.equal(descCell.innerHTML, "");
  assert.equal(amountCell.textContent, "R$ 12.50");
  assert.deepEqual(typeCell.classList.values, ["columnType"]);
  assert.deepEqual(typeCell.children[0].classList.values, [
    "bx",
    "bxs-chevron-up-circle",
  ]);
  assert.deepEqual(actionCell.classList.values, ["columnAction"]);
  assert.equal(typeof actionCell.children[0].onclick, "function");
});
