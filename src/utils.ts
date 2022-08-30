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
