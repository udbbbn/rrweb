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

export const noop = () => {};

export const ScrollDirectionIcon = `data:image/png;base64,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`;

export const CursorIcon = `data:image/png;base64,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`;

export const PlayIcon = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAAAXNSR0IArs4c6QAACVNJREFUeF7tnVFy2zgQBen78BDJyZycbHMI3SdbSEkuli2ZeDMYkJxp/7h2M4CEfmwBBE3qbeEHAhB4SeANNhCAwGsCCMLRAYFvCCAIhwcEEIRjAAI2AswgNm60KkIAQYoEzTBtBBDExo1WRQggSJGgGaaNAILYuNGqCAEEKRI0w7QRQBAbN1oVIYAgRYJmmDYCCGLjRqsiBBCkSNAM00YAQWzcaFWEAIIUCZph2gggiI0brYoQQJAiQTNMGwEEsXGjVRECCFIkaIZpI4AgNm60KkIAQYoEzTBtBBDExo1WRQggSJGgGaaNAILYuNGqCAEEKRI0w7QRQBAbN1oVIYAgRYJmmDYCCGLjRqsiBBCkSNAM00YAQWzcaFWEAIIUCZph2gggiI0brYoQQJAiQTNMGwEEsXGjVRECCFIkaIZpI4AgG27ruv66/+ef9vt2u/37zU9dAgiyLMtdjPcnh0ET5DeiIEhZAuu6/rcsy48dAE2Sx+xSllXFgZeeQb6ZOZ4dC39ut9vPigdJ5TFXF+SvGD5LLhHY1cvLCrKua1tWteWV5Ycll4XaBdtUFqSdUzw7Me+NEUl6SV24DkF84bHk8vE7fWsEGRPRT7aCx4A8Wy8IMi4RllzjWJ6mJwQZGwVbwWN5Ht4bgsREwJIrhuv0XhEkDjlLrji203pGkFjUSBLLN7x3BAlHvLAVHM847BUQJAztl46ZTeaxHvZKCDIMZVdHSNKF6TxFCDI/C7aC5zM3vyKCmNG5G7IV7EYY3wGCaIzbCffezVVKjyy5FFoH1CKIAP12u72JN1n19M6Sq4fSQTUIIoBvgrTyCEm4910IYmIpggiwH4LcJWlLrXY/CUsugeHVShFESGwryKNZ50MfhFf59xQVHhChEAusRRAB7jNBWHIJAC9YiiBCaK8E2Sy5rPe4v3oXbAUL+USUIohA9TtBOC8RQF6oFEGEsPYE2ZyXeB8I8fldsRUs5DSyFEEEmr2CBJ2XtG5Zcgl5jShFEIGiIghLLgHsiUsRRAhHFYStYAHuSUsRRAjGKkjQkosbsYTsrKUIIpDzCBK4FcyFRSFDtRRBBGJeQVhyCbBPUoogQhCjBIlacvH1DEKYnaUI0gmqlY0UJHDJxVawkOleKYLsEdr8+2hB2AoW4B9UiiAC+AhBNuclXH0XsphViiAC6UhBos5LuBFLCPhJKYII/KIFYcklhDGpFEEE0DMEYStYCGRCKYIIkGcKwpJLCCawFEEEuLMFYStYCCeoFEEEsEcIwnmJEFBAKYIIUI8ShK1gIaTBpQgiAD1akKDzktYtV99fHAcIcjFBWHIJgQ0oRRAB4hlmkO3b5ZlcQnjGUgQRwJ1NkKAlFzdibY4JBLm4IIFbwdyItSwLgiQQZLPL1R5cx7OChUz3ShFkj9Dm38+4xPr89iOePF/5RiwESSZI4JKr5FYwgiQUhK1gIdSdUgQRWF5hicWSSwi0oxRBOiA9Sq4oCFvBQsBPShFE4HdVQVhyCSF/KkUQgd2VBWErWAiaC4W2L+LMIAhLLk0UZhCBVxZB2AruDx1B+lkNf3Cc8NIhpeu68k29bPM+J2C54pxpBtlSsbD47rjKxIkZRPhszhR88PWSNH/oiCAI8kFg4JIrzXcqIgiCfCGwrutfAcvT0iyzLYIIR0KW0L8b8qjzkSysEARBtkusUQ/QZoklHFenLLV8Umb5VHxygt62e9vNVqN+0vxpPDOIcEhkFMTyQbGDLM3s0caJIIUFCZAjzfbu47BAkIKCDNzO3dJLJwczyLK8C36k+FOTgFmjIUwpB4IUEyRAjlTnG88+LFliCVPIlU/SA+RIO2tsDwkESS5IgBipl1SfDwcESSxIgBzlHkuKIEkFCZCjxJKKGeROwHIAXeEchC1c4ROvo5QZpAPSo+Tsglik7xh+mj8b6RjrlxIEEaidWZAAOUouqVhiJVxi8UU6wqecWMoMIgA72wwSMGuU2sLtiR5Beijda84kSIAc6a+KC1F/lCKIQO0sggTIwfnGi+MAQS4kyH0Ld+SNTSypdvJHkIsIEjBrtJGX3sLtiR5BeigdfA4SIAdLqs7cEaQTVCubfQ7CVXEhnKBSBBHAzhQkYNbgfEPI+lGKIAK0WYIEyMEWrpDzthRBBHAzBAmQg/MNIePPpQgiwIsUJEAMllRCtq9KEUSAGCVIgBzlbmwSYpRKEUTAFSFIgBwsqYRM90oRZI/Q5t9HCsIWrgD+wFIEEeCPEiRg1mij4Kq4kGVvKYL0khp0oTBADpZUQoZqKYIIxLwzCDc2CbBPUoogQhBWQQJmDbZwhdw8pQgi0LMIEiAHV8WFzLylCCIQVAUJkIPzDSGvEaUIIlDsFYQbmwSoJy9FECGgHkECZg22cIWMRpciiEB0T5AAOVhSCflElCKIQPWVIFwVFyBerBRBhMCeCRIwa7CFK2QSXYogAuHPggTIwRaukMeMUgQRKG8FCZCD8w0hi1mlCCKQboIEiMGSSshgdimCaMR/L+IXf+50z41NGv/p1QgyHfnHC7KkOo599ysjSDeqoYXIMRRnXGcIEsf2Vc/c2DSfufkVEcSMTm7IrCEjO74BgszJADnmcB7+KggyHOmXDpEjnnHYKyBIGNqFq+JxbKf1jCAxqJk1YrhO7xVBxiNHjvFMD+sRQcaiZwt3LM/De0OQMREwa4zheLpeEMQfCXL4GZ62BwTxRYMcPn6nb40gtojYwrVxu1yryoL8WJbF8p3jzBqXO8ztb7isIA2Z4eYn5LAfa5dsWV2Q3lmEG5sueXj733RpQe6zSJPkfVmW9vvZD7OG/zi7bA/lBXkkt3m2VftfTZZ2e+1yu91+XTZd3ribAIK4EdJBZgIIkjldxuYmgCBuhHSQmQCCZE6XsbkJIIgbIR1kJoAgmdNlbG4CCOJGSAeZCSBI5nQZm5sAgrgR0kFmAgiSOV3G5iaAIG6EdJCZAIJkTpexuQkgiBshHWQmgCCZ02VsbgII4kZIB5kJIEjmdBmbmwCCuBHSQWYCCJI5XcbmJoAgboR0kJkAgmROl7G5CSCIGyEdZCaAIJnTZWxuAgjiRkgHmQkgSOZ0GZubAIK4EdJBZgIIkjldxuYmgCBuhHSQmQCCZE6XsbkJIIgbIR1kJoAgmdNlbG4CCOJGSAeZCSBI5nQZm5sAgrgR0kFmAgiSOV3G5ibwPyg6+PZRFbbRAAAAAElFTkSuQmCC`;

export const PauseIcon = `data:image/png;base64,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`;
