import { NodeType } from "./constant";
import { loseEfficacy } from "./utils";

let id = 0;

export type Atom = {
  id: number;
  type: NodeType;
  childNodes: Atom[];
  /**
   * root node own this property
   */
  namespaceURI?: string | null;
  tagName?: string;
  attributes?: Record<string, any>;
  textContent?: string | null;
};

enum ActionSource {
  Mutation,
}

enum ActionType {
  Attributes,
  Character,
  AddChildNode,
  RemoveChildNode,
}

type Action = {
  id: number;
  /**
   * when type === ActionType.AddChildNode, parentId is the new-Node parent node
   */
  parentId?: number;
  atom?: Atom;
  source: ActionSource;
  type: ActionType;
};

const actionQueue: Action[] = [];
(window as any).actionQueue = actionQueue;

/**
 * this variable will change along with dom tree
 */
export const mirror = new WeakMap<Node, Atom>();
(window as any).mirror = mirror;
/**
 * this variable record origin dom tree data only
 */
let originTree: Atom;
/**
 * when recording specification of mirror-variable is { [dom]: { id: Number, source: '', type: '' } }
 * when replaying specification of mirror-variable is { [id] : { id: Number, source: '', type: '' } }
 */

const observer = new MutationObserver((mutationList, observer) => {
  mutationList.forEach((mutation) => {
    switch (mutation.type) {
      case "childList": {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach((node) => {
            const tree = {
              id: 0,
              type: NodeType[node.nodeType] as unknown as NodeType,
              childNodes: [],
            };
            nodeMapping(node, tree);
            tree.id = mirror.get(node)!.id;
            actionQueue.push({
              parentId: mirror.get(mutation.target)!.id,
              id: mirror.get(node)!.id,
              atom: tree,
              source: ActionSource[
                ActionSource.Mutation
              ] as unknown as ActionSource,
              type: ActionType[
                ActionType.AddChildNode
              ] as unknown as ActionType,
            });
          });
        }
        if (mutation.removedNodes.length) {
          mutation.removedNodes.forEach((node) => {
            nodeMapping(node);
            actionQueue.push({
              id: mirror.get(node)!.id,
              source: ActionSource[
                ActionSource.Mutation
              ] as unknown as ActionSource,
              type: ActionType[
                ActionType.RemoveChildNode
              ] as unknown as ActionType,
            });
          });
        }
        break;
      }
      default:
        break;
    }
    // if (mutation.type === "attributes") {
    //   if (mutation.attributeName === "class") {
    //     console.log("mirror target", mirror.get(mutation.target));
    //     console.log("-target", mutation.target);
    //     console.log(
    //       "current className: ",
    //       (mutation.target as HTMLElement).className
    //     );
    //   } else {
    //     console.group("attributes change");
    //     console.log("target", mutation.target);
    //     console.log("props: ", mutation.attributeName);
    //     console.log("oldValue: ", mutation.oldValue);
    //     console.log(
    //       "curValue: ",
    //       (mutation.target as any)[mutation.attributeName as any]
    //     );
    //     console.groupEnd();
    //   }
    // }
    // if (mutation.type === "characterData") {
    //   console.group("characterData change");
    //   console.log("oldValue: ", mutation.oldValue);
    //   console.log("curValue: ", mutation.target);
    //   console.groupEnd();
    // }
  });
});

function initialization() {
  window.addEventListener("load", async () => {
    const rootNode = document.getRootNode();
    await loseEfficacy(rootNode as unknown as HTMLHtmlElement);
    originTree = {
      id: ++id,
      type: NodeType[rootNode.nodeType] as unknown as NodeType,
      namespaceURI: document.documentElement.namespaceURI,
      childNodes: [],
    };
    (window as any).originTree = originTree;
    nodeMapping(rootNode, originTree);
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
 * get the smallest unit
 *
 * @param node
 * @returns
 */
function getDomAtom(node: Node): Atom {
  return {
    id: ++id,
    type: NodeType[node.nodeType] as unknown as NodeType,
    childNodes: [],
    tagName: node.nodeName.toLowerCase(),
    ...(node.nodeType === NodeType.Element
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
    ...(node.nodeType === NodeType.Text
      ? { textContent: node.textContent }
      : {}),
  };
}

function nodeMapping(rootNode: Node, tree?: Atom) {
  const n: Atom = getDomAtom(rootNode);
  mirror.set(rootNode, n);
  nodeChildMapping(rootNode, tree);
}

/**
 * record and format dom tree descendant when window load event complete
 * add object to mirror variable for follow up
 *
 * this method uses recursion and need pay attention to perfermance
 * @param rootNode
 * @param tree
 */
function nodeChildMapping(rootNode: Node, tree?: Atom) {
  rootNode.childNodes.forEach((node) => {
    const n: Atom = getDomAtom(node);
    tree && tree.childNodes.push(n);
    mirror.set(node, n);
    nodeChildMapping(node, n);
  });
}

export default initialization;

export { actionQueue as queue, originTree as tree };
