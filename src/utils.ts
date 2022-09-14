import { Atom } from "./record";

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
