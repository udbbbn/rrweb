import { createRouter, createWebHistory } from "vue-router";
import Table from "../views/recordTable";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "Table",
      component: Table,
    },
    {
      path: "/player",
      name: "player",
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import("../views/recordPlayer"),
    },
  ],
});

export default router;
