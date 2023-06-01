import { NodeType, ScrollDirectionIcon, SvgTypes } from "./constant";
import {
  Atom,
  Action,
  ActionType,
  CursorAction,
  CursorActionValue,
  Coord,
  Shape,
  TimeTable,
} from "./record";
import {
  createWaveAnimation,
  createCursor,
  createSandbox,
  setAttributes,
  setPosition,
} from "./utils";
import "./index.scss";
import { ReplayParams } from ".";
import Player from "./player";

type AtomElement = HTMLElement | Text | SVGElement;

let tree: Atom;
let actionQueue: Action[];
let curActionIdx = 0;
let cursorQueue: CursorAction;
let curCursorIdx = 0;
let cursorRunning: CursorActionValue | null = null;
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

/**
 * first-screen alone setting
 */
async function setFirstScreen(timeTable: TimeTable) {
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
  document.body.style.position = "relative";
  cursorInstance = createCursor(iframeDoc?.querySelector("body")!);
  player = new Player(document.body, timeTable);
  player.registerEvents({
    play: () => {
      queueMicrotask(replayStep);
    },
    pause: () => {},
    onProcessChange: ({ action, cursor }) => {
      curActionIdx = action ?? curActionIdx;
      curCursorIdx = cursor ?? curCursorIdx;
      if (player.status === "pause") {
        player.panel.status = "playing";
      }
    },
  });
  player.panel.timeBenchmark = actionQueue[0].timeStamp;
  player.panel.timeStart = getStartTimeStamp();
  player.panel.timeEnd = getEndTimeStamp();
  /**
   * autoplay
   */
  setTimeout(() => {
    player.panel.status = "playing";
  });
}

const getEndTimeStamp = () => {
  const at = actionQueue[actionQueue.length - 1].timeStamp;
  const ct = cursorQueue[cursorQueue.length - 1].timeStamp;
  return at > ct ? at : ct;
};

const getStartTimeStamp = () => {
  const at = actionQueue[1].timeStamp;
  const ct = cursorQueue[0].timeStamp;
  return at > ct ? at : ct;
};

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
  const step = cursorRunning!;
  if (!!step) {
    const lastCursorTimeStamp = performance.now();
    const dest = { x: step.x, y: step.y };
    if (step.type === "move") {
      setPosition(cursorInstance, dest);
      player.drawLine(cursorPrevCoord, dest);
      cursorPrevCoord = dest;
    } else if (step.type === "click") {
      createWaveAnimation(globalIframeDoc, dest);
    }
    ++curCursorIdx;
    const curStepRunningTime = performance.now() - lastCursorTimeStamp;
    if (curStepRunningTime + step.timeStamp > cursorRunning!.timeStamp) {
      replayStep();
    } else {
      setTimeout(() => {
        replayStep();
      }, cursorRunning!.timeStamp - step.timeStamp - curStepRunningTime);
    }
  } else {
    // queueMicrotask(replayStep);
    replayStep();
  }
}

/**
 * The step process render when the current frame has idle time else invoke requestAnimationFrame.
 */
function replayStep() {
  if (
    player.status === "pause" ||
    (!actionQueue[curActionIdx] && !cursorQueue[curCursorIdx])
  )
    return;
  const actStep = actionQueue[curActionIdx]!;
  const cursorStep = cursorQueue[curCursorIdx];
  /* in period */
  if (cursorStep && (!actStep || actStep.timeStamp >= cursorStep.timeStamp)) {
    /* handle cursor moving  */
    cursorRunning = cursorStep;
    return replayCursorPath();
  }

  const lastTimeStamp = performance.now();

  switch (actStep.type) {
    case ActionType[ActionType.AddChildNode] as unknown as ActionType: {
      mirror.get(actStep.parentId!) &&
        pushTask(() => {
          createElementByTree(
            actStep.changer as Atom,
            mirror.get(actStep.parentId!)!,
            {
              nextSibling: mirror.get(actStep.nextSibling!),
              previousSibling: mirror.get(actStep.previousSibling!),
            }
          );
        });
      break;
    }
    case ActionType[ActionType.RemoveChildNode] as unknown as ActionType: {
      const ele = mirror.get(actStep.id);
      if (ele && ele.parentNode) {
        pushTask(() => {
          ele.parentNode!.removeChild(ele);
        });
      }
      break;
    }
    case ActionType[ActionType.Attributes] as unknown as ActionType: {
      const ele = mirror.get(actStep.id);
      ele &&
        pushTask(() => {
          setAttributes(
            ele as Element,
            { attributes: actStep.changer } as Atom
          );
        });
      break;
    }
    case ActionType[ActionType.Character] as unknown as ActionType: {
      const ele = mirror.get(actStep.id);
      ele &&
        pushTask(() => {
          (ele as Text).data = actStep.changer as string;
        });
      break;
    }
    case ActionType[ActionType.ScrollMove] as unknown as ActionType: {
      const ele = mirror.get(actStep.id);
      ele &&
        pushTask(() => {
          const { x, y } = actStep.changer as Coord;
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
        const { w, h } = actStep.changer as Shape;
        window.resizeTo(w, h + toolbarHeight);
        player.setCvsProfile(w, h);
      });
      break;
    }
    default:
      break;
  }

  ++curActionIdx;
  if (actionQueue.length > curActionIdx) {
    const { timeStamp } = actionQueue[curActionIdx];
    const curStepRunningTime = performance.now() - lastTimeStamp;
    if (curStepRunningTime + actStep.timeStamp > timeStamp) {
      replayStep();
    } else {
      setTimeout(() => {
        replayStep();
      }, timeStamp - actStep.timeStamp - curStepRunningTime);
    }
  } else if (cursorQueue[curCursorIdx]) {
    replayStep();
  }
}

function replay(arg: ReplayParams) {
  const { fullSnapshot, actions, cursors, timeTable } = arg;
  tree = fullSnapshot;
  actionQueue = actions;
  cursorQueue = cursors;
  setFirstScreen(timeTable);
}

export { replay };
