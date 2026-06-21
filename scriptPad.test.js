const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const scriptSource = fs.readFileSync(path.join(__dirname, "scriptPad.js"), "utf8");

function createElementClass(innerHTMLAssignments) {
  return class Element {
    constructor(tagName) {
      this.tagName = tagName.toUpperCase();
      this.children = [];
      this.className = "";
      this.listeners = {};
      this.value = "";
      this._innerHTML = "";
      this._textContent = "";
    }

    appendChild(child) {
      this.children.push(child);
      return child;
    }

    addEventListener(type, handler) {
      this.listeners[type] = this.listeners[type] || [];
      this.listeners[type].push(handler);
    }

    click() {
      (this.listeners.click || []).forEach((handler) => handler());
      if (typeof this.onclick === "function") {
        this.onclick();
      }
    }

    set innerHTML(value) {
      this._innerHTML = String(value);
      this.children = [];
      innerHTMLAssignments.push(this._innerHTML);
    }

    get innerHTML() {
      return this._innerHTML;
    }

    set textContent(value) {
      this._textContent = String(value);
      this.children = [];
    }

    get textContent() {
      if (this.children.length > 0) {
        return this.children.map((child) => child.textContent).join("");
      }

      return this._textContent;
    }
  };
}

function loadScriptWithItems(storedItems) {
  const innerHTMLAssignments = [];
  const Element = createElementClass(innerHTMLAssignments);
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
  const storage = {
    db_items: JSON.stringify(storedItems),
  };
  const context = {
    document: {
      querySelector(selector) {
        return elements[selector];
      },
      createElement(tagName) {
        return new Element(tagName);
      },
    },
    localStorage: {
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(storage, key)
          ? storage[key]
          : null;
      },
      setItem(key, value) {
        storage[key] = String(value);
      },
    },
    alert() {},
  };

  vm.createContext(context);
  vm.runInContext(scriptSource, context);

  return { elements, innerHTMLAssignments, storage };
}

test("renders persisted transaction descriptions as text", () => {
  const payload = '<img src=x onerror="globalThis.pwned = true">';
  const { elements, innerHTMLAssignments } = loadScriptWithItems([
    { desc: payload, amount: "12.50", type: "Entrada" },
  ]);

  const row = elements.tbody.children[0];

  assert.equal(row.children[0].textContent, payload);
  assert.deepEqual(innerHTMLAssignments, [""]);
});

test("delete button removes the selected persisted transaction", () => {
  const { elements, storage } = loadScriptWithItems([
    { desc: "pao", amount: "3.00", type: "Entrada" },
    { desc: "farinha", amount: "4.00", type: "Saída" },
  ]);
  const firstRow = elements.tbody.children[0];
  const deleteButton = firstRow.children[3].children[0];

  deleteButton.click();

  assert.deepEqual(JSON.parse(storage.db_items), [
    { desc: "farinha", amount: "4.00", type: "Saída" },
  ]);
  assert.equal(elements.tbody.children.length, 1);
  assert.equal(elements.tbody.children[0].children[0].textContent, "farinha");
});
