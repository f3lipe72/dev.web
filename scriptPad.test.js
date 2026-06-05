const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync("scriptPad.js", "utf8");

class Element {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.listeners = {};
    this.value = "";
    this.onclick = null;
    this.className = "";
    this.parentNode = null;
    this.parsedUnsafeHTML = false;
    this._textContent = "";
    this._innerHTML = "";
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  addEventListener(eventName, handler) {
    this.listeners[eventName] ??= [];
    this.listeners[eventName].push(handler);
  }

  click() {
    if (typeof this.onclick === "function") {
      this.onclick();
    }

    for (const handler of this.listeners.click ?? []) {
      handler();
    }
  }

  get textContent() {
    return (
      this._textContent + this.children.map((child) => child.textContent).join("")
    );
  }

  set textContent(value) {
    this._textContent = String(value);
    this.children = [];
    this._innerHTML = "";
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    this.children = [];
    this.parsedUnsafeHTML = /<script|<img|onerror\s*=|onclick\s*=/i.test(
      this._innerHTML
    );
    this._textContent = this.parsedUnsafeHTML ? "" : this._innerHTML;
  }
}

function createHarness(storedItems = []) {
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
    alertMessages: [],
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
        storage[key] = value;
      },
    },
    alert(message) {
      this.alertMessages.push(message);
    },
  };

  vm.runInNewContext(source, context, { filename: "scriptPad.js" });

  return { context, elements, storage };
}

test("renders stored transaction descriptions as text, not HTML", () => {
  const payload = '<img src=x onerror="globalThis.xss = true">';
  const { context, elements } = createHarness([
    { desc: payload, amount: "10.00", type: "Entrada" },
  ]);

  assert.equal(context.xss, undefined);
  assert.equal(elements.tbody.children.length, 1);

  const row = elements.tbody.children[0];
  assert.equal(row.parsedUnsafeHTML, false);
  assert.equal(row.children[0].tagName, "TD");
  assert.equal(row.children[0].textContent, payload);
  assert.equal(row.children[0].children.length, 0);
  assert.equal(elements[".incomes"].textContent, "10.00");
  assert.equal(elements[".total"].textContent, "10.00");
});

test("adds, persists, totals, and deletes transactions", () => {
  const { elements, storage } = createHarness();

  elements["#desc"].value = "Venda de pão";
  elements["#amount"].value = "12.5";
  elements["#type"].value = "Entrada";
  elements["#btnNew"].click();

  assert.deepEqual(JSON.parse(storage.db_items), [
    { desc: "Venda de pão", amount: "12.50", type: "Entrada" },
  ]);
  assert.equal(elements.tbody.children.length, 1);
  assert.equal(elements[".incomes"].textContent, "12.50");
  assert.equal(elements[".expenses"].textContent, "0.00");
  assert.equal(elements[".total"].textContent, "12.50");

  const deleteButton = elements.tbody.children[0].children[3].children[0];
  deleteButton.click();

  assert.deepEqual(JSON.parse(storage.db_items), []);
  assert.equal(elements.tbody.children.length, 0);
  assert.equal(elements[".total"].textContent, "0.00");
});
