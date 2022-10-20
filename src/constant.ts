/**
 * source: https://developer.mozilla.org/zh-CN/docs/Web/API/Node/nodeType
 */
export enum NodeType {
  "Element" = 1,
  "Attribute" = 2,
  "Text" = 3,
  "CdataSection" = 4, // what's this type ??
  "Processing" = 7, // and this ?
  "Comment" = 8,
  "Document" = 9,
  "DocumentType" = 10,
  "DocumentFragment" = 11,
}

export const SvgTypes = [
  "rect",
  "circle",
  "ellipse",
  "line",
  "polygon",
  "polyline",
  "svg",
  "text",
  "g",
  "filter",
  "feGaussianBlur",
  "feOffset",
  "feBlend",
  "linearGradient",
  "stop",
  "radialGradient",
  "path",
  "defs",
];

export const storagePrefix = "rrweb";
