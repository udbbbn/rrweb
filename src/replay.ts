import { NodeType, SvgTypes } from "./constant";
import {
  Atom,
  Action,
  ActionType,
  TreeStroageKey,
  QueueStroageKey,
} from "./record";
import { createSandbox, escape2Html, request, setAttributes } from "./utils";

type AtomElement = HTMLElement | Text | SVGElement;

let tree: Atom;
let queue: Action[];
let doc: XMLDocument;
let batchNo: number;

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

function replayStep() {
  let step: Action;
  step = queue.shift()!;
  batchNo !== step.actionBatchNo && (batchNo = step.actionBatchNo);
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
  if (queue[0] && queue[0].actionBatchNo === batchNo) {
    replayStep();
  } else if (queue.length) {
    const { timeStamp } = queue[0];
    setTimeout(() => {
      replayStep();
    }, timeStamp - step.timeStamp);
  }
}

function replay() {
  tree = JSON.parse(localStorage.getItem(TreeStroageKey) || JSON.stringify({}));
  queue = JSON.parse(
    localStorage.getItem(QueueStroageKey) || JSON.stringify([])
  );
  setFirstScreen();
}

export { replay };
