import initialization from "./record";
import { replay } from "./replay";

export default {
  start: () => {
    initialization();
  },
  replay,
};
