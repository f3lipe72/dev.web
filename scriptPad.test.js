const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

class Element {
  constructor(tagName, innerHTMLWrites) {
    this.tagName = tagName;
    this.children = [];
    this.className = "";
    this.onclick = null;
    this.value = "";
    this._textContent = "";
    this._innerHTML = "";
    this.innerHTMLWrites = innerHTMLWrites;
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  set textContent(value) {
    this._textContent = String(value ?? "");
  }

  get textContent() {
    return this._textContent;
  }

  set innerHTML(value) {
    this._innerHTML = String(value ?? "");
    this.innerHTMLWrites.push({ tagName: this.tagName, value: this._innerHTML });

    if (this._innerHTML === "") {
      this.children = [];
    }
  }

  get innerHTML() {
    return this._innerHTML;
  }
}

function runScriptWithStoredItems(items) {
  const innerHTMLWrites = [];
  const createElement = (tagName) => new Element(tagName, innerHTMLWrites);

  const elements = {
    tbody: createElement("tbody"),
    "#desc": createElement("input"),
    "#amount": createElement("input"),
    "#type": createElement("select"),
    "#btnNew": createElement("button"),
    ".incomes": createElement("span"),
    ".expenses": createElement("span"),
    ".total": createElement("span"),
  };

  const context = {
    alert() {},
    document: {
      createElement,
      querySelector(selector) {
        return elements[selector];
      },
    },
    localStorage: {
      getItem(key) {
        return key === "db_items" ? JSON.stringify(items) : null;
      },
      setItem() {},
    },
  };

  const script = fs.readFileSync(path.join(__dirname, "scriptPad.js"), "utf8");
  vm.runInNewContext(script, context, { filename: "scriptPad.js" });

  return { elements, innerHTMLWrites };
}

test("stored transaction descriptions are rendered as text, not HTML", () => {
  const payload = '<img src=x onerror="globalThis.compromised = true">';

  const { elements, innerHTMLWrites } = runScriptWithStoredItems([
    { desc: payload, amount: "10.00", type: "Entrada" },
  ]);

  assert.equal(elements.tbody.children.length, 1);
  assert.equal(elements.tbody.children[0].children[0].textContent, payload);
  assert.equal(
    innerHTMLWrites.some(({ value }) => value.includes(payload)),
    false
  );
});
