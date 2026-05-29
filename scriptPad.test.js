const assert = require("node:assert/strict");
const { test } = require("node:test");

class Element {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.className = "";
    this.eventListeners = {};
    this.value = "";
    this._innerHTML = "";
    this._textContent = "";
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  addEventListener(eventName, handler) {
    this.eventListeners[eventName] = handler;
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
    return this._textContent;
  }
}

function collectInnerHTML(element) {
  return [
    element.innerHTML,
    ...element.children.flatMap((child) => collectInnerHTML(child)),
  ];
}

function setupDom(storedItems) {
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
    createElement: (tagName) => new Element(tagName),
    querySelector: (selector) => elements[selector],
  };

  global.localStorage = {
    getItem: (key) =>
      key === "db_items" ? JSON.stringify(storedItems) : null,
    setItem: () => {},
  };

  global.alert = () => {};

  return elements;
}

test("transaction descriptions are rendered as text instead of HTML", () => {
  const maliciousDescription =
    '<img src=x onerror="globalThis.__transactionXss = true">';
  const elements = setupDom([
    {
      desc: maliciousDescription,
      amount: "25.00",
      type: "Entrada",
    },
  ]);

  require("./scriptPad.js");

  const row = elements.tbody.children[0];
  assert.equal(row.children[0].textContent, maliciousDescription);
  assert.equal(global.__transactionXss, undefined);
  assert(
    collectInnerHTML(elements.tbody).every(
      (html) => !html.includes("onerror") && !html.includes("<img"),
    ),
  );
});
