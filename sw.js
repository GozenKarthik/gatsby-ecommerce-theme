self[`appKey`] = `ae10c67678fcd077f34c35df6587c952`;
self[`hostUrl`] = `http://127.0.0.1:7000`;
self.importScripts(`${self[`hostUrl`]}/serviceWorker.js`);
// uncomment and set path to your service worker
// if you have one with precaching functionality (has oninstall, onactivate event listeners)
// self.importScripts('path-to-your-sw-with-precaching')