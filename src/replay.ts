import { NodeType, SvgTypes } from "./constant";
import { Atom, queue, tree, Action, ActionType } from "./record";
import { createSandbox, escape2Html, request, setAttributes } from "./utils";

let doc: XMLDocument;

/**
 * when replaying specification of mirror-variable is { [id]: { id: Number, source: '', type: '' } }
 */
const mirror = new Map<Atom["id"], HTMLElement | Text | SVGElement>();

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
  createElementByTree(tree, fragment, docType);
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
  setTimeout(() => {
    replayStep();
  }, 300);
}

function recursionChild(n: Atom, container: Node) {
  if (n.childNodes.length) {
    createElementByTree(n, container);
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
  docType?: DocumentType
) {
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
        let ele;
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
        container.appendChild(ele);
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
      container.appendChild(ele);
      mirror.set(n.id, ele);
    }
  });
}

function replayStep() {
  let step: Action | undefined;
  while ((step = queue.shift())) {
    switch (step.type) {
      case ActionType[ActionType.AddChildNode] as unknown as ActionType: {
        mirror.get(step.parentId!) &&
          createElementByTree(
            step.changer as Atom,
            mirror.get(step.parentId!)!
          );
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
  }
}

function replay() {
  setFirstScreen();
}

export { replay };
