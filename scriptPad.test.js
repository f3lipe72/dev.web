const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

class Element {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.className = "";
    this.onclick = null;
    this.value = "";
    this._innerHTML = "";
    this._textContent = "";
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  append(...children) {
    this.children.push(...children);
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

  set textContent(value) {
    this._textContent = String(value);
  }

  get textContent() {
    return this._textContent;
  }
}

function runScriptWithStoredItems(items) {
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

  const dangerousInnerHtmlWrites = [];
  const originalInnerHtml = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");
  Object.defineProperty(Element.prototype, "innerHTML", {
    get: originalInnerHtml.get,
    set(value) {
      if (String(value).includes("<img")) {
        dangerousInnerHtmlWrites.push(value);
      }
      originalInnerHtml.set.call(this, value);
    },
  });

  const storage = new Map([["db_items", JSON.stringify(items)]]);
  const context = {
    document: {
      createElement: (tagName) => new Element(tagName),
      querySelector: (selector) => {
        const bySelector = {
          tbody: elements.tbody,
          "#desc": elements.desc,
          "#amount": elements.amount,
          "#type": elements.type,
          "#btnNew": elements.btnNew,
          ".incomes": elements.incomes,
          ".expenses": elements.expenses,
          ".total": elements.total,
        };

        return bySelector[selector];
      },
    },
    localStorage: {
      getItem: (key) => (storage.has(key) ? storage.get(key) : null),
      setItem: (key, value) => storage.set(key, value),
    },
    alert: () => {},
  };

  vm.runInNewContext(fs.readFileSync("scriptPad.js", "utf8"), context);
  Object.defineProperty(Element.prototype, "innerHTML", originalInnerHtml);

  return { dangerousInnerHtmlWrites, elements };
}

test("stored transaction values are rendered as text, not HTML", () => {
  const payload = '<img src=x onerror="globalThis.__xss = true">';
  const { dangerousInnerHtmlWrites, elements } = runScriptWithStoredItems([
    { desc: payload, amount: "10.50", type: "Entrada" },
  ]);

  assert.deepEqual(dangerousInnerHtmlWrites, []);

  const row = elements.tbody.children[0];
  assert.equal(row.children[0].textContent, payload);
  assert.equal(row.children[1].textContent, "R$ 10.50");
  assert.equal(row.children[2].children[0].className, "bx bxs-chevron-up-circle");
});
