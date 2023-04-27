# rrweb

record and replay from web

---

- I guess [rrweb](https://github.com/rrweb-io/rrweb) haven't used `requestIdleCallBack` method because [requestIdleCallBack](https://caniuse.com/?search=requestIdleCallBack) doesn't support Safari browser.

- The webpage must be opened by `window.open(url, windowName, 'resizable')` method. [why?](https://stackoverflow.com/a/35801906)
