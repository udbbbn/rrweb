import debounce from "lodash.debounce";
import { NodeType, noop } from "./constant";
import { autoCompletionURL, loseEfficacy, mutationCompare } from "./utils";
import { StartParams } from ".";

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

export type Coord = {
  x: number;
  y: number;
};

export type Shape = {
  w: number;
  h: number;
};

enum ActionSource {
  Mutation,
  Scroll,
  Resize,
}

export enum ActionType {
  Attributes,
  Character,
  AddChildNode,
  RemoveChildNode,
  ScrollMove,
  Resize,
}

type NodeMappingOtherProps = {
  isMutation: boolean;
  invalidNodes: WeakMap<Node, number>;
};

export type Action = {
  id: number;
  timeStamp: number;
  /**
   * when type === ActionType.AddChildNode, parentId is the new-Node parent node
   */
  parentId?: number;
  nextSibling?: number | null;
  previousSibling?: number | null;
  changer?: Atom | string | Record<string, string> | Coord | Shape;
  source: ActionSource;
  type: ActionType;
};
let id = 0;

const actionQueue: Action[] = [];

export type CursorActionValue = Coord & {
  timeStamp: number;
  type: "move" | "click" | "doubleClick";
};

export type CursorAction = CursorActionValue[];

/**
 * matrix
 */
const cursorQueue: CursorAction[] = [];

let externalApi: StartParams = { emit: noop };
/**
 * this variable will change along with dom tree
 */
export const mirror = new WeakMap<Node, Atom>();
/**
 * this variable record origin dom tree data only
 */
let originTree: Atom;
/**
 * when recording/replaying specification of mirror-variable is { [dom]: { id: Number, source: '', type: '' } }
 */

const observer = new MutationObserver((mutationList, observer) => {
  let curQueueIdx = actionQueue.length;
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
                timeStamp: new Date().getTime(),
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
                childNodes: [] as Atom[],
              };
              /**
               * if this variable is true, it can prove the node has existed in dom-tree.
               * we should jump over it.
               */
              const isExist = mirror.get(node);
              const nextSibling =
                node.nextSibling && mirror.get(node.nextSibling)?.id;
              const previousSibling =
                node.previousSibling && mirror.get(node.previousSibling)?.id;
              if (!isExist) {
                nodeMapping(node, {
                  isMutation: true,
                  invalidNodes,
                });
                const n = mirror.get(node);
                const id = n!.id;
                tree.id = id;
                tree.childNodes = [n!];
                actionQueue.push({
                  parentId: mirror.get(mutation.target)!.id,
                  id,
                  timeStamp: new Date().getTime(),
                  changer: tree,
                  nextSibling,
                  previousSibling,
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
        const id = mirror.get(node)?.id;
        if (id) {
          const nodeInRecord = characterNodes.get(node);
          characterNodes.set(node, {
            initialValue: !nodeInRecord ? oldValue : nodeInRecord.initialValue,
            currentValue: newValue,
            index,
          });
          /**
           * collect before processing
           */
          characterAction[index] = {
            id,
            timeStamp: new Date().getTime(),
            changer: (node as Text).data,
            source: ActionSource[
              ActionSource.Mutation
            ] as unknown as ActionSource,
            type: ActionType[ActionType.Character] as unknown as ActionType,
          };
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
        let changer: Record<string, string> = {
          [mutation.attributeName!]: newValue,
        };
        const id = mirror.get(node)?.id;
        if (id) {
          /**
           * record value
           */
          const nodeInRecord = attributeNodes.get(node);
          attributeNodes.set(node, {
            initialValue: !nodeInRecord ? oldValue : nodeInRecord.initialValue,
            currentValue: newValue,
            index,
          });
          /**
           * collect before processing
           */
          attributeAction[index] = {
            id,
            timeStamp: new Date().getTime(),
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

  /* deposit to localStorage */
  if (actionQueue.length !== curQueueIdx) {
    /**
     * incremental update
     *
     * Simulating communication with server.
     */
    const waitDepositArray = actionQueue.slice(curQueueIdx);
    waitDepositArray.length &&
      externalApi.emit({
        actions: waitDepositArray,
      });
  }
});

function initialization(arg: StartParams) {
  externalApi = arg;
  kidnapEventListener();
  window.addEventListener(arg.recordAfter!, async () => {
    const rootNode = document.getRootNode();
    await loseEfficacy(rootNode as unknown as HTMLHtmlElement);
    nodeMapping(rootNode);
    externalApi.emit(null, originTree);
    eventListener();
    documentObserve();
  });
}

function pushActionArray() {
  /**
   * Every 20 millseconds record position of action.
   * Every 500 milliseconds put it into the actionQueue.
   */
  let actionArray: Action[] = [];
  let timeout: any;
  function launchTimeout(actionArray: Action[]) {
    timeout = setTimeout(() => {
      if (actionArray.length) {
        externalApi.emit({
          actions: actionArray,
        });
        actionArray.length = 0;
        timeout = null;
      }
    }, 500);
  }

  function push(cur: Action) {
    if (!actionArray.length && !timeout) {
      launchTimeout(actionArray);
    }
    actionArray.push(cur);
  }

  return push;
}

function kidnapEventListener() {
  const push = pushActionArray();
  const originMethod = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, listener, ...args) {
    if (type === "scroll") {
      const originListener = listener;
      listener = debounce(
        (ev) => {
          const { scrollLeft, scrollTop } = ev.target as HTMLElement;
          const target = mirror.get(ev.target);
          if (target) {
            push({
              id: target.id,
              timeStamp: new Date().getTime(),
              changer: { x: scrollLeft, y: scrollTop },
              source: ActionSource[
                ActionSource.Scroll
              ] as unknown as ActionSource,
              type: ActionType[ActionType.ScrollMove] as unknown as ActionType,
            });
          }
          if (originListener) {
            if ("call" in originListener) {
              originListener!.call(this, ev);
            } else {
              originListener?.handleEvent.call(this, ev);
            }
          }
        },
        20,
        { leading: true, trailing: true }
      );
    }
    originMethod.call(this, type, listener, ...args);
  };
}

function pushCursorArray() {
  /**
   * Every 20 millseconds record position of cursor.
   * Every 500 milliseconds put it into the cursorQueue.
   */
  let cursorArray: CursorActionValue[] = [];
  let timeout: any;
  function launchTimeout() {
    timeout = setTimeout(() => {
      if (cursorArray.length) {
        externalApi.emit({
          cursors: [[...cursorArray]],
        });
        cursorArray.length = 0;
        timeout = null;
      }
    }, 500);
  }

  function push(cur: CursorActionValue) {
    if (!cursorArray.length && !timeout) {
      launchTimeout();
    }
    cursorArray.push(cur);
  }

  return push;
}

/**
 * we need to use canvas to drawing.
 * https://stackoverflow.com/a/48136944
 * because the browser is reporting "the mouse has moved, and it is now here", not "...and went through these pixels".
 * https://stackoverflow.com/a/5259071
 */
function eventListener() {
  const push = pushCursorArray();
  const pushAction = pushActionArray();
  document.addEventListener(
    "mousemove",
    debounce(
      (ev) => {
        const timeStamp = new Date().getTime();
        const { clientX, clientY } = ev;
        const current: CursorActionValue = {
          x: clientX,
          y: clientY,
          timeStamp,
          type: "move",
        };
        push(current);
      },
      20,
      {
        leading: true,
        trailing: true,
      }
    )
  );
  document.addEventListener(
    "click",
    debounce(
      (ev) => {
        const timeStamp = new Date().getTime();
        const { clientX, clientY } = ev;
        const current: CursorActionValue = {
          x: clientX,
          y: clientY,
          timeStamp,
          type: "click",
        };
        push(current);
      },
      20,
      {
        leading: true,
        trailing: true,
      }
    )
  );

  window.addEventListener(
    "resize",
    debounce(
      () => {
        const { innerWidth, innerHeight } = window;
        const timeStamp = new Date().getTime();
        const current = {
          id: -1,
          timeStamp,
          changer: { w: innerWidth, h: innerHeight },
          source: ActionSource[ActionSource.Resize] as unknown as ActionSource,
          type: ActionType[ActionType.Resize] as unknown as ActionType,
        };
        pushAction(current);
      },
      20,
      {
        leading: true,
        trailing: true,
      }
    )
  );
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

function nodeMapping(rootNode: Node, other?: NodeMappingOtherProps) {
  const { isMutation, invalidNodes } = other || {};
  if (isMutation) {
    const isInvalid = invalidNodeCheck(isMutation, invalidNodes!, rootNode);
    if (isInvalid) return;
  }
  const n: Atom = getDomAtom(rootNode);
  if (!originTree) {
    n.namespaceURI = document.documentElement.namespaceURI;
    originTree = n;
  }
  if (!mirror.get(rootNode)) {
    mirror.set(rootNode, n);
    nodeChildMapping(rootNode, n);
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
  tree: Atom,
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
