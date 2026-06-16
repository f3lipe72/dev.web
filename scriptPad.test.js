const assert = require("node:assert/strict");
const test = require("node:test");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");

const scriptPath = path.join(__dirname, "scriptPad.js");
const scriptSource = fs.readFileSync(scriptPath, "utf8");

class Element {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.textContent = "";
    this.onclick = null;
    this.listeners = {};
    this.classList = {
      values: [],
      add: (...classNames) => {
        this.classList.values.push(...classNames);
      },
    };
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  addEventListener(eventName, handler) {
    this.listeners[eventName] = handler;
  }

  set innerHTML(value) {
    this._innerHTML = value;

    if (value === "") {
      this.children = [];
    }

    if (this.onDangerousInnerHTML && /<img\b[^>]*\bonerror=/i.test(value)) {
      this.onDangerousInnerHTML(value);
    }
  }

  get innerHTML() {
    return this._innerHTML || "";
  }
}

function createHarness(storedItems) {
  let dangerousInnerHTML = null;

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

  const flagDangerousHTML = (html) => {
    dangerousInnerHTML = html;
  };

  Object.values(elements).forEach((element) => {
    element.onDangerousInnerHTML = flagDangerousHTML;
  });

  const storage = {
    db_items: JSON.stringify(storedItems),
  };

  return {
    context: {
      document: {
        querySelector: (selector) => elements[selector],
        createElement: (tagName) => {
          const element = new Element(tagName);
          element.onDangerousInnerHTML = flagDangerousHTML;
          return element;
        },
      },
      localStorage: {
        getItem: (key) => storage[key] || null,
        setItem: (key, value) => {
          storage[key] = value;
        },
      },
      alert: () => {},
    },
    elements,
    getDangerousInnerHTML: () => dangerousInnerHTML,
  };
}

test("stored transaction descriptions render as text instead of executable HTML", () => {
  const payload = '<img src=x onerror="globalThis.compromised = true">';
  const harness = createHarness([
    {
      desc: payload,
      amount: "12.50",
      type: "Entrada",
    },
  ]);

  vm.runInNewContext(scriptSource, harness.context, { filename: scriptPath });

  const renderedRow = harness.elements.tbody.children[0];

  assert.equal(harness.getDangerousInnerHTML(), null);
  assert.equal(renderedRow.children[0].textContent, payload);
  assert.equal(renderedRow.children[1].textContent, "R$ 12.50");
});
