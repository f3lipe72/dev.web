const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

class FakeElement {
  constructor(tagName, innerHTMLAssignments) {
    this.tagName = tagName;
    this.children = [];
    this.className = "";
    this.listeners = {};
    this.value = "";
    this._innerHTML = "";
    this._textContent = "";
    this.innerHTMLAssignments = innerHTMLAssignments;
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  addEventListener(eventName, handler) {
    this.listeners[eventName] = handler;
  }

  click() {
    this.listeners.click();
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    this.children = [];
    this.innerHTMLAssignments.push(this._innerHTML);
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set textContent(value) {
    this._textContent = value == null ? "" : String(value);
  }

  get textContent() {
    return this._textContent;
  }
}

function runScriptWithItems(items) {
  const innerHTMLAssignments = [];
  const elements = {
    tbody: new FakeElement("tbody", innerHTMLAssignments),
    desc: new FakeElement("input", innerHTMLAssignments),
    amount: new FakeElement("input", innerHTMLAssignments),
    type: new FakeElement("select", innerHTMLAssignments),
    btnNew: new FakeElement("button", innerHTMLAssignments),
    incomes: new FakeElement("span", innerHTMLAssignments),
    expenses: new FakeElement("span", innerHTMLAssignments),
    total: new FakeElement("span", innerHTMLAssignments),
  };
  const storage = new Map([["db_items", JSON.stringify(items)]]);

  const document = {
    createElement(tagName) {
      return new FakeElement(tagName, innerHTMLAssignments);
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

      if (!selectors[selector]) {
        throw new Error(`Unexpected selector: ${selector}`);
      }

      return selectors[selector];
    },
  };

  const localStorage = {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
      storage.set(key, String(value));
    },
  };

  const source = fs.readFileSync(path.join(__dirname, "scriptPad.js"), "utf8");

  vm.runInNewContext(
    source,
    {
      alert() {},
      document,
      localStorage,
    },
    { filename: "scriptPad.js" },
  );

  return { elements, innerHTMLAssignments, storage };
}

test("stored transaction descriptions render as text, not HTML", () => {
  const maliciousDescription = '<img src=x onerror="globalThis.pwned=true">';
  const { elements, innerHTMLAssignments, storage } = runScriptWithItems([
    {
      desc: maliciousDescription,
      amount: "12.34",
      type: "Entrada",
    },
  ]);

  assert.equal(elements.tbody.children.length, 1);
  assert.equal(elements.tbody.children[0].children[0].textContent, maliciousDescription);
  assert.equal(elements.tbody.children[0].children[1].textContent, "R$ 12.34");
  assert.ok(
    innerHTMLAssignments.every((value) => !value.includes(maliciousDescription)),
    "stored descriptions must not be interpolated into innerHTML",
  );

  elements.tbody.children[0].children[3].children[0].click();
  assert.equal(storage.get("db_items"), "[]");
});
