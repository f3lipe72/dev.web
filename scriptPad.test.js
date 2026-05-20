const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

class MockElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.value = "";
    this.onclick = null;
    this._textContent = "";
    this._innerHTML = "";
    this.className = "";
    this.classList = {
      add: (...classes) => {
        this.className = [this.className, ...classes].filter(Boolean).join(" ");
      },
    };
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  set textContent(value) {
    this._textContent = String(value);
    this.children = [];
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

function loadScriptWithItems(storedItems) {
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

  const innerHTMLWrites = [];
  const originalInnerHTML = Object.getOwnPropertyDescriptor(
    MockElement.prototype,
    "innerHTML"
  );

  Object.defineProperty(MockElement.prototype, "innerHTML", {
    get: originalInnerHTML.get,
    set(value) {
      if (value !== "") {
        innerHTMLWrites.push(String(value));
      }
      originalInnerHTML.set.call(this, value);
    },
  });

  const context = {
    document: {
      querySelector(selector) {
        return elements[selector];
      },
      createElement(tagName) {
        return new MockElement(tagName);
      },
    },
    localStorage: {
      getItem(key) {
        assert.equal(key, "db_items");
        return JSON.stringify(storedItems);
      },
      setItem() {
        throw new Error("setItem should not be called while loading items");
      },
    },
  };

  const script = fs.readFileSync(path.join(__dirname, "scriptPad.js"), "utf8");
  vm.runInNewContext(script, context);

  Object.defineProperty(MockElement.prototype, "innerHTML", originalInnerHTML);

  return { elements, innerHTMLWrites };
}

test("renders stored transaction descriptions as text", () => {
  const payload = '<img src=x onerror="globalThis.pwned = true">';
  const { elements, innerHTMLWrites } = loadScriptWithItems([
    { desc: payload, amount: "10.00", type: "Entrada" },
  ]);

  assert.equal(
    innerHTMLWrites.some((write) => write.includes(payload)),
    false
  );

  const [row] = elements.tbody.children;
  assert.equal(row.children[0].textContent, payload);
  assert.equal(row.children[1].textContent, "R$ 10.00");
  assert.equal(row.children[2].children[0].className, "bx bxs-chevron-up-circle");
  assert.equal(row.children[3].children[0].children[0].className, "bx bx-trash");
});
