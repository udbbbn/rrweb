import { NodeType, ScrollDirectionIcon, SvgTypes } from "./constant";
import {
  Atom,
  Action,
  ActionType,
  CursorAction,
  CursorActionValue,
  Coord,
  Shape,
} from "./record";
import {
  createWaveAnimation,
  createCursor,
  createSandbox,
  setAttributes,
  setPosition,
} from "./utils";
import "./index.css";
import { ReplayParams } from ".";
import Player from "./player";

type AtomElement = HTMLElement | Text | SVGElement;

let tree: Atom;
let actionQueue: Action[];
let cursorQueue: CursorAction[];
let curCursorIdx = 0;
let cursorRunning: CursorActionValue[] = [];
let cursorInstance: HTMLDivElement;
let cursorPrevCoord: Coord = { x: 0, y: 0 };
let doc: XMLDocument;
let globalIframeDoc: HTMLElement;
let player: Player;
let tasks: Function[] = [];

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
  const head = document.head.cloneNode(true);
  /**
   * https://developer.mozilla.org/en-US/docs/Web/API/XMLSerializer
   */
  document.write(new XMLSerializer().serializeToString(htmlDoc));
  document.close();
  /**
   * insure css-style existing
   */
  document.head.replaceWith(head);
  /**
   * create sandbox ensure inline scripts don't work.
   */
  const iframe = await createSandbox(document.body);
  iframe.contentDocument!.open("text/htmlreplace");
  iframe.contentDocument!.write("<!DOCTYPE html><html></html>");
  iframe.contentDocument!.close();
  const iframeDoc = iframe.contentDocument?.documentElement;
  globalIframeDoc = iframeDoc!;
  /**
   * delete head & body Node
   *
   * Those nodes have existed in the fragment.
   */
  iframeDoc!.removeChild(iframeDoc!.lastChild!);
  iframeDoc!.removeChild(iframeDoc!.lastChild!);
  iframeDoc?.appendChild(fragment);
  cursorInstance = createCursor(iframeDoc?.querySelector("body")!);
  player = new Player(document.body);
  requestAnimationFrame(replayStep);
}

function recursionChild(n: Atom, container: Node) {
  const render = () => createElementByTree(n, container);
  if (n.childNodes.length) {
    render();
  }
}
/**
 * recover dom tree
 * The initial rendering process render immediately.
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

function requestRender(deadline: IdleDeadline) {
  if (tasks.length) {
    const task = tasks.shift();
    if (deadline.timeRemaining() > 0) {
      task!();
    } else {
      requestAnimationFrame(task as FrameRequestCallback);
    }
  }
}

function pushTask(task: Function) {
  tasks.push(task);
  requestIdleCallback(requestRender);
}

async function replayCursorPath() {
  const act = cursorRunning.shift()!;
  if (!!act) {
    const lastCursorTimeStamp = performance.now();
    const dest = { x: act.x, y: act.y };
    if (act.type === "move") {
      setPosition(cursorInstance, dest);
      player.drawLine(cursorPrevCoord, dest);
      cursorPrevCoord = dest;
    } else if (act.type === "click") {
      createWaveAnimation(globalIframeDoc, dest);
    }
    const curStepRunningTime = performance.now() - lastCursorTimeStamp;
    if (curStepRunningTime + act.timeStamp > cursorRunning[0]?.timeStamp) {
      pushTask(replayCursorPath);
    } else {
      setTimeout(() => {
        replayCursorPath();
      }, cursorRunning[0]?.timeStamp - act.timeStamp);
    }
  } else {
    pushTask(replayStep);
  }
}

/**
 * The step process render when the current frame has idle time else invoke requestAnimationFrame.
 */
function replayStep() {
  if (
    !actionQueue.length &&
    !(cursorQueue[curCursorIdx] && cursorQueue[curCursorIdx].length)
  )
    return;
  const step = actionQueue.shift()!;
  const actions = cursorQueue[curCursorIdx];
  /* in period */
  if (
    actions &&
    actions.length &&
    (!step || step.timeStamp >= actions[0].timeStamp)
  ) {
    /* handle cursor moving  */
    const limit = actions.filter(
      (act) => act.timeStamp <= (!step ? Infinity : step.timeStamp)
    ).length;
    if (limit !== 0) {
      step && actionQueue.unshift(step);
      cursorRunning = actions.splice(0, limit);
      /**
       * If current actions perform completion, the curCursorIdx increase.
       */
      !actions.length && ++curCursorIdx;
      return replayCursorPath();
    }
  }

  const lastTimeStamp = performance.now();

  switch (step.type) {
    case ActionType[ActionType.AddChildNode] as unknown as ActionType: {
      mirror.get(step.parentId!) &&
        pushTask(() => {
          createElementByTree(
            step.changer as Atom,
            mirror.get(step.parentId!)!,
            {
              nextSibling: mirror.get(step.nextSibling!),
              previousSibling: mirror.get(step.previousSibling!),
            }
          );
        });
      break;
    }
    case ActionType[ActionType.RemoveChildNode] as unknown as ActionType: {
      const ele = mirror.get(step.id);
      if (ele && ele.parentNode) {
        pushTask(() => {
          ele.parentNode!.removeChild(ele);
        });
      }
      break;
    }
    case ActionType[ActionType.Attributes] as unknown as ActionType: {
      const ele = mirror.get(step.id);
      ele &&
        pushTask(() => {
          setAttributes(ele as Element, { attributes: step.changer } as Atom);
        });
      break;
    }
    case ActionType[ActionType.Character] as unknown as ActionType: {
      const ele = mirror.get(step.id);
      ele &&
        pushTask(() => {
          (ele as Text).data = step.changer as string;
        });
      break;
    }
    case ActionType[ActionType.ScrollMove] as unknown as ActionType: {
      const ele = mirror.get(step.id);
      ele &&
        pushTask(() => {
          const { x, y } = step.changer as Coord;
          (ele as HTMLElement).scrollLeft = x;
          (ele as HTMLElement).scrollTop = y;
        });
      break;
    }
    case ActionType[ActionType.Resize] as unknown as ActionType: {
      pushTask(() => {
        /**
         * w & h is innerWidth/innerHeight
         * We need to accrete toolbarHeight.
         */
        const { innerHeight, outerHeight } = window;
        const toolbarHeight = outerHeight - innerHeight;
        const { w, h } = step.changer as Shape;
        window.resizeTo(w, h + toolbarHeight);
        player.setCvsProfile(w, h);
      });
      break;
    }
    default:
      break;
  }

  if (actionQueue.length) {
    const { timeStamp } = actionQueue[0];
    const curStepRunningTime = performance.now() - lastTimeStamp;
    if (curStepRunningTime + step.timeStamp > timeStamp) {
      pushTask(replayStep);
    } else {
      setTimeout(() => {
        replayStep();
      }, timeStamp - step.timeStamp);
    }
  } else if (cursorQueue[curCursorIdx] && cursorQueue[curCursorIdx].length) {
    pushTask(replayStep);
  }
}

function replay(arg: ReplayParams) {
  const { fullSnapshot, actions, cursors } = arg;
  tree = fullSnapshot;
  actionQueue = actions;
  cursorQueue = cursors;
  setFirstScreen();
}

export { replay };
