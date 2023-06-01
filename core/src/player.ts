import { Coord, TimeTable } from "./record";
import { createPlayer, timeToSecond } from "./utils";
import { PauseIcon, PlayIcon, noop } from "./constant";
import dayjs from "dayjs";

type KeysMatching<T> = NonNullable<{ [K in keyof T]: K }[keyof T]>;

type PlayerEvents = {
  play: () => void;
  pause: () => void;
  onProcessChange: (tb: Partial<{ action: number; cursor: number }>) => void;
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
    onProcessChange: noop,
  };
  /**
   * record timeStamp.
   * The progress bar can be calculated automatically.
   */
  timeStart: number | null = null;
  timeEnd: number | null = null;
  status: "playing" | "pause" = "pause";

  /**
   * proxy target can update corresponding ui automatically
   */
  panel: Player;
  /**
   * used to process time
   */
  timeBenchmark: number = 0;

  timeTable: TimeTable = {};

  timer: NodeJS.Timer | null = null;

  constructor(container: HTMLElement, timeTable: TimeTable) {
    this.timeTable = timeTable;
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
    const { timeStart, timeEnd, progress, progressDone, punctation, play } =
      createPlayer(container);
    this.panel = this.observer({
      timeStart,
      timeEnd,
      progress,
      progressDone,
      punctation,
      play,
    });
  }

  observer({
    timeStart,
    timeEnd,
    progress,
    progressDone,
    punctation,
    play,
  }: ReturnType<typeof createPlayer>) {
    progress.addEventListener("click", (ev) => {
      const rate = ev.offsetX / 180;
      const second = Math.floor(timeToSecond(timeEnd.innerText) * rate);
      this.events.onProcessChange(this.timeTable[second]);
    });
    const panel = new Proxy(this, {
      set: (target: typeof this, prop: KeysMatching<Player>, value) => {
        if (prop === "status") {
          if ((value as Player["status"]) === "playing") {
            play.src = PauseIcon;
            this.events.play();
            queueMicrotask(() => {
              this.setTimer();
            });
          } else {
            play.src = PlayIcon;
            this.events.pause();
            this.clearTimer();
          }
        }
        if (prop === "timeStart") {
          timeStart.innerText = dayjs(value)
            .subtract(this.timeBenchmark, "ms")
            .subtract(8, "hour")
            .format("HH:mm:ss");
          progressDone.style.width =
            ((value! - this.timeBenchmark) /
              (this.timeEnd! - this.timeBenchmark)) *
              100 +
            "%";
          punctation.style.left = `calc(${
            ((value! - this.timeBenchmark) /
              (this.timeEnd! - this.timeBenchmark)) *
              100 +
            "%"
          } - 10px)`;
        }
        if (prop === "timeEnd") {
          /**
           * avoid event haven't processing. so +1s.
           */
          value = dayjs(value).add(1, "s").endOf("second").valueOf();
          timeEnd.innerText = dayjs(value)
            .subtract(this.timeBenchmark, "ms")
            .subtract(8, "hour")
            .format("HH:mm:ss");
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
    return panel;
  }

  setTimer() {
    if (!this.timer) {
      this.timer = setInterval(() => {
        if (this.status === "playing") {
          const ts = dayjs(this.timeStart).add(1, "second");
          if (ts.valueOf() >= dayjs(this.timeEnd).valueOf()) {
            console.log("preset timer pause", ts.valueOf(), this.timeEnd);
            setTimeout(() => {
              console.log("set timer pause");
              this.panel.status = "pause";
            }, ts.valueOf() - this.timeEnd!);
          } else {
            this.panel.timeStart = ts.valueOf();
          }
        }
      }, 1000);
    }
  }

  clearTimer() {
    clearInterval(this.timer!);
    this.timer = null;
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
    this.cvs!.height = h;
  }
}
