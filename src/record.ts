import { NodeType } from "./constant";
import { autoCompletionURL, loseEfficacy } from "./utils";

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
  changer?: Atom | string | Record<string, string>;
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
 * when recording/replaying specification of mirror-variable is { [dom]: { id: Number, source: '', type: '' } }
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
              changer: tree,
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
      case "characterData": {
        const node = mutation.target;
        actionQueue.push({
          id: mirror.get(node)!.id,
          changer: (node as Text).data,
          source: ActionSource[
            ActionSource.Mutation
          ] as unknown as ActionSource,
          type: ActionType[ActionType.Character] as unknown as ActionType,
        });
        break;
      }
      case "attributes": {
        const { target: node, oldValue } = mutation;
        const newValue = (mutation.target as HTMLElement).getAttribute(
          mutation.attributeName!
        )!;
        /**
         * avoid inserting repeat action into queue.
         *
         * In addition, oldValue is equal to '' probably and that newValue equals null possibly.
         * And the reverse is also true.
         * this situation not handled for the time being.
         */
        if (oldValue === newValue) return;
        let changer: Record<string, string> = {
          [mutation.attributeName!]: newValue,
        };
        if (mutation.attributeName === "class") {
          changer = { className: (node as HTMLElement).className };
        }
        actionQueue.push({
          id: mirror.get(node)!.id,
          changer,
          source: ActionSource[
            ActionSource.Mutation
          ] as unknown as ActionSource,
          type: ActionType[ActionType.Attributes] as unknown as ActionType,
        });
        break;
      }
      default:
        break;
    }
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
  const attributes =
    node.nodeType === NodeType.Element
      ? {
          attributes: (node as HTMLElement).getAttributeNames().reduce(
            (t, c) => ({
              ...t,
              [c]: autoCompletionURL((node as HTMLElement).getAttribute(c)),
            }),
            {}
          ),
        }
      : {};
  const textContent =
    node.nodeType === NodeType.Text ? { textContent: node.textContent } : {};
  return {
    id: ++id,
    type: NodeType[node.nodeType] as unknown as NodeType,
    childNodes: [],
    tagName: node.nodeName.toLowerCase(),
    ...attributes,
    ...textContent,
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
