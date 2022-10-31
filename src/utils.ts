import { Atom } from "./record";

window.requestIdleCallback =
  window.requestIdleCallback ||
  function (handler) {
    let startTime = Date.now();

    return setTimeout(function () {
      handler({
        didTimeout: false,
        timeRemaining: function () {
          return Math.max(0, 50.0 - (Date.now() - startTime));
        },
      });
    }, 1);
  };

export function request(url: string, options?: RequestInit) {
  if (!window.fetch) {
    throw new Error(
      `your browser can't support fetch method, please use polyfill instead`
    );
  }

  return fetch(url, {
    mode: "cors",
    ...options,
  })
    .then((res) => res.text())
    .then((data) => data);
}

/**
 * The purpose is replace script tag to noscript tag
 *
 * Script needn't load because we can record web mutation
 * And we should ensure style load correct
 * @param node HTMLHtmlElement
 * @returns node
 */
export async function loseEfficacy(node: HTMLHtmlElement) {
  const linkUrls: string[] = [];
  node.querySelectorAll("script").forEach((scriptEle) => {
    const noscript = document.createElement("noscript");
    const attributes = scriptEle.getAttributeNames();
    attributes.forEach((attr) => {
      noscript.setAttribute(attr, scriptEle.getAttribute(attr)!);
    });
    scriptEle.parentNode!.replaceChild(noscript, scriptEle);
  });
  /**
   * i don't know why replace tag make content of head move to body when rel attribute of tag equal 'shortcut icon'
   */
  node.querySelectorAll("[rel=stylesheet]").forEach((linkEle) => {
    const nolink = document.createElement("nolink");
    const attributes = linkEle.getAttributeNames();
    attributes.forEach((attr) => {
      const value = linkEle.getAttribute(attr)!;
      if (attr === "href") linkUrls.push(value);
      nolink.setAttribute(attr, value);
    });
    linkEle.replaceWith(linkEle);
  });
  if (linkUrls.length) {
    const styles = await loadCss(linkUrls);
    const fragment = parseStyleNode(styles);
    addStyleNode(fragment, node.querySelector("head")!);
  }
  return node;
}

/**
 * request css link
 * @param linkUrls link url array
 * @returns Promise
 */
async function loadCss(linkUrls: string[]) {
  return Promise.all(linkUrls.map((link) => request(link)));
}

/**
 * parse style string and return fragment
 * @param styles style string array
 * @returns DocumentFragment
 */
function parseStyleNode(styles: string[]) {
  const fragment = document.createDocumentFragment();
  styles.forEach((str) => {
    const style = document.createElement("style");
    style.appendChild(document.createTextNode(str));
    fragment.appendChild(style);
  });
  return fragment;
}

function addStyleNode(fragment: DocumentFragment, container: HTMLElement) {
  container.insertBefore(fragment, container.lastChild);
}

/**
 * set attribute
 */
export function setAttributes(ele: Element, n: Atom) {
  if (n.attributes) {
    Object.entries(n.attributes).forEach(([key, value]) => {
      ele.setAttribute(key, value);
    });
  }
}

/**
 * if attribute of an object is relative path
 * it needs to translate to an absolute path
 * @param attribute
 * @returns
 */
export function autoCompletionURL(attribute: string | null) {
  if (attribute) {
    if (attribute.startsWith("./") || attribute.startsWith("../")) {
      return window.location.href + attribute;
    }
    if (attribute.startsWith("/")) {
      return window.location.origin + attribute;
    }
  }
  return attribute;
}

/**
 * sandbox ensure code isolation.
 *
 * @param container
 * @returns
 */
export async function createSandbox(container: HTMLElement) {
  return new Promise<HTMLIFrameElement>((resolve) => {
    const frame = document.createElement("iframe");
    frame.setAttribute("sandbox", "allow-same-origin");
    frame.setAttribute("frameborder", "0");
    frame.style.width = "100vw";
    frame.style.height = "100vh";
    frame.onload = () => {
      resolve(frame);
    };
    container.appendChild(frame);
  });
}

export function createCursor(container: HTMLElement) {
  const wrapper = document.createElement("div");
  const img = document.createElement("img");
  img.width = 22;
  img.height = 24;
  wrapper.style.cssText = `position: fixed; z-Index: 999999; left: 0; top: 0`;
  wrapper.id = "rrweb-cursor";
  img.src =
    "data:image/png;base64,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";
  wrapper.appendChild(img);
  container.appendChild(wrapper);
  return wrapper;
}

export function setPosition(
  container: HTMLElement,
  coord: { x: number; y: number }
) {
  const { x, y } = coord;
  container.style.left = `${x}px`;
  container.style.top = `${y}px`;
}

export function createWaveAnimation(
  container: HTMLElement,
  coord: { x: number; y: number }
) {
  const { x, y } = coord;
  const wave = document.createElement("div");
  wave.classList.add("rrweb-click");
  wave.style.cssText = `position: fixed; z-Index: 99999999; left: ${x}px; top: ${y}px`;
  container.appendChild(wave);
  setTimeout(() => {
    container.removeChild(wave);
  }, 300);
}

export function sleep(timeout: number) {
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, timeout);
  });
}

/**
 * new XMLSerializer().serializeToString method will escape.
 * so we need use this method handle.
 *
 * @param str
 * @returns
 */
export function escape2Html(str: string) {
  const arrEntities = { lt: "<", gt: ">", nbsp: " ", amp: "&", quot: '"' };
  return str.replace(
    /&(lt|gt|nbsp|amp|quot);/gi,
    function (all, t: keyof typeof arrEntities) {
      return arrEntities[t];
    }
  );
}

/**
 * sort method
 * @param a
 * @param b
 * @returns
 */
export function mutationCompare(a: MutationRecord, b: MutationRecord) {
  return a.type === "childList"
    ? b.type === "childList"
      ? 0
      : -1
    : b.type === "childList"
    ? 1
    : 0;
}
