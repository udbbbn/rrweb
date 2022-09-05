import { NodeType } from "./constant";
import { Atom, queue, tree, mirror } from "./record";
import { request, setAttributes } from "./utils";

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
  doc.documentElement.appendChild(fragment);
  document.open();
  document.write(new XMLSerializer().serializeToString(doc));
  document.close();
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
