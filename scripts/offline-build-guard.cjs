// Preload for builds that must not contact external services.
const net = require('node:net');
const deny = () => { throw new Error('Offline build: outbound network requests are disabled'); };
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const first = Array.isArray(args[0]) ? args[0][0] : args[0];
  if (typeof first === 'string' && first.startsWith('\\\\.\\pipe\\')) return connect.apply(this, args);
  if (first && typeof first === 'object' && first.path && !first.port) return connect.apply(this, args);
  return deny();
};
for (const name of ['node:http', 'node:https']) {
  const module = require(name); module.request = deny; module.get = deny;
}
require('node:tls').connect = deny;
require('node:dgram').createSocket = deny;
globalThis.fetch = async () => deny();
require('node:module').syncBuiltinESMExports();
