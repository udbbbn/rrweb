import { createApp } from "vue";
import { createPinia } from "pinia";
import "element-plus/dist/index.css";

import App from "./App";
import router from "./router";

import "./assets/main.css";

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount("#app");
