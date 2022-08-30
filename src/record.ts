const queue: Node[] = [];

function initialization() {
  window.addEventListener("load", () => {
    queue.push(document.cloneNode(true));
  });
}

export default initialization;

export { queue };
