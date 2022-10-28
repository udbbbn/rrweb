import { NodeType, SvgTypes } from "./constant";
import {
  Atom,
  Action,
  ActionType,
  CursorAction,
  TreeStorageKey,
  QueueStorageKey,
  CursorStorageKey,
  CursorActionKey,
  CursorActionValue,
} from "./record";
import { createCursor, createSandbox, setAttributes, sleep } from "./utils";
import "./index.css";

type AtomElement = HTMLElement | Text | SVGElement;

const tasks: any[] = [];
let tree: Atom;
let actionQueue: Action[];
let cursorQueue: CursorAction[];
let curCursorIdx = 0;
let cursorRunning: CursorActionValue[] = [];
let cursorInstance: HTMLDivElement;
let doc: XMLDocument;
let globalIframeDoc: HTMLElement;
// let batchNo: number;

/**
 * when replaying specification of mirror-variable is { [id]: { id: Number, source: '', type: '' } }
 */
const mirror = new Map<Atom["id"], AtomElement>();

(window as any).replayMirror = mirror;

/**
 * first-screen alone setting
 */
async function setFirstScreen() {
  /**
   * the doctype always equal <!DOCTYPE html> at present.
   */
  const docType = document.implementation.createDocumentType("html", "", "");
  const fragment = document.createDocumentFragment();
  createElementByTree(tree, fragment, { docType });
  const htmlDoc = document.implementation.createHTMLDocument();
  htmlDoc.body.style.margin = "0px";
  /**
   * https://developer.mozilla.org/en-US/docs/Web/API/XMLSerializer
   */
  document.write(new XMLSerializer().serializeToString(htmlDoc));
  document.close();
  /**
   * create sandbox ensure inline scripts don't work.
   */
  const iframe = await createSandbox(document.body);
  iframe.contentDocument!.open("text/htmlreplace");
  iframe.contentDocument!.write("<!DOCTYPE html><html></html>");
  iframe.contentDocument!.close();
  const iframeDoc = iframe.contentDocument?.documentElement;
  globalIframeDoc = iframeDoc!;
  /**
   * delete head & body Node
   *
   * Those nodes have existed in the fragment.
   */
  iframeDoc!.removeChild(iframeDoc!.lastChild!);
  iframeDoc!.removeChild(iframeDoc!.lastChild!);
  iframeDoc?.appendChild(fragment);
  cursorInstance = createCursor(iframeDoc?.querySelector("body")!);
  Promise.resolve().then(() => {
    replayStep();
  });
}

function recursionChild(n: Atom, container: Node) {
  const render = () => createElementByTree(n, container);
  if (n.childNodes.length) {
    render();
  }
}
/**
 * recover dom tree
 *
 * @param node
 * @param container
 * @param docType
 */
function createElementByTree(
  node: Atom,
  container: Node,
  options?: {
    docType?: DocumentType;
    nextSibling?: AtomElement | null;
    previousSibling?: AtomElement | null;
  }
) {
  const { docType, nextSibling, previousSibling } = options || {};
  const append = (ele: AtomElement) => {
    if (previousSibling && previousSibling.nextSibling) {
      container.insertBefore(ele, previousSibling.nextSibling);
    } else if (nextSibling) {
      container.insertBefore(ele, nextSibling);
    } else {
      container.appendChild(ele);
    }
  };
  node.childNodes.forEach((n) => {
    /**
     * type === nodeType.Element
     */
    if (n.type === (NodeType[NodeType.Element] as unknown as NodeType)) {
      /**
       * create Document
       */
      if (n.tagName === "html") {
        doc = document.implementation.createDocument(
          tree.namespaceURI || "",
          "html",
          docType
        );
        setAttributes(doc.querySelector("html")!, n);
        recursionChild(n, container);
      } else {
        /**
         * normal element
         */
        let ele: AtomElement;
        if (SvgTypes.includes(n.tagName!)) {
          ele = doc.createElementNS("http://www.w3.org/2000/svg", n.tagName!);
        } else {
          ele = doc.createElement(n.tagName!);
        }
        setAttributes(ele, n);
        /**
         * iframe sandbox does't allow script
         */
        if (n.tagName === "noscript") {
          ele.style.display = "none";
        }
        append(ele);
        mirror.set(n.id, ele);
        recursionChild(n, ele);
      }
      /**
       * type === nodeType.Text
       */
    } else if (n.type === (NodeType[NodeType.Text] as unknown as NodeType)) {
      /**
       * set textContext
       */
      const ele = doc.createTextNode(n.textContent!);
      append(ele);
      mirror.set(n.id, ele);
    }
  });
}

async function replayCursorPath() {
  let act = cursorRunning.shift()!;
  if (!!act) {
    if (act.type === "move") {
      tasks.push(() => {
        cursorInstance.style.left = `${act.x}px`;
        cursorInstance.style.top = `${act.y}px`;
      });
      setTimeout(() => {
        replayCursorPath();
      }, 20);
    } else if (act.type === "click") {
      tasks.push(() => {
        cursorInstance.classList.add("rrweb-click");
        setTimeout(() => {
          cursorInstance.classList.remove("rrweb-click");
          replayCursorPath();
        }, 200);
      });
    }
  } else {
    replayStep();
  }
}

function replayStep() {
  if (
    !actionQueue.length &&
    !(cursorQueue[curCursorIdx] && cursorQueue[curCursorIdx].length)
  )
    return;
  const step = actionQueue.shift()!;
  const actions = cursorQueue[curCursorIdx];
  /* in period */
  if (
    actions &&
    actions.length &&
    (!step || step.timeStamp >= actions[0].timeStamp)
  ) {
    /* handle cursor moving  */
    const limit = actions.filter(
      (act) => act.timeStamp <= (!step ? Infinity : step.timeStamp)
    ).length;
    if (limit !== 0) {
      step && actionQueue.unshift(step);
      cursorRunning = actions.splice(0, limit);
      /**
       * If current actions perform completion, the curCursorIdx increase.
       */
      !actions.length && ++curCursorIdx;
      return replayCursorPath();
    }
  }

  switch (step.type) {
    case ActionType[ActionType.AddChildNode] as unknown as ActionType: {
      mirror.get(step.parentId!) &&
        tasks.push(() => {
          createElementByTree(
            step.changer as Atom,
            mirror.get(step.parentId!)!,
            {
              nextSibling: mirror.get(step.nextSibling!),
              previousSibling: mirror.get(step.previousSibling!),
            }
          );
        });
    }
    case ActionType[ActionType.RemoveChildNode] as unknown as ActionType: {
      const ele = mirror.get(step.id);
      if (ele && ele.parentNode) {
        tasks.push(() => {
          ele.parentNode!.removeChild(ele);
        });
      }
    }
    case ActionType[ActionType.Attributes] as unknown as ActionType: {
      const ele = mirror.get(step.id);

      ele &&
        tasks.push(() => {
          setAttributes(ele as Element, { attributes: step.changer } as Atom);
        });
    }
    case ActionType[ActionType.Character] as unknown as ActionType: {
      const ele = mirror.get(step.id);
      ele &&
        tasks.push(() => {
          (ele as Text).data = step.changer as string;
        });
    }
    default:
      requestIdleCallback(handle, { timeout: 800 });
      break;
  }

  if (actionQueue.length) {
    const { timeStamp } = actionQueue[0];
    setTimeout(() => {
      replayStep();
    }, timeStamp - step.timeStamp);
  } else if (cursorQueue[curCursorIdx].length) {
    replayStep();
  }
}

function replay() {
  tree = JSON.parse(localStorage.getItem(TreeStorageKey) || JSON.stringify({}));
  actionQueue = JSON.parse(
    localStorage.getItem(QueueStorageKey) || JSON.stringify([])
  );
  cursorQueue = JSON.parse(
    localStorage.getItem(CursorStorageKey) || JSON.stringify([])
  );
  setFirstScreen();
}

function handle(deadline: any) {
  while (
    (deadline.timeRemaining() > 0 || deadline.didTimeout) &&
    tasks.length > 0
  ) {
    tasks.shift()();
  }

  if (tasks.length > 0) requestIdleCallback(handle);
}

export { replay };
