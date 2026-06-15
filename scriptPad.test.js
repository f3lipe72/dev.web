const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

class Element {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.eventListeners = {};
    this.className = "";
    this.value = "";
    this._textContent = "";
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  append(...children) {
    children.forEach((child) => this.appendChild(child));
  }

  addEventListener(type, handler) {
    this.eventListeners[type] = handler;
  }

  click() {
    this.eventListeners.click();
  }

  set textContent(value) {
    this.children = [];
    this._textContent = String(value);
  }

  get textContent() {
    if (this.children.length === 0) {
      return this._textContent;
    }

    return this.children.map((child) => child.textContent).join("");
  }

  set innerHTML(value) {
    throw new Error(`Unsafe innerHTML assignment: ${value}`);
  }
}

function createDocument() {
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

  return {
    elements,
    createElement: (tagName) => new Element(tagName),
    querySelector: (selector) => elements[selector],
  };
}

function runScript(items) {
  const document = createDocument();
  let storedItems = JSON.stringify(items);
  const sandbox = {
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

  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "scriptPad.js"), "utf8"),
    sandbox
  );

  return { document, getStoredItems: () => JSON.parse(storedItems) };
}

test("renders stored transaction descriptions as text", () => {
  const payload = '<img src=x onerror="alert(document.cookie)">';
  const { document } = runScript([
    { desc: payload, amount: "12.50", type: "Entrada" },
  ]);

  const row = document.elements.tbody.children[0];
  const descriptionCell = row.children[0];

  assert.equal(descriptionCell.textContent, payload);
  assert.equal(descriptionCell.children.length, 0);
});

test("delete button keeps removing the selected transaction", () => {
  const { document, getStoredItems } = runScript([
    { desc: "Bread", amount: "3.00", type: "Entrada" },
  ]);

  const deleteButton = document.elements.tbody.children[0].children[3].children[0];
  deleteButton.click();

  assert.deepEqual(getStoredItems(), []);
  assert.equal(document.elements.tbody.children.length, 0);
});
