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

export function setAttributes(ele: Element, n: Atom) {
  /**
   * set attribute
   */
  if (n.attributes) {
    Object.entries(n.attributes).forEach(([key, value]) => {
      ele.setAttribute(key, value);
    });
  }
}
