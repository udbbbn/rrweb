import type { Record } from "./recordTable"
import { to, type RecordResponse } from "@/utils"
import { dayjs } from "element-plus"
import { defineComponent, ref, watchEffect } from "vue"
import { useRouter } from "vue-router"
import rrweb from "rrweb"

type Props = {
  id: string
}

export default defineComponent<Props>({
  emits: [],
  components: {},
  setup(props, ctx) {
    const router = useRouter()
    const { id } = router.currentRoute.value.query
    const record = ref<Record | null>(null)

    const getData = async () => {
      const [err, res] = await to<RecordResponse<Record>>(
        fetch(`http://127.0.0.1:8000/record/${id}`, {
          credentials: "include",
        })
      )
      if (!err) {
        record.value = {
          ...res.data!,
          createTime: dayjs(res.data!.createTime).format("YYYY-MM-DD hh:mm:ss"),
        }
        rrweb.replay({
          fullSnapshot: JSON.parse(record.value.structure),
          timeTable: JSON.parse(record.value.timeTable || JSON.stringify({})),
          actions: JSON.parse(record.value.actionQueue || JSON.stringify([])),
          cursors: JSON.parse(record.value.cursorQueue || JSON.stringify([])),
        })
      }
    }

    watchEffect(() => {
      if (id) {
        getData()
      }
    })
    return () => <div></div>
  },
})
