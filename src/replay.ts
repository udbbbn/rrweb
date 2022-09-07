import { NodeType } from "./constant";
import { Atom, queue, tree, mirror } from "./record";
import { createSandbox, escape2Html, request, setAttributes } from "./utils";

let doc: XMLDocument;

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
  doc.documentElement.appendChild(fragment);
  iframe.contentDocument?.write(
    escape2Html(new XMLSerializer().serializeToString(doc))
  );
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
        mirror.set(doc, n);
        recursionChild(n, container);
      } else {
        /**
         * normal element
         */
        const ele = doc.createElement(n.tagName!);
        setAttributes(ele, n);
        /**
         * iframe sandbox does't allow script
         */
        if (n.tagName === "noscript") {
          ele.style.display = "none";
        }
        container.appendChild(ele);
        mirror.set(ele, n);
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
      mirror.set(ele, n);
    }
  });
}

function replay() {
  setFirstScreen();
}

export { replay };
