import { Coord } from "./record";

export default class Player {
  cvs: HTMLCanvasElement | null = null;
  ctx: CanvasRenderingContext2D | null = null;
  constructor(container: HTMLElement) {
    this.cvs = document.createElement("canvas");
    this.cvs.width = document.body.clientWidth;
    this.cvs.height = document.body.clientHeight;
    this.cvs.className = "rrweb-canvas";
    this.ctx = this.cvs.getContext("2d");
    this.ctx!.strokeStyle = "red";
    container.appendChild(this.cvs);
  }

  drawLine(starting: Coord, destination: Coord) {
    this.ctx!.beginPath();
    this.ctx!.moveTo(starting.x, starting.y);
    this.ctx!.lineTo(destination.x, destination.y);
    this.ctx!.stroke();
    this.ctx!.closePath();
    setTimeout(() => {
      this.ctx!.clearRect(0, 0, this.cvs!.width, this.cvs!.height);
    }, 600);
  }
}
