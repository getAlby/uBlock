import { postMessage } from "./webln-message.js";

export default class WebLNProvider {
  _isEnabled;
  _scope = "webln";

  constructor() {
    this._isEnabled = false;
  }

  _checkEnabled(methodName) {
    if (!this._isEnabled) {
      throw new Error(`Provider must be enabled before calling ${methodName}`);
    }
  }

  async enable() {
    if (this._isEnabled) {
      return;
    }
    const result = await this.execute("enable");
    if (typeof result.enabled === "boolean") {
      this._isEnabled = result.enabled;
    }
  }

  getInfo() {
    this._checkEnabled("getInfo");
    return this.execute("getInfo");
  }

  sendPayment(paymentRequest) {
    this._checkEnabled("sendPayment");
    return this.execute("sendPayment", { paymentRequest });
  }

  sendPaymentAsync(paymentRequest) {
    this._checkEnabled("sendPaymentAsync");
    return this.execute("sendPaymentAsync", { paymentRequest });
  }

  keysend(args) {
    this._checkEnabled("keysend");
    return this.execute("keysend", args);
  }

  makeInvoice(args) {
    this._checkEnabled("makeInvoice");
    if (typeof args !== "object") {
      args = { amount: args };
    }

    return this.execute("makeInvoice", args);
  }

  signMessage(_message) {
    this._checkEnabled("signMessage");
    throw new Error("Not supported `signMessage`");
  }

  verifyMessage(_signature, _message) {
    this._checkEnabled("verifyMessage");
    throw new Error("Not supported `verifyMessage`");
  }

  getBalance() {
    this._checkEnabled("getBalance");
    return this.execute("getBalance");
  }

  request(_method, _params) {
    this._checkEnabled("request");
    throw new Error("Not supported `request`");
  }

  execute(action, args = {}) {
    return postMessage(this._scope, action, args);
  }
}
