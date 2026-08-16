import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// 1) Host: import the ESM module and check its exports.
const hostUrl = pathToFileURL("C:/Users/TB16/Desktop/dsh-whale-balance/lib/index.js").href;
const host = await import(hostUrl);
console.log("host name=", host.name, "inject=", JSON.stringify(host.inject), "apply=", typeof host.apply);

// 2) Client: materialize the bundle factory with a fake module loader.
const clientSrc = readFileSync("C:/Users/TB16/Desktop/dsh-whale-balance/lib/client.js", "utf8");
let registeredId = null;
let exported = null;
globalThis.window = {
  __ModuleLoader__: {
    load(handoff) {
      registeredId = handoff.id;
      const fakeReact = {
        createElement: () => null,
        useState: (init) => [init, () => {}],
        useEffect: () => {},
      };
      const moduleRecord = { exports: {} };
      const requireStub = (spec) => {
        if (spec === "react") return fakeReact;
        throw new Error("unexpected require: " + spec);
      };
      const result = handoff.factory(requireStub);
      exported = moduleRecord.exports === result ? result : result;
      // capture exports set on moduleRecord.exports via the factory's own module wrapper
      // note: factory creates its own `module`; we only observe what it returns.
    },
  },
};
// The bundle is a script, not a module: eval it.
(0, eval)(clientSrc);
console.log("client registeredId=", registeredId);
console.log("client inject=", JSON.stringify(exported && exported.inject), "apply=", typeof (exported && exported.apply));
console.log("OK");
