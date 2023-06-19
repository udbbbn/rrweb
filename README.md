# rrweb
record and replay from web.

--- 

In order to better manage that I integrate three single-repo to a mono-repo.

# rrweb-core

- I guess [rrweb](https://github.com/rrweb-io/rrweb) haven't used `requestIdleCallBack` method because [requestIdleCallBack](https://caniuse.com/?search=requestIdleCallBack) doesn't support Safari browser.

- The webpage must be opened by `window.open(url, windowName, 'resizable')` method. [why?](https://stackoverflow.com/a/35801906)

- I find that the Chrome devTools existing some idle frames. [corresponding explanation](https://stackoverflow.com/a/38545947)

## How to use

```js。
import rrweb from "rrweb";

let curRRWebId = null;
const defaultObj = {
    projectId: 1,
    projectName: "测试项目",
    moduleId: "test"
};

const globalEvents = {
    actions: [],
    cursors: [],
    timeTable: {}
};

const save = (events, structure) => {
    const { actions: actionQueue, cursors: cursorQueue, timeTable } = events || {};
    let lastCursorIdx = cursorQueue?.length;
    let lastActionIdx = actionQueue?.length;
    let timeTableKeys = Object.keys(timeTable || {});
    fetch(curRRWebId ? `http://127.0.0.1:8000/record/${curRRWebId}` : "http://127.0.0.1:8000/record", {
        mode: "cors",
        method: curRRWebId ? "PUT" : "POST",
        headers: new Headers({ "content-type": "application/json" }),
        body: JSON.stringify({
            ...defaultObj,
            ...(actionQueue?.length ? { actionQueue: JSON.stringify(actionQueue) } : {}),
            ...(Object.keys(timeTable || {})?.length ? { timeTable: JSON.stringify(timeTable) } : {}),
            ...(cursorQueue?.length ? { cursorQueue: JSON.stringify(cursorQueue) } : {}),
            ...(structure
                ? {
                      structure: JSON.stringify(structure)
                  }
                : {})
        })
    })
        .then((res) => res.json())
        .then((res) => {
            if (curRRWebId) {
                if (lastActionIdx) {
                    globalEvents.actions = globalEvents.actions.slice(lastActionIdx);
                }
                if (lastCursorIdx) {
                    globalEvents.cursors = globalEvents.cursors.slice(lastCursorIdx);
                }
                if (timeTableKeys.length) {
                    timeTableKeys.forEach((k) => {
                        delete globalEvents.timeTable[k];
                    });
                }
            }
            curRRWebId = res.data;
        });
};

rrweb.start({
    emit(events, structure) {
        if (structure) {
            save(events, structure);
        } else {
            const { actions: actionQueue, cursors: cursorQueue, timeTable: tb } = events || {};
            const { actions, cursors, timeTable } = globalEvents;
            actions.push(...(actionQueue || []));
            cursors.push(...(cursorQueue || []));
            Object.keys(tb || {}).forEach((k) => {
                timeTable[k] = tb[k];
            });
        }
    }
});

setInterval(() => {
    if ((globalEvents.actions.length || globalEvents.cursors.length) && curRRWebId) {
        save(globalEvents);
    }
}, 1000);
```

# Demonstration

click and watch the video.

[![Watch the video](https://raw.githubusercontent.com/udbbbn/Img/master/rrweb-demonstration.gif)](https://github.com/udbbbn/Img/blob/master/rrweb-demonstration.mp4)
