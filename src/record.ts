import { NodeType } from "./constant";
import { autoCompletionURL, loseEfficacy, mutationCompare } from "./utils";

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

export enum ActionType {
  Attributes,
  Character,
  AddChildNode,
  RemoveChildNode,
}

type NodeMappingOtherProps = {
  isMutation: boolean;
  invalidNodes: WeakMap<Node, number>;
};

export type Action = {
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
  /**
   * variable of list no processing is required.
   */
  const invalidNodes = new WeakMap<Node, number>();
  /**
   * Recording node attribute of mutation, filtering repeated action for current mutation.
   */
  const attributeNodes = new Map<
    Node,
    {
      initialValue: string | null;
      currentValue: string | null;
      index: number;
    }
  >();
  const attributeAction: Action[] = [];
  const characterNodes = new Map<
    Node,
    {
      initialValue: string | null;
      currentValue: string | null;
      index: number;
    }
  >();
  const characterAction: Action[] = [];
  /**
   * The sort method ensures the data what the type is "childList" at the front of the list.
   * If a node is deleted, it will needn't change other data.
   */
  mutationList.sort(mutationCompare).forEach((mutation, index) => {
    switch (mutation.type) {
      case "childList": {
        if (mutation.removedNodes.length) {
          mutation.removedNodes.forEach((node) => {
            const id = mirror.get(node)?.id;
            if (id) {
              /**
               * if id not exist, we can think about the node existing in the addedNodes list.
               * And we should delete it directly from the addedNodes list.
               */
              actionQueue.push({
                id,
                source: ActionSource[
                  ActionSource.Mutation
                ] as unknown as ActionSource,
                type: ActionType[
                  ActionType.RemoveChildNode
                ] as unknown as ActionType,
              });
            } else {
              invalidNodes.set(node, 1);
            }
          });
        }
        /**
         * create node n1 append to body, then create node n2 append to n1.
         * because this observer is an asynchronous function, it already includes n2
         * when mutation-record acquires n1.
         * In order to solve this problem, we will be judging of node exist when node recursion.
         */
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach((node) => {
            const isInvalid = invalidNodeCheck(true, invalidNodes!, node);
            if (!isInvalid) {
              const tree = {
                id: 0,
                type: NodeType[node.nodeType] as unknown as NodeType,
                childNodes: [],
              };
              /**
               * if this variable is true, it can prove the node has existed in dom-tree.
               * we should jump over it.
               */
              const isExist = mirror.get(node);
              nodeMapping(node, tree, {
                isMutation: true,
                invalidNodes,
              });
              if (!isExist) {
                const id = mirror.get(node)!.id;
                tree.id = id;
                actionQueue.push({
                  parentId: mirror.get(mutation.target)!.id,
                  id,
                  changer: tree,
                  source: ActionSource[
                    ActionSource.Mutation
                  ] as unknown as ActionSource,
                  type: ActionType[
                    ActionType.AddChildNode
                  ] as unknown as ActionType,
                });
              }
            }
          });
        }
        break;
      }
      case "characterData": {
        const { target: node, oldValue } = mutation;
        const isInvalid = invalidNodeCheck(true, invalidNodes!, node);
        if (isInvalid) {
          break;
        }
        const newValue = (mutation.target as Text).data;
        if (oldValue === newValue) return;
        /**
         * record value
         */
        const nodeInRecord = characterNodes.get(node);
        characterNodes.set(node, {
          initialValue: !nodeInRecord ? oldValue : nodeInRecord.initialValue,
          currentValue: newValue,
          index,
        });
        const id = mirror.get(node)?.id;
        if (id) {
          /**
           * collect before processing
           */
          characterAction.push({
            id,
            changer: (node as Text).data,
            source: ActionSource[
              ActionSource.Mutation
            ] as unknown as ActionSource,
            type: ActionType[ActionType.Character] as unknown as ActionType,
          });
        }
        break;
      }
      case "attributes": {
        const { target: node, oldValue } = mutation;
        const isInvalid = invalidNodeCheck(true, invalidNodes!, node);
        if (isInvalid) {
          break;
        }
        const newValue = (mutation.target as HTMLElement).getAttribute(
          mutation.attributeName!
        )!;
        /**
         * Avoid inserting repeated actions into the queue.
         *
         * In addition, the old-Value is equal to '' probably and alternative the new-Value equals null possibly.
         * And the reverse is also true.
         * This situation is not handled for the time.
         */
        if (oldValue === newValue) return;
        /**
         * record value
         */
        const nodeInRecord = attributeNodes.get(node);
        attributeNodes.set(node, {
          initialValue: !nodeInRecord ? oldValue : nodeInRecord.initialValue,
          currentValue: newValue,
          index,
        });
        let changer: Record<string, string> = {
          [mutation.attributeName!]: newValue,
        };
        if (mutation.attributeName === "class") {
          changer = { className: (node as HTMLElement).className };
        }
        const id = mirror.get(node)?.id;
        if (id) {
          /**
           * collect before processing
           */
          attributeAction[index] = {
            id,
            changer,
            source: ActionSource[
              ActionSource.Mutation
            ] as unknown as ActionSource,
            type: ActionType[ActionType.Attributes] as unknown as ActionType,
          };
        }
        break;
      }
      default:
        break;
    }
  });

  for (const node of attributeNodes.values()) {
    if (node.initialValue !== node.currentValue) {
      actionQueue.push(attributeAction[node.index]);
    }
  }

  for (const node of characterNodes.values()) {
    if (node.initialValue !== node.currentValue) {
      actionQueue.push(characterAction[node.index]);
    }
  }
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

function nodeMapping(
  rootNode: Node,
  tree: Atom,
  other?: NodeMappingOtherProps
) {
  const { isMutation, invalidNodes } = other || {};
  if (isMutation) {
    const isInvalid = invalidNodeCheck(isMutation, invalidNodes!, rootNode);
    if (isInvalid) return;
  }
  const n: Atom = getDomAtom(rootNode);
  if (!mirror.get(rootNode)) {
    mirror.set(rootNode, n);
    nodeChildMapping(rootNode, tree);
  }
}

function invalidNodeCheck(
  isMutation: boolean,
  invalidNodes: WeakMap<Node, number>,
  node: Node
) {
  if (isMutation) {
    const num = invalidNodes!.get(node);
    if (num) {
      return true;
    }
  }
  return false;
}

/**
 * record and format dom tree descendant when window load event complete
 * add object to mirror variable for follow up
 *
 * this method uses recursion and need pay attention to perfermance
 * @param rootNode
 * @param tree
 */
function nodeChildMapping(
  rootNode: Node,
  tree?: Atom,
  other?: NodeMappingOtherProps
) {
  const { isMutation, invalidNodes } = other || {};
  rootNode.childNodes.forEach((node) => {
    if (isMutation) {
      const isInvalid = invalidNodeCheck(isMutation, invalidNodes!, node);
      if (isInvalid) return;
    }
    const n: Atom = getDomAtom(node);
    tree && tree.childNodes.push(n);
    if (!mirror.get(node)) {
      mirror.set(node, n);
      nodeChildMapping(node, n);
    }
  });
}

export default initialization;

export { actionQueue as queue, originTree as tree };
