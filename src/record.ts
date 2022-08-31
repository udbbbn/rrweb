import { nodeType } from "./constant";

let id = 0;

type Tree = {
  id: number;
  type: nodeType;
  childNodes: SubTree[];
};

type SubTree = {
  id: number;
  type: nodeType;
  childNodes: SubTree[];
  tagName?: string;
  attributes?: Record<string, any>;
  textContent?: string | null;
};

const queue: Node[] = [];

const mirror = new Map();
let tree: Tree;
/**
 * when recording specification of mirror-variable is { [dom]: { id: Number, source: '', type: '' } }
 * when replaying specification of mirror-variable is { [id] : { id: Number, source: '', type: '' } }
 */

const observer = new MutationObserver((mutationList, observer) => {
  mutationList.forEach((mutation) => {
    if (mutation.type === "attributes") {
      if (mutation.attributeName === "class") {
        console.log("-target", mutation.target);
        console.log(
          "current className: ",
          (mutation.target as HTMLElement).className
        );
      } else {
        console.group("attributes change");
        console.log("target", mutation.target);
        console.log("props: ", mutation.attributeName);
        console.log("oldValue: ", mutation.oldValue);
        console.log(
          "curValue: ",
          (mutation.target as any)[mutation.attributeName as any]
        );
        console.groupEnd();
      }
    }
    if (mutation.type === "characterData") {
      console.group("characterData change");
      console.log("oldValue: ", mutation.oldValue);
      console.log("curValue: ", mutation.target);
      console.groupEnd();
    }
    if (mutation.type === "childList") {
      console.group("childList change");
      console.log("target", mutation.target);
      console.log("addedNodes: ", mutation.addedNodes);
      console.log("removedNodes: ", mutation.removedNodes);
      console.groupEnd();
    }
  });
});

function initialization() {
  window.addEventListener("load", () => {
    const rootNode = document.cloneNode(true);
    tree = {
      id: ++id,
      type: nodeType[rootNode.getRootNode().nodeType] as unknown as nodeType,
      childNodes: [],
    };
    nodeMapping(rootNode, tree);
    documentObserve();
  });
}
/**
 * start observe
 */
function documentObserve() {
  observer.observe(document.documentElement, {
    attributes: true,
    attributeOldValue: true,
    characterData: true,
    characterDataOldValue: true,
    childList: true,
    subtree: true,
  });
}

/**
 * record and format dom tree descendant when window load event complete
 * add object to mirror variable for follow up
 *
 * this method uses recursion and need pay attention to perfermance
 * @param rootNode
 * @param tree
 */
function nodeMapping(rootNode: Node, tree: Tree | SubTree) {
  rootNode.childNodes.forEach((node) => {
    const n: SubTree = {
      id: ++id,
      type: nodeType[rootNode.nodeType] as unknown as nodeType,
      childNodes: [],
      tagName: node.nodeName.toLowerCase(),
      ...(node.nodeType === nodeType.Element
        ? {
            attributes: (node as HTMLElement).getAttributeNames().reduce(
              (t, c) => ({
                ...t,
                [c]: (node as HTMLElement).getAttribute(c),
              }),
              {}
            ),
          }
        : {}),
      ...(node.nodeType === nodeType.Text
        ? { textContent: node.textContent }
        : {}),
    };
    tree.childNodes.push(n);
    mirror.set(node, n);
    nodeMapping(node, n);
  });
}

export default initialization;

export { queue };
