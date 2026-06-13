const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

class Element {
  constructor(tagName, innerHTMLAssignments) {
    this.tagName = tagName;
    this.children = [];
    this.className = "";
    this.value = "";
    this.listeners = {};
    this.innerHTMLAssignments = innerHTMLAssignments;
    this._innerHTML = "";
    this._textContent = "";
  }

  appendChild(child) {
    this.children.push(child);
    child.parentNode = this;
    return child;
  }

  addEventListener(eventName, handler) {
    this.listeners[eventName] = handler;
  }

  click() {
    this.listeners.click();
  }

  set innerHTML(value) {
    this.innerHTMLAssignments.push(String(value));
    this.children = [];
    this._innerHTML = String(value);
    this._textContent = "";
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set textContent(value) {
    this.children = [];
    this._textContent = String(value);
    this._innerHTML = "";
  }

  get textContent() {
    return this._textContent + this.children.map((child) => child.textContent).join("");
  }
}

function runScriptPad(initialItems) {
  const innerHTMLAssignments = [];
  const storageWrites = [];

  const elements = {
    tbody: new Element("tbody", innerHTMLAssignments),
    desc: new Element("input", innerHTMLAssignments),
    amount: new Element("input", innerHTMLAssignments),
    type: new Element("select", innerHTMLAssignments),
    btnNew: new Element("button", innerHTMLAssignments),
    incomes: new Element("span", innerHTMLAssignments),
    expenses: new Element("span", innerHTMLAssignments),
    total: new Element("span", innerHTMLAssignments),
  };

  const document = {
    querySelector(selector) {
      if (selector === "tbody") return elements.tbody;
      if (selector === "#desc") return elements.desc;
      if (selector === "#amount") return elements.amount;
      if (selector === "#type") return elements.type;
      if (selector === "#btnNew") return elements.btnNew;
      if (selector === ".incomes") return elements.incomes;
      if (selector === ".expenses") return elements.expenses;
      if (selector === ".total") return elements.total;
      throw new Error(`Unexpected selector: ${selector}`);
    },
    createElement(tagName) {
      return new Element(tagName, innerHTMLAssignments);
    },
  };

  const sandbox = {
    document,
    localStorage: {
      getItem(key) {
        assert.equal(key, "db_items");
        return JSON.stringify(initialItems);
      },
      setItem(key, value) {
        storageWrites.push({ key, value });
      },
    },
    alert() {},
  };

  vm.runInNewContext(fs.readFileSync("scriptPad.js", "utf8"), sandbox, {
    filename: "scriptPad.js",
  });

  return { elements, innerHTMLAssignments, storageWrites };
}

test("renders stored descriptions as text instead of HTML", () => {
  const maliciousDescription = '<img src=x onerror="globalThis.compromised = true">';
  const { elements, innerHTMLAssignments } = runScriptPad([
    { desc: maliciousDescription, amount: "12.00", type: "Entrada" },
  ]);

  assert.equal(elements.tbody.children.length, 1);
  const [descriptionCell, amountCell, typeCell, actionCell] =
    elements.tbody.children[0].children;

  assert.equal(descriptionCell.textContent, maliciousDescription);
  assert.equal(amountCell.textContent, "R$ 12.00");
  assert.equal(typeCell.children[0].className, "bx bxs-chevron-up-circle");
  assert.equal(actionCell.children[0].tagName, "button");
  assert.ok(
    innerHTMLAssignments.every((value) => !value.includes(maliciousDescription)),
    "stored descriptions must never be interpolated into innerHTML"
  );
});

test("delete button removes the row it was created for", () => {
  const { elements, storageWrites } = runScriptPad([
    { desc: "Bread", amount: "3.50", type: "Entrada" },
    { desc: "Flour", amount: "1.25", type: "Saída" },
  ]);

  const secondRowDeleteButton = elements.tbody.children[1].children[3].children[0];
  secondRowDeleteButton.click();

  assert.deepEqual(storageWrites, [
    {
      key: "db_items",
      value: JSON.stringify([{ desc: "Bread", amount: "3.50", type: "Entrada" }]),
    },
  ]);
});
