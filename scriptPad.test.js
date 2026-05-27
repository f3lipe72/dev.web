const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

function createMockDocument() {
  const innerHTMLAssignments = [];

  class MockElement {
    constructor(tagName) {
      this.tagName = tagName.toUpperCase();
      this.children = [];
      this.value = "";
      this.onclick = null;
      this._className = "";
      this._innerHTML = "";
      this._textContent = "";
      this.classList = {
        add: (...classes) => {
          const classNames = new Set(this.className.split(/\s+/).filter(Boolean));
          classes.forEach((className) => classNames.add(className));
          this.className = [...classNames].join(" ");
        },
      };
    }

    get className() {
      return this._className;
    }

    set className(value) {
      this._className = String(value);
    }

    get innerHTML() {
      return this._innerHTML;
    }

    set innerHTML(value) {
      const html = String(value);
      innerHTMLAssignments.push(html);
      this._innerHTML = html;
      this.children = [];
    }

    get textContent() {
      return this._textContent;
    }

    set textContent(value) {
      this._textContent = String(value);
    }

    appendChild(child) {
      this.children.push(child);
      return child;
    }
  }

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

  return {
    innerHTMLAssignments,
    elements,
    createElement: (tagName) => new MockElement(tagName),
    querySelector: (selector) => elements[selector],
  };
}

test("saved descriptions are rendered as text, not executable markup", () => {
  const payload = '<img src=x onerror="globalThis.pwned = true">';
  const document = createMockDocument();
  const script = fs.readFileSync("scriptPad.js", "utf8");

  vm.runInNewContext(script, {
    document,
    localStorage: {
      getItem: () =>
        JSON.stringify([{ desc: payload, amount: "10.00", type: "Entrada" }]),
      setItem: () => {},
    },
  });

  const [row] = document.elements.tbody.children;

  assert.equal(row.children[0].textContent, payload);
  assert.equal(
    document.innerHTMLAssignments.some((html) => html.includes(payload)),
    false
  );
});
