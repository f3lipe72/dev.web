const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

class Element {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.className = "";
    this.onclick = null;
    this.parentNode = null;
    this.value = "";
    this._innerHTML = "";
    this._textContent = "";
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  set innerHTML(value) {
    const html = String(value);

    if (html.includes("<img") || html.includes("onerror")) {
      throw new Error(`Unsafe innerHTML assignment: ${html}`);
    }

    this._innerHTML = html;

    if (html === "") {
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
    return (
      this._textContent + this.children.map((child) => child.textContent).join("")
    );
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
    createElement(tagName) {
      return new Element(tagName);
    },
    querySelector(selector) {
      const element = elements[selector];
      assert.ok(element, `Unexpected selector: ${selector}`);
      return element;
    },
  };
}

test("stored transaction descriptions are rendered as text", () => {
  const document = createDocument();
  const maliciousDescription = '<img src=x onerror="globalThis.__xss = true">';
  const source = fs.readFileSync(path.join(__dirname, "scriptPad.js"), "utf8");
  const context = {
    document,
    localStorage: {
      getItem(key) {
        assert.equal(key, "db_items");
        return JSON.stringify([
          {
            desc: maliciousDescription,
            amount: "12.34",
            type: "Entrada",
          },
        ]);
      },
      setItem() {
        throw new Error("setItem should not run while loading stored items");
      },
    },
  };

  vm.createContext(context);

  assert.doesNotThrow(() => {
    vm.runInContext(source, context, { filename: "scriptPad.js" });
  });

  const row = document.elements.tbody.children[0];

  assert.equal(row.children[0].textContent, maliciousDescription);
  assert.equal(row.children[1].textContent, "R$ 12.34");
  assert.equal(row.children[2].children[0].className, "bx bxs-chevron-up-circle");
  assert.equal(context.__xss, undefined);
});
