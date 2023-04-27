import { Fragment, defineComponent, ref, watchEffect } from 'vue'
import { ElButton, ElTable, ElTableColumn, dayjs } from 'element-plus'
import { to, type RecordResponse } from '@/utils'

export interface Record {
  createTime: string
  moduleId: string
  projectId: string
  projectName: string
  structure: string
  actionQueue: string
  cursorQueue: string
  _id: string
}

export default defineComponent({
  name: 'Table',
  props: {},
  emits: [],
  components: {},
  setup(props, ctx) {
    const record = ref<Record[]>([])

    const columns = [
      {
        prop: 'projectId',
        label: '项目Id'
      },
      {
        prop: 'projectName',
        label: '项目名称'
      },
      {
        prop: 'moduleId',
        label: '模块Id'
      },
      {
        prop: 'createTime',
        label: '创建时间'
      },
      {
        prop: 'action',
        label: '操作'
      }
    ]

    const getData = async () => {
      const [err, res] = await to<RecordResponse<Record[]>>(
        fetch('http://127.0.0.1:8000/record/all')
      )
      if (!err) {
        record.value = (res.data || []).map((el) => ({
          ...el,
          createTime: dayjs(el.createTime).format('YYYY-MM-DD hh:mm:ss')
        }))
      }
    }

    watchEffect(() => {
      getData()
    })

    const openDetail = (item: any) => {
      window.open(`/player?id=${item._id}`, '', 'resizable')
    }

    return () => (
      <ElTable data={record.value}>
        {columns.map((el) =>
          el.prop === 'action' ? (
            <ElTableColumn fixed="right" label="操作" width={150}>
              {({ row }: any) => (
                <ElButton
                  link
                  type="primary"
                  size="small"
                  onClick={() => {
                    openDetail(row)
                  }}
                >
                  查看流程
                </ElButton>
              )}
            </ElTableColumn>
          ) : (
            <ElTableColumn {...el} width={180}></ElTableColumn>
          )
        )}
      </ElTable>
    )
  }
})
