const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

class Element {
  constructor(tagName, htmlAssignments) {
    this.tagName = tagName;
    this.children = [];
    this.className = "";
    this.value = "";
    this.onclick = null;
    this._innerHTML = "";
    this._textContent = "";
    this.htmlAssignments = htmlAssignments;
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    this.children = [];
    this.htmlAssignments.push({ element: this.tagName, value: this._innerHTML });
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set textContent(value) {
    this._textContent = String(value);
  }

  get textContent() {
    if (this.children.length > 0) {
      return this.children.map((child) => child.textContent).join("");
    }

    return this._textContent;
  }
}

function createContext(storedItems) {
  const htmlAssignments = [];
  const elements = {
    tbody: new Element("tbody", htmlAssignments),
    "#desc": new Element("input", htmlAssignments),
    "#amount": new Element("input", htmlAssignments),
    "#type": new Element("select", htmlAssignments),
    "#btnNew": new Element("button", htmlAssignments),
    ".incomes": new Element("span", htmlAssignments),
    ".expenses": new Element("span", htmlAssignments),
    ".total": new Element("span", htmlAssignments),
  };
  const storage = {
    db_items: JSON.stringify(storedItems),
  };

  return {
    document: {
      querySelector(selector) {
        return elements[selector];
      },
      createElement(tagName) {
        return new Element(tagName, htmlAssignments);
      },
      elements,
    },
    localStorage: {
      getItem(key) {
        return storage[key] ?? null;
      },
      setItem(key, value) {
        storage[key] = String(value);
      },
    },
    alert() {},
    htmlAssignments,
  };
}

test("stored transaction descriptions are rendered as text, not HTML", () => {
  const maliciousDesc = '<img src=x onerror="globalThis.xss = true">';
  const context = createContext([
    {
      desc: maliciousDesc,
      amount: "12.34",
      type: "Entrada",
    },
  ]);
  const script = fs.readFileSync(path.join(__dirname, "scriptPad.js"), "utf8");

  vm.runInNewContext(script, context, { filename: "scriptPad.js" });

  const [row] = context.document.elements.tbody.children;
  assert.ok(row, "expected one transaction row to be rendered");
  assert.equal(row.children[0].textContent, maliciousDesc);
  assert.equal(row.children[0].children.length, 0);
  assert.equal(
    context.htmlAssignments.some((assignment) =>
      assignment.value.includes(maliciousDesc)
    ),
    false
  );
});
