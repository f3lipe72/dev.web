const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

class ClassList {
  constructor() {
    this.classes = [];
  }

  add(...classes) {
    this.classes.push(...classes);
  }

  contains(className) {
    return this.classes.includes(className);
  }
}

class Element {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.classList = new ClassList();
    this.onclick = null;
    this.type = "";
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

  set innerHTML(value) {
    assert.equal(value, "", "script should only use innerHTML to clear rows");
    this.children = [];
    this._textContent = "";
  }

  get innerHTML() {
    return "";
  }

  set textContent(value) {
    this._textContent = String(value);
  }

  get textContent() {
    return (
      this._textContent +
      this.children.map((child) => child.textContent).join("")
    );
  }
}

function loadScript() {
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

  const context = {
    alert() {},
    document: {
      createElement: (tagName) => new Element(tagName),
      querySelector: (selector) => elements[selector],
    },
    localStorage: {
      getItem: () => null,
      setItem() {},
    },
  };

  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "scriptPad.js"), "utf8"),
    context,
    { filename: "scriptPad.js" }
  );

  return { context, elements };
}

test("transaction descriptions are rendered as text, not HTML", () => {
  const { context, elements } = loadScript();
  const payload = '<img src=x onerror="localStorage.clear()">';

  context.insertItem({ desc: payload, amount: "10.00", type: "Entrada" }, 0);

  const row = elements.tbody.children[0];
  assert.equal(row.children[0].textContent, payload);
  assert.equal(row.children[0].children.length, 0);
  assert.equal(row.children[1].textContent, "R$ 10.00");
  assert.equal(row.children[2].classList.contains("columnType"), true);
  assert.equal(
    row.children[2].children[0].classList.contains("bxs-chevron-up-circle"),
    true
  );
  assert.equal(typeof row.children[3].children[0].onclick, "function");
});
