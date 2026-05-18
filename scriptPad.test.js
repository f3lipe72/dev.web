const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

class Element {
  constructor(tagName, innerHTMLAssignments) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.className = "";
    this.onclick = null;
    this.value = "";
    this._innerHTML = "";
    this._textContent = "";
    this.innerHTMLAssignments = innerHTMLAssignments;
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    this.innerHTMLAssignments.push({
      tagName: this.tagName,
      value: this._innerHTML,
    });

    if (this.tagName === "TBODY" && this._innerHTML === "") {
      this.children = [];
    }
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set textContent(value) {
    this._textContent = String(value);
  }

  get textContent() {
    return this._textContent;
  }
}

function runScriptWithItems(items) {
  const innerHTMLAssignments = [];
  const elements = {
    tbody: new Element("tbody", innerHTMLAssignments),
    desc: new Element("input", innerHTMLAssignments),
    amount: new Element("input", innerHTMLAssignments),
    type: new Element("select", innerHTMLAssignments),
    btnNew: new Element("button", innerHTMLAssignments),
    incomes: new Element("span", innerHTMLAssignments),
    expenses: new Element("span", innerHTMLAssignments),
    total: new Element("span", innerHTMLAssignments),
  };

  const document = {
    createElement: (tagName) => new Element(tagName, innerHTMLAssignments),
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

      return selectorMap[selector] ?? null;
    },
  };

  const localStorageData = {
    db_items: JSON.stringify(items),
  };

  const context = {
    document,
    localStorage: {
      getItem: (key) => localStorageData[key] ?? null,
      setItem: (key, value) => {
        localStorageData[key] = String(value);
      },
    },
  };

  vm.createContext(context);
  vm.runInContext(
    readFileSync(join(__dirname, "scriptPad.js"), "utf8"),
    context
  );

  return { elements, innerHTMLAssignments };
}

test("renders stored transaction descriptions as text", () => {
  const payload = '<img src=x onerror="globalThis.compromised = true">';
  const { elements, innerHTMLAssignments } = runScriptWithItems([
    {
      desc: payload,
      amount: "10.00",
      type: "Entrada",
    },
  ]);

  assert.equal(elements.tbody.children.length, 1);

  const row = elements.tbody.children[0];
  assert.equal(row.children[0].textContent, payload);
  assert.equal(row.children[1].textContent, "R$ 10.00");
  assert.equal(row.children[2].className, "columnType");
  assert.equal(row.children[2].children[0].className, "bx bxs-chevron-up-circle");
  assert.equal(row.children[3].className, "columnAction");
  assert.equal(typeof row.children[3].children[0].onclick, "function");

  assert.deepEqual(
    innerHTMLAssignments.filter(({ value }) => value.includes(payload)),
    []
  );
});
