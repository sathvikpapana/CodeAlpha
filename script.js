/* =====================================================================
   LUMEN CALCULATOR — SCRIPT.JS
   Responsible for:
     1. Calculator state machine (digit entry, operators, chaining)
     2. Scientific functions (sin, cos, tan, sqrt, square, power, π, e, log)
     3. History panel backed by localStorage (last 10 calculations)
     4. Copy-to-clipboard, theme toggle, ripple FX
     5. Full keyboard support
   ===================================================================== */

(function () {
  "use strict";

  /* -------------------------------------------------------------------
     DOM REFERENCES
  ------------------------------------------------------------------- */
  const expressionEl   = document.getElementById("expression");
  const resultEl       = document.getElementById("result");
  const keypad          = document.querySelector(".keypad");
  const scientificPanel = document.getElementById("scientificPanel");
  const modeToggle       = document.getElementById("modeToggle");
  const themeToggle       = document.getElementById("themeToggle");
  const historyToggle      = document.getElementById("historyToggle");
  const historyDrawer       = document.getElementById("historyDrawer");
  const drawerBackdrop        = document.getElementById("drawerBackdrop");
  const historyList             = document.getElementById("historyList");
  const historyEmpty             = document.getElementById("historyEmpty");
  const clearHistoryBtn           = document.getElementById("clearHistory");
  const copyBtn                    = document.getElementById("copyBtn");
  const copyToast                   = document.getElementById("copyToast");

  const HISTORY_KEY = "lumen_calc_history";
  const THEME_KEY = "lumen_calc_theme";
  const MAX_HISTORY = 10;

  /* -------------------------------------------------------------------
     CALCULATOR STATE
     A classic "running total" state machine (not a full expression
     parser) — predictable, easy to reason about, and matches the
     behaviour users expect from a standard calculator.
  ------------------------------------------------------------------- */
  const state = {
    previous: null,     // number entered before the operator, as string
    operator: null,     // '+', '-', '*', '/'
    current: "0",        // number currently being typed / displayed
    overwrite: false,     // true right after an operator or equals,
                           // meaning the next digit should start fresh
    expressionText: "",    // human-readable trail shown above the result
  };

  /* -------------------------------------------------------------------
     RENDERING
  ------------------------------------------------------------------- */
  function render() {
    resultEl.textContent = formatForDisplay(state.current);
    resultEl.classList.remove("is-error");
    expressionEl.textContent = state.expressionText || "0";
  }

  function formatForDisplay(value) {
    if (value === "Error") return "Error";
    // Avoid runaway decimal length while keeping the value accurate
    const num = Number(value);
    if (Number.isNaN(num)) return value;
    if (!isFinite(num)) return "Error";

    // Preserve a trailing decimal point while the user is still typing
    if (typeof value === "string" && value.endsWith(".")) return value;

    const str = num.toString();
    if (str.length <= 14) return str;
    return num.toPrecision(10).replace(/\.?0+$/, "");
  }

  function showError() {
    state.current = "Error";
    state.previous = null;
    state.operator = null;
    state.overwrite = true;
    resultEl.textContent = "Error";
    resultEl.classList.add("is-error");
  }

  /* -------------------------------------------------------------------
     OPERATOR SYMBOLS (internal key -> display glyph)
  ------------------------------------------------------------------- */
  const OP_SYMBOL = { add: "+", subtract: "\u2212", multiply: "\u00d7", divide: "\u00f7", power: "^" };

  /* -------------------------------------------------------------------
     CORE INPUT HANDLERS
  ------------------------------------------------------------------- */
  function inputDigit(digit) {
    if (state.current === "Error" || state.overwrite) {
      state.current = digit === "." ? "0." : digit;
      state.overwrite = false;
      render();
      return;
    }

    if (digit === "." && state.current.includes(".")) return; // no double decimals
    if (state.current === "0" && digit !== ".") {
      state.current = digit; // replace leading zero
    } else {
      state.current += digit;
    }
    render();
  }

  function chooseOperator(opKey) {
    if (state.current === "Error") return;

    // Chain operations: if an operator is already pending, resolve it first
    if (state.operator && !state.overwrite) {
      compute();
    }

    state.previous = state.current;
    state.operator = opKey;
    state.overwrite = true;
    state.expressionText = `${trimTrailingDot(state.previous)} ${OP_SYMBOL[opKey]}`;
    render();
  }

  function trimTrailingDot(v) {
    return v.endsWith(".") ? v.slice(0, -1) : v;
  }

  function compute() {
    if (state.operator === null || state.previous === null) return;

    const a = parseFloat(state.previous);
    const b = parseFloat(state.current);
    const symbol = OP_SYMBOL[state.operator]; // captured before we clear state.operator
    let output;

    switch (state.operator) {
      case "add":
        output = a + b;
        break;
      case "subtract":
        output = a - b;
        break;
      case "multiply":
        output = a * b;
        break;
      case "divide":
        // Divide-by-zero error handling
        if (b === 0) {
          showError();
          addHistoryEntry(`${a} \u00f7 ${b}`, "Error");
          return;
        }
        output = a / b;
        break;
      default:
        return;
    }

    state.expressionText = `${a} ${symbol} ${b} =`;
    state.current = String(output);
    state.previous = null;
    state.operator = null;
    state.overwrite = true;

    addHistoryEntry(`${a} ${symbol} ${b}`, formatForDisplay(state.current));
    render();
    pulseResult();
  }

  function handleEquals() {
    if (state.current === "Error") return;
    if (state.operator === null) return; // nothing to compute yet
    compute();
  }

  function clearAll() {
    state.previous = null;
    state.operator = null;
    state.current = "0";
    state.overwrite = false;
    state.expressionText = "";
    render();
  }

  function deleteLast() {
    if (state.current === "Error" || state.overwrite) {
      clearAll();
      return;
    }
    state.current = state.current.length > 1 ? state.current.slice(0, -1) : "0";
    render();
  }

  function applyPercent() {
    if (state.current === "Error") return;
    const value = parseFloat(state.current);
    state.current = String(value / 100);
    state.overwrite = true;
    render();
  }

  /* -------------------------------------------------------------------
     SCIENTIFIC FUNCTIONS
     All trig functions operate in degrees for everyday usability.
  ------------------------------------------------------------------- */
  function applyScientific(action) {
    if (state.current === "Error") return;
    const value = parseFloat(state.current);
    let output;
    let label;

    switch (action) {
      case "sin":
        output = Math.sin(toRadians(value));
        label = `sin(${value})`;
        break;
      case "cos":
        output = Math.cos(toRadians(value));
        label = `cos(${value})`;
        break;
      case "tan":
        output = Math.tan(toRadians(value));
        label = `tan(${value})`;
        break;
      case "sqrt":
        if (value < 0) return showError();
        output = Math.sqrt(value);
        label = `\u221a(${value})`;
        break;
      case "square":
        output = value * value;
        label = `${value}\u00b2`;
        break;
      case "power":
        // x^y — sets up a pending "power" operator so the user can type
        // the exponent next, reusing the standard operator flow
        chooseOperator("power");
        return;
      case "pi":
        output = Math.PI;
        label = "\u03c0";
        break;
      case "e":
        output = Math.E;
        label = "e";
        break;
      case "log":
        if (value <= 0) return showError();
        output = Math.log10(value);
        label = `log(${value})`;
        break;
      default:
        return;
    }

    state.current = String(output);
    state.expressionText = `${label} =`;
    state.overwrite = true;
    render();
    pulseResult();
    addHistoryEntry(label, formatForDisplay(state.current));
  }

  function toRadians(deg) {
    return (deg * Math.PI) / 180;
  }

  /* Extend compute() to understand the "power" pseudo-operator */
  const originalCompute = compute;
  compute = function () {
    if (state.operator === "power") {
      const a = parseFloat(state.previous);
      const b = parseFloat(state.current);
      const output = Math.pow(a, b);
      state.expressionText = `${a} ^ ${b} =`;
      state.current = String(output);
      state.previous = null;
      state.operator = null;
      state.overwrite = true;
      addHistoryEntry(`${a} ^ ${b}`, formatForDisplay(state.current));
      render();
      pulseResult();
      return;
    }
    originalCompute();
  };

  /* -------------------------------------------------------------------
     RESULT PULSE ANIMATION (triggered on '=' and scientific results)
  ------------------------------------------------------------------- */
  function pulseResult() {
    resultEl.classList.remove("is-pulsing");
    // Force reflow so the animation can restart on repeated presses
    void resultEl.offsetWidth;
    resultEl.classList.add("is-pulsing");
  }

  /* -------------------------------------------------------------------
     HISTORY (localStorage, capped at MAX_HISTORY entries)
  ------------------------------------------------------------------- */
  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.warn("Could not read calculator history:", err);
      return [];
    }
  }

  function saveHistory(list) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    } catch (err) {
      console.warn("Could not save calculator history:", err);
    }
  }

  function addHistoryEntry(expression, result) {
    const list = loadHistory();
    list.unshift({ expression, result, ts: Date.now() });
    const trimmed = list.slice(0, MAX_HISTORY);
    saveHistory(trimmed);
    renderHistory();
  }

  function renderHistory() {
    const list = loadHistory();
    historyList.innerHTML = "";
    historyEmpty.hidden = list.length > 0;

    list.forEach((entry) => {
      const li = document.createElement("li");
      li.className = "history-item";
      li.innerHTML = `
        <div class="history-expression">${entry.expression}</div>
        <div class="history-result">${entry.result}</div>
      `;
      // Clicking a history item loads its result back into the display
      li.addEventListener("click", () => {
        state.current = String(entry.result);
        state.previous = null;
        state.operator = null;
        state.overwrite = true;
        state.expressionText = entry.expression + " =";
        render();
        closeHistoryDrawer();
      });
      historyList.appendChild(li);
    });
  }

  function clearHistory() {
    saveHistory([]);
    renderHistory();
  }

  /* -------------------------------------------------------------------
     HISTORY DRAWER OPEN/CLOSE (mobile overlay + desktop panel)
  ------------------------------------------------------------------- */
  function openHistoryDrawer() {
    historyDrawer.classList.add("is-open");
    drawerBackdrop.classList.add("is-open");
    historyDrawer.setAttribute("aria-hidden", "false");
  }

  function closeHistoryDrawer() {
    historyDrawer.classList.remove("is-open");
    drawerBackdrop.classList.remove("is-open");
    historyDrawer.setAttribute("aria-hidden", "true");
  }

  historyToggle.addEventListener("click", () => {
    historyDrawer.classList.contains("is-open") ? closeHistoryDrawer() : openHistoryDrawer();
  });
  drawerBackdrop.addEventListener("click", closeHistoryDrawer);
  clearHistoryBtn.addEventListener("click", clearHistory);

  /* -------------------------------------------------------------------
     THEME TOGGLE (persisted in localStorage)
  ------------------------------------------------------------------- */
  function applyTheme(theme) {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }

  themeToggle.addEventListener("click", () => {
    const current = document.body.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  });

  (function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) applyTheme(saved);
  })();

  /* -------------------------------------------------------------------
     SCIENTIFIC MODE TOGGLE
  ------------------------------------------------------------------- */
  modeToggle.addEventListener("click", () => {
    const isOpen = scientificPanel.classList.toggle("is-open");
    modeToggle.setAttribute("aria-pressed", String(isOpen));
  });

  /* -------------------------------------------------------------------
     COPY RESULT TO CLIPBOARD
  ------------------------------------------------------------------- */
  copyBtn.addEventListener("click", async () => {
    const text = resultEl.textContent;
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      // Fallback for browsers without Clipboard API permission
      const temp = document.createElement("textarea");
      temp.value = text;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      document.body.removeChild(temp);
    }
    copyToast.classList.add("is-visible");
    setTimeout(() => copyToast.classList.remove("is-visible"), 1200);
  });

  /* -------------------------------------------------------------------
     RIPPLE BUTTON ANIMATION
  ------------------------------------------------------------------- */
  function attachRipple(button) {
    button.addEventListener("click", (e) => {
      const rect = button.getBoundingClientRect();
      const ripple = document.createElement("span");
      const size = Math.max(rect.width, rect.height);
      const x = (e.clientX || rect.left + rect.width / 2) - rect.left - size / 2;
      const y = (e.clientY || rect.top + rect.height / 2) - rect.top - size / 2;

      ripple.className = "ripple";
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;

      button.appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove());
    });
  }

  document.querySelectorAll(".btn").forEach(attachRipple);

  /* -------------------------------------------------------------------
     BUTTON CLICK ROUTING (event delegation)
  ------------------------------------------------------------------- */
  document.querySelectorAll(".btn[data-value]").forEach((btn) => {
    btn.addEventListener("click", () => inputDigit(btn.dataset.value));
  });

  keypad.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn[data-action]");
    if (!btn) return;
    routeAction(btn.dataset.action);
  });

  scientificPanel.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn[data-action]");
    if (!btn) return;
    routeAction(btn.dataset.action);
  });

  function routeAction(action) {
    switch (action) {
      case "clear":
        clearAll();
        break;
      case "delete":
        deleteLast();
        break;
      case "percent":
        applyPercent();
        break;
      case "add":
      case "subtract":
      case "multiply":
      case "divide":
        chooseOperator(action);
        break;
      case "equals":
        handleEquals();
        break;
      case "sin":
      case "cos":
      case "tan":
      case "sqrt":
      case "square":
      case "power":
      case "pi":
      case "e":
      case "log":
        applyScientific(action);
        break;
    }
  }

  /* -------------------------------------------------------------------
     KEYBOARD SUPPORT
  ------------------------------------------------------------------- */
  const KEY_MAP = {
    "+": "add",
    "-": "subtract",
    "*": "multiply",
    "/": "divide",
    "Enter": "equals",
    "=": "equals",
    "Backspace": "delete",
    "Escape": "clear",
    "%": "percent",
  };

  document.addEventListener("keydown", (e) => {
    if (/^[0-9]$/.test(e.key)) {
      inputDigit(e.key);
      return;
    }
    if (e.key === ".") {
      inputDigit(".");
      return;
    }
    if (KEY_MAP[e.key]) {
      e.preventDefault();
      routeAction(KEY_MAP[e.key]);
    }
  });

  /* -------------------------------------------------------------------
     INIT
  ------------------------------------------------------------------- */
  render();
  renderHistory();
})();
