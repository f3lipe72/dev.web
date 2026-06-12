const assert = require("node:assert/strict");
const test = require("node:test");

function createElement(tagName, innerHTMLWrites) {
  return {
    tagName: tagName.toUpperCase(),
    children: [],
    className: "",
    eventListeners: {},
    _innerHTML: "",
    _textContent: "",
    appendChild(child) {
      this.children.push(child);
      child.parentNode = this;
      return child;
    },
    addEventListener(type, listener) {
      this.eventListeners[type] = listener;
    },
    set innerHTML(value) {
      const stringValue = String(value);
      innerHTMLWrites.push(stringValue);
      this._innerHTML = stringValue;
    },
    get innerHTML() {
      return this._innerHTML;
    },
    set textContent(value) {
      this._textContent = String(value);
    },
    get textContent() {
      return this._textContent;
    },
  };
}

function loadScriptWithStoredItems(storedItems) {
  const innerHTMLWrites = [];
  const tbody = createElement("tbody", innerHTMLWrites);
  const elements = {
    tbody,
    "#desc": createElement("input", innerHTMLWrites),
    "#amount": createElement("input", innerHTMLWrites),
    "#type": createElement("select", innerHTMLWrites),
    "#btnNew": createElement("button", innerHTMLWrites),
    ".incomes": createElement("span", innerHTMLWrites),
    ".expenses": createElement("span", innerHTMLWrites),
    ".total": createElement("span", innerHTMLWrites),
  };

  global.document = {
    querySelector(selector) {
      return elements[selector];
    },
    createElement(tagName) {
      return createElement(tagName, innerHTMLWrites);
    },
  };

  global.localStorage = {
    getItem(key) {
      return key === "db_items" ? JSON.stringify(storedItems) : null;
    },
    setItem() {},
  };

  delete require.cache[require.resolve("./scriptPad.js")];
  const script = require("./scriptPad.js");

  return { ...elements, innerHTMLWrites, script };
}

test("stored transaction descriptions render as text, not executable HTML", () => {
  const maliciousDescription =
    '<img src=x onerror="globalThis.__transactionXss = true">';

  const { tbody, innerHTMLWrites } = loadScriptWithStoredItems([
    {
      desc: maliciousDescription,
      amount: "15.00",
      type: "Entrada",
    },
  ]);

  assert.equal(tbody.children.length, 1);
  assert.equal(tbody.children[0].children[0].textContent, maliciousDescription);
  assert.equal(tbody.children[0].children[1].textContent, "R$ 15.00");
  assert.ok(
    !innerHTMLWrites.some((value) => value.includes(maliciousDescription)),
    "transaction data must never be written through innerHTML",
  );
});
