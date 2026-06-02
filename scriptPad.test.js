const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

class MockElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.className = "";
    this.listeners = {};
    this.onclick = null;
    this.value = "";
    this._innerHTML = "";
    this._textContent = "";
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  addEventListener(event, listener) {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(listener);
  }

  click() {
    if (typeof this.onclick === "function") {
      this.onclick();
    }

    (this.listeners.click || []).forEach((listener) => listener());
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    this._textContent = "";
    this.children = [];

    if (/<\s*img\b/i.test(this._innerHTML)) {
      this.children.push(new MockElement("img"));
    }
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set textContent(value) {
    this._textContent = String(value);
    this._innerHTML = "";
    this.children = [];
  }

  get textContent() {
    return (
      this._textContent +
      this.children.map((child) => child.textContent).join("")
    );
  }
}

function createHarness(initialItems = []) {
  const elements = {
    tbody: new MockElement("tbody"),
    "#desc": new MockElement("input"),
    "#amount": new MockElement("input"),
    "#type": new MockElement("select"),
    "#btnNew": new MockElement("button"),
    ".incomes": new MockElement("span"),
    ".expenses": new MockElement("span"),
    ".total": new MockElement("span"),
  };
  const storage = {
    db_items: JSON.stringify(initialItems),
  };
  const alerts = [];
  const context = {
    alert(message) {
      alerts.push(message);
    },
    console,
    document: {
      createElement(tagName) {
        return new MockElement(tagName);
      },
      querySelector(selector) {
        const element = elements[selector];

        if (!element) {
          throw new Error(`Unexpected selector: ${selector}`);
        }

        return element;
      },
    },
    localStorage: {
      getItem(key) {
        return storage[key] ?? null;
      },
      setItem(key, value) {
        storage[key] = String(value);
      },
    },
  };

  vm.runInNewContext(fs.readFileSync("scriptPad.js", "utf8"), context, {
    filename: "scriptPad.js",
  });

  return { alerts, elements, storage };
}

test("renders stored transaction descriptions as inert text", () => {
  const payload = '<img src=x onerror="globalThis.__xss = true">';
  const { elements } = createHarness([
    { desc: payload, amount: "10.00", type: "Entrada" },
  ]);

  const row = elements.tbody.children[0];

  assert.equal(row.children[0].textContent, payload);
  assert.equal(row.children[0].children.length, 0);
  assert.equal(row.children[1].textContent, "R$ 10.00");
  assert.equal(row.children[2].children[0].className, "bx bxs-chevron-up-circle");
  assert.equal(elements[".incomes"].textContent, "10.00");
  assert.equal(elements[".expenses"].textContent, "0.00");
  assert.equal(elements[".total"].textContent, "10.00");
});

test("new malicious descriptions remain inert after saving and reloading", () => {
  const payload = '<img src=x onerror="globalThis.__xss = true">';
  const { elements, storage } = createHarness();

  elements["#desc"].value = payload;
  elements["#amount"].value = "25";
  elements["#type"].value = "Saída";
  elements["#btnNew"].click();

  assert.deepEqual(JSON.parse(storage.db_items), [
    { desc: payload, amount: "25.00", type: "Saída" },
  ]);

  const row = elements.tbody.children[0];
  assert.equal(row.children[0].textContent, payload);
  assert.equal(row.children[0].children.length, 0);
  assert.equal(row.children[2].children[0].className, "bx bxs-chevron-down-circle");
  assert.equal(elements[".expenses"].textContent, "25.00");
  assert.equal(elements[".total"].textContent, "-25.00");
});

test("delete button still removes the selected transaction", () => {
  const { elements, storage } = createHarness([
    { desc: "Bread", amount: "10.00", type: "Entrada" },
    { desc: "Flour", amount: "4.00", type: "Saída" },
  ]);

  elements.tbody.children[0].children[3].children[0].click();

  assert.deepEqual(JSON.parse(storage.db_items), [
    { desc: "Flour", amount: "4.00", type: "Saída" },
  ]);
  assert.equal(elements.tbody.children.length, 1);
  assert.equal(elements.tbody.children[0].children[0].textContent, "Flour");
  assert.equal(elements[".incomes"].textContent, "0.00");
  assert.equal(elements[".expenses"].textContent, "4.00");
  assert.equal(elements[".total"].textContent, "-4.00");
});
