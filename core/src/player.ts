import { Coord } from "./record";
import dayjs from "dayjs";
import { createPlayer } from "./utils";
import { PauseIcon, PlayIcon, noop } from "./constant";

type KeysMatching<T> = NonNullable<{ [K in keyof T]: K }[keyof T]>;

type PlayerEvents = {
  play: () => void;
  pause: () => void;
};
export default class Player {
  cvs: HTMLCanvasElement | null = null;
  ctx: CanvasRenderingContext2D | null = null;
  /**
   * events
   */
  events: PlayerEvents = {
    play: noop,
    pause: noop,
  };
  /**
   * record timeStamp.
   * The progress bar can be calculated automatically.
   */
  timeStart: number | null = null;
  timeEnd: number | null = null;
  status: "playing" | "pause" = "pause";

  constructor(container: HTMLElement) {
    /**
     * create canvas
     */
    this.cvs = document.createElement("canvas");
    this.cvs.className = "rrweb-canvas";
    this.ctx = this.cvs.getContext("2d");
    container.appendChild(this.cvs);
    /**
     * create player
     */
    const { timeStart, timeEnd, progress, punctation, play } =
      createPlayer(container);
    this.observer({ timeStart, timeEnd, progress, punctation, play });
  }

  observer({
    timeStart,
    timeEnd,
    progress,
    punctation,
    play,
  }: ReturnType<typeof createPlayer>) {
    const panel = new Proxy(this, {
      set: (target: typeof this, prop: KeysMatching<Player>, value) => {
        if (prop === "status") {
          if ((value as Player["status"]) === "playing") {
            play.src = PauseIcon;
            this.events.play();
          } else {
            play.src = PlayIcon;
            this.events.pause();
          }
        }
        (target[prop] as Player[KeysMatching<Player>]) = value;
        return true;
      },
    });
    play.addEventListener("click", () => {
      if (this.status === "pause") {
        panel.status = "playing";
      } else {
        panel.status = "pause";
      }
    });
    /**
     * autoplay
     */
    setTimeout(() => {
      play.click();
    });
  }

  registerEvents(event: PlayerEvents) {
    this.events = event;
  }

  drawLine(starting: Coord, destination: Coord) {
    this.ctx!.beginPath();
    this.ctx!.strokeStyle = "red";
    this.ctx!.moveTo(starting.x, starting.y);
    this.ctx!.lineTo(destination.x, destination.y);
    this.ctx!.stroke();
    this.ctx!.closePath();
    setTimeout(() => {
      this.ctx!.clearRect(0, 0, this.cvs!.width, this.cvs!.height);
    }, 600);
  }

  setCvsProfile(w: number, h: number) {
    this.cvs!.width = w;
    this.cvs!.height = h - 60;
  }
}
