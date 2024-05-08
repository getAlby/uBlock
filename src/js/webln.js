// WebLN calls that can be executed from the WebLNProvider.
// Update when new calls are added
const weblnCalls = [
  "enable",
  "isEnabled",
  "getInfo",
  "getBalance",
  "sendPayment",
  "makeInvoice",
  "keysend",
];
// calls that can be executed when webln is not enabled for the current content page
const disabledCalls = ["enable", "isEnabled"];

let isEnabled = false; // store if webln is enabled for this content page
let isRejected = false; // store if the webln enable call failed. if so we do not prompt again
let nwc;

async function init() {
  const secret = await vAPI.messaging.send("webln", {
    what: "getNwcPairingSecret",
  });
  if (!secret) {
    return;
  }

  const isDomainEnabled = await vAPI.messaging.send("webln", {
    what: "isDomainEnabled",
    domain:
      window.location.hostname &&
      window.location.hostname.replace(/^[^.]*\./, ""),
  });
  if (!isDomainEnabled) {
    return;
  }

  nwc = new webln.NostrWebLNProvider({
    nostrWalletConnectUrl: secret,
  });

  injectWebln();

  window.addEventListener("message", async (ev) => {
    // Only accept messages from the current window
    if (
      ev.source !== window ||
      ev.data.application !== "uBlock" ||
      ev.data.scope !== "webln"
    ) {
      return;
    }

    if (ev.data && !ev.data.response) {
      // if an enable call railed we ignore the request to prevent spamming the user with prompts
      if (isRejected) {
        postMessage(ev, {
          error:
            "webln.enable() failed (rejecting further window.webln calls until the next reload)",
        });
        return;
      }

      // limit the calls that can be made from webln
      // only listed calls can be executed
      // if not enabled only enable can be called.
      const availableCalls = isEnabled ? weblnCalls : disabledCalls;
      if (!availableCalls.includes(ev.data.action)) {
        console.error("Function not available. Is the provider enabled?");
        postMessage(ev, {
          error: "Function not available. Is the provider enabled?",
        });
        return Promise.resolve();
      }

      injectLoaderElement(true);

      const replyFunction = (response) => {
        // if it is the enable call we store if webln is enabled for this content script
        if (ev.data.action === "enable") {
          isEnabled = response.enabled;
          const enabledEvent = new Event("webln:enabled");
          window.dispatchEvent(enabledEvent);
          if (response.error) {
            console.error(response.error);
            console.info("Enable was rejected ignoring further webln calls");
            isRejected = true;
          }
        }

        sendMessage(ev, response);

        injectLoaderElement(false);
      };
      return exec(ev.data.action, ev.data.args)
        .then(replyFunction)
        .catch(replyFunction);
    }
  });
}

// Abort execution if our global vAPI object does not exist.
if (typeof vAPI === "object") {
  init();

  browser.runtime.onMessage.addListener((message) => {
    switch (message.what) {
      case "enabledDomainsUpdated":
        if (message.enabled && !nwc) {
          isEnabled = false;
          isRejected = false;
          init();
        } else if (!message.enabled && nwc) {
          isEnabled = false;
          isRejected = false;
          nwc = undefined;
        }
        break;
    }
  });
}

async function injectWebln() {
  try {
    if (!document) throw new Error("No document");
    const container = document.head || document.documentElement;
    if (!container) throw new Error("No container element");
    const scriptEl = document.createElement("script");
    scriptEl.setAttribute("async", "false");
    scriptEl.setAttribute("type", "text/javascript");
    scriptEl.setAttribute("type", "module");
    scriptEl.src = browser.runtime.getURL("webln/webln-injected.js");
    container.insertBefore(scriptEl, container.children[0]);
    container.removeChild(scriptEl);
  } catch (err) {
    console.error("WebLN injection failed", err);
  }
}

function sendMessage(ev, response) {
  window.postMessage(
    {
      id: ev.data.id,
      application: "uBlock",
      response: true,
      data: response,
      scope: "webln",
    },
    window.location.origin
  );
}

async function exec(action, args) {
  if (!nwc) {
    throw new Error("No NWC instance");
  }

  if (action === "enable") {
    await nwc.enable();
    return { enabled: true };
  } else if (action === "sendPayment") {
    return await nwc.sendPayment(args.paymentRequest);
  } else if (action === "sendPaymentAsync") {
    return await nwc.sendPaymentAsync(args.paymentRequest);
  } else if (nwc[action]) {
    return await nwc[action](args);
  } else {
    throw new Error("Method not found");
  }
}

function injectLoaderElement(display) {
  const existingLoaderStyle = document.getElementById(
    "__abp-lightning-loader-style"
  );
  const existingLoader = document.getElementById("__abp-lightning-loader");
  if (display === false) {
    existingLoader?.remove();
    return;
  } else if (existingLoader) {
    return;
  }

  if (!existingLoaderStyle) {
    const style = document.createElement("style");
    style.id = "__abp-lightning-loader-style";
    style.innerHTML = `
      @keyframes rotateAnimation {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      #__abp-lightning-loader {
        position: fixed;
        top: 25px;
        right: 25px;
        width: 40px;
        height: 40px;
        background: white;
        z-index: 99999;
        border: 1px solid black;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      #__abp-lightning-loader span {
        display: inline-block;
        font-size: 24px;
        line-height: 24px;
        animation: rotateAnimation 1.5s infinite linear;
      }
    `;
    document.head.appendChild(style);
  }

  const loader = document.createElement("div");
  loader.id = "__abp-lightning-loader";

  const spinner = document.createElement("span");
  spinner.innerText = "⚡";

  loader.appendChild(spinner);
  document.body.appendChild(loader);
}
