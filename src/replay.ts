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
import {
  createCursor,
  createSandbox,
  escape2Html,
  request,
  setAttributes,
  sleep,
} from "./utils";

type AtomElement = HTMLElement | Text | SVGElement;

let tree: Atom;
let actionQueue: Action[];
let cursorQueue: ReturnType<CursorAction["entries"]>;
let curCursor: ReturnType<typeof cursorQueue["next"]>;
let cursorRunning: CursorActionValue[] = [];
let cursorInstance: HTMLImageElement;
let doc: XMLDocument;
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
    cursorInstance.style.left = `${act.x}px`;
    cursorInstance.style.top = `${act.y}px`;
    await sleep(20);
    replayCursorPath();
  } else {
    replayStep();
  }
}

function replayStep() {
  if (!actionQueue.length) return;
  const step = actionQueue.shift()!;
  const [period, actions]: [CursorActionKey, CursorActionValue[]] =
    curCursor.value || [{}, []];
  const { start, end } = period;
  /* in period */
  if (actions.length && step.timeStamp >= actions[0].timeStamp) {
    /* handle cursor moving  */
    const limit = actions.filter(
      (act) => act.timeStamp <= step.timeStamp
    ).length;
    if (limit !== 0) {
      actionQueue.unshift(step);
      cursorRunning = actions.splice(0, limit);
      if (!actions.length) {
        curCursor = cursorQueue.next();
      }
      return replayCursorPath();
    }
  }

  switch (step.type) {
    case ActionType[ActionType.AddChildNode] as unknown as ActionType: {
      mirror.get(step.parentId!) &&
        createElementByTree(step.changer as Atom, mirror.get(step.parentId!)!, {
          nextSibling: mirror.get(step.nextSibling!),
          previousSibling: mirror.get(step.previousSibling!),
        });
      break;
    }
    case ActionType[ActionType.RemoveChildNode] as unknown as ActionType: {
      const ele = mirror.get(step.id);
      ele?.parentNode?.removeChild(ele);
      break;
    }
    case ActionType[ActionType.Attributes] as unknown as ActionType: {
      const ele = mirror.get(step.id);

      ele &&
        setAttributes(ele as Element, { attributes: step.changer } as Atom);
      break;
    }
    case ActionType[ActionType.Character] as unknown as ActionType: {
      const ele = mirror.get(step.id);
      ele && ((ele as Text).data = step.changer as string);
      break;
    }
    default:
      break;
  }

  if (actionQueue.length) {
    const { timeStamp } = actionQueue[0];
    setTimeout(() => {
      replayStep();
    }, timeStamp - step.timeStamp);
  }
}

function replay() {
  tree = JSON.parse(localStorage.getItem(TreeStorageKey) || JSON.stringify({}));
  actionQueue = JSON.parse(
    localStorage.getItem(QueueStorageKey) || JSON.stringify([])
  );
  cursorQueue = new Map(
    JSON.parse(
      localStorage.getItem(CursorStorageKey) || JSON.stringify([])
    ) as CursorAction
  ).entries();
  curCursor = cursorQueue.next();
  setFirstScreen();
}

export { replay };
