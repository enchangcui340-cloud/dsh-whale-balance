// Client half of dsh-whale-balance (browser bundle).
// Renders the widget into the shell.overlay slot: image + text overlay,
// draggable, click-to-refresh, 60s auto-refresh via fetch + setInterval.
window.__ModuleLoader__.load({
  id: "dsh-whale-balance",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");

    const CSS = `
.hb-widget {
  position: fixed;
  right: 20px;
  bottom: 16px;
  z-index: 10000;
  pointer-events: auto;
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  --hb-w: 280px;
}
.hb-widget.hb-dragging { cursor: grabbing; }
.hb-widget:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary, #4d6bfe);
  outline-offset: 4px;
  border-radius: 12px;
}
.hb-imgwrap { position: relative; width: var(--hb-w); height: var(--hb-w); }
.hb-img {
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
  filter: drop-shadow(0 6px 18px rgba(20, 24, 60, 0.16));
}
.hb-text {
  position: absolute;
  left: 44.35%;
  top: calc(23.1% + 10px);
  width: 52%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(var(--hb-w) * 0.018);
  text-align: center;
  color: #536ba9;
  font-family: var(--dsw-font-family, system-ui, -apple-system, 'Segoe UI', sans-serif);
}
.hb-label {
  font-size: calc(var(--hb-w) * 0.0495);
  font-weight: 600;
  letter-spacing: 0.05em;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hb-value {
  font-size: calc(var(--hb-w) * 0.0975);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hb-value.hb-error { font-size: calc(var(--hb-w) * 0.045); font-weight: 600; white-space: normal; }
.hb-hint {
  font-size: calc(var(--hb-w) * 0.036);
  opacity: 0.9;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hb-spinner {
  display: inline-block;
  width: calc(var(--hb-w) * 0.03);
  height: calc(var(--hb-w) * 0.03);
  margin-right: calc(var(--hb-w) * 0.018);
  border: 2px solid #c3cbe8;
  border-top-color: #536ba9;
  border-radius: 50%;
  animation: hb-spin 0.8s linear infinite;
  vertical-align: -1px;
}
@keyframes hb-spin { to { transform: rotate(360deg); } }
`;

    // Inject the package-owned stylesheet once.
    if (typeof document !== "undefined") {
      const tagId = "dsh-whale-balance/styles";
      if (document.querySelector('style[data-plugin-css="' + tagId + '"]') === null) {
        const tag = document.createElement("style");
        tag.setAttribute("data-plugin", "dsh-whale-balance");
        tag.setAttribute("data-plugin-css", tagId);
        tag.textContent = CSS;
        document.head.append(tag);
      }
    }

    function WhaleWidget() {
      const [state, setState] = React.useState({ loading: true, balance: null, currency: "CNY", failed: false, imgError: false });
      const [pos, setPos] = React.useState(null);
      const [drag, setDrag] = React.useState(null);

      const load = () => {
        setState((prev) => ({ ...prev, loading: true }));
        fetch("/dsh-whale/balance")
          .then((r) => r.json())
          .then((res) => {
            if (res !== null && typeof res === "object" && res.ok === true) {
              setState((prev) => ({ loading: false, balance: String(res.balance), currency: res.currency || "CNY", failed: false, imgError: prev.imgError }));
            } else {
              setState((prev) => ({ ...prev, loading: false, failed: true }));
            }
          })
          .catch(() => setState((prev) => ({ ...prev, loading: false, failed: true })));
      };

      React.useEffect(() => {
        load();
        const id = setInterval(load, 60000);
        return () => clearInterval(id);
      }, []);

      const onPointerDown = (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const base = pos !== null ? pos : { x: rect.left, y: rect.top };
        setPos(base);
        setDrag({ pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, baseX: base.x, baseY: base.y, moved: false });
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
      };
      const onPointerMove = (e) => {
        if (drag === null || drag.pointerId !== e.pointerId) return;
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        const moved = drag.moved || Math.abs(dx) > 3 || Math.abs(dy) > 3;
        if (moved) {
          const el = e.currentTarget;
          const maxX = Math.max(0, window.innerWidth - el.offsetWidth);
          const maxY = Math.max(0, window.innerHeight - el.offsetHeight);
          setPos({
            x: Math.min(Math.max(0, drag.baseX + dx), maxX),
            y: Math.min(Math.max(0, drag.baseY + dy), maxY),
          });
        }
        if (moved !== drag.moved) setDrag({ ...drag, moved });
      };
      const onPointerUp = (e) => {
        if (drag === null || drag.pointerId !== e.pointerId) return;
        const wasMove = drag.moved;
        setDrag(null);
        if (!wasMove) load();
      };
      const onPointerCancel = () => setDrag(null);
      const onKeyDown = (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); load(); }
      };

      const showLoading = state.loading && state.balance === null;
      const showError = state.failed && state.balance === null;
      let valueEl;
      if (state.imgError) {
        valueEl = React.createElement("div", { className: "hb-value hb-error" }, "图片加载失败");
      } else if (showLoading) {
        valueEl = React.createElement("div", { className: "hb-value" },
          React.createElement("span", { className: "hb-spinner" }), "加载中…");
      } else if (showError) {
        valueEl = React.createElement("div", { className: "hb-value hb-error" }, "余额获取失败");
      } else {
        const symbol = state.currency === "CNY" ? "¥" : (state.currency || "") + " ";
        const num = Number(state.balance);
        const shown = Number.isFinite(num) ? num.toFixed(2) : state.balance;
        valueEl = React.createElement("div", { className: "hb-value" }, symbol + " " + shown);
      }
      const hintText = state.loading ? "刷新中…" : (state.failed ? "点击重试" : "点击刷新");
      const hintEl = state.imgError ? null : React.createElement("div", { className: "hb-hint" }, hintText);

      const style = pos === null ? undefined : { left: pos.x + "px", top: pos.y + "px" };
      const dragging = drag !== null;

      return React.createElement("div", {
        className: "hb-widget" + (dragging ? " hb-dragging" : ""),
        style,
        role: "button",
        tabIndex: 0,
        "aria-label": "DeepSeek 余额，点击刷新，按住拖动",
        title: "DeepSeek 余额 · 点击刷新 · 按住可拖动",
        onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onKeyDown,
      },
        React.createElement("div", { className: "hb-imgwrap" },
          React.createElement("img", {
            className: "hb-img",
            src: "/dsh-whale/whale.png",
            draggable: false,
            alt: "",
            onError: () => setState((prev) => ({ ...prev, imgError: true })),
          }),
          React.createElement("div", { className: "hb-text" },
            React.createElement("div", { className: "hb-label" }, "DeepSeek 余额"),
            valueEl,
            hintEl,
          ),
        ),
      );
    }

    const inject = ["slots"];
    function apply(ctx) {
      ctx.slots.inject("shell.overlay", () => ctx.slots.register(
        { name: "shell.overlay", id: "whale-balance", order: 100 },
        () => React.createElement(WhaleWidget),
      ));
    }
    exports.inject = inject;
    exports.apply = apply;
    return module.exports;
  },
});
