/** 默认配置 */
const defaultConfig = {
  "showCode": true,
  "isNeedType": false,
  "isNeedAxiosType": false,
  "isNeedSecondType": false,
  "dataParseName": "detailMsg",
  "outputStyle": "nameExport",
  "axiosName": "fetch",
  "basepath": "",
  "customParams": []
}

let editor = null
/** 初始化表单 */
function init(apiConfig) {
  if (apiConfig) Object.assign(defaultConfig, apiConfig)
  console.log(defaultConfig);
  JSONEditor.defaults.theme = 'spectre';
  JSONEditor.defaults.iconlib = 'spectre';
  editor = new JSONEditor(document.getElementById('editor_config'), {
    disable_collapse: true,
    disable_properties: true,
    schema: {
      type: "object",
      title: "API 全局配置项(Ps: 修改要保存生效)",
      properties: {
        showCode: {
          title: "是否展示复制文本",
          type: "boolean",
          format: "checkbox"
        },
        isNeedType: {
          title: "isNeedType-是否需要参数类型补充",
          type: "boolean",
          format: "checkbox"
        },
        isNeedSecondType: {
          title: "isNeedSecondType-嵌套对象拆分",
          type: "boolean",
          format: "checkbox"
        },
        isNeedAxiosType: {
          title: "isNeedAxiosType-是否需要Axios参数类型补充",
          type: "boolean",
          format: "checkbox"
        },
        axiosName: {
          title: "axiosName-请求的fetch 名称",
          type: "string"
        },
        dataParseName: {
          title: "dataParseName-从哪个参数开始解析类型",
          type: "string"
        },
        outputStyle: {
          type: "string",
          format: "radio",
          title: "文件导出类型，推荐具名导出",
          enum: ["nameExport", "anonymousExport", "defaultExport"]
        },
        basepath: {
          title: "basepath-服务名，如果服务端忘记配置该项，可以手动配置",
          type: "string"
        },
        customParams: {
          type: "array",
          title: "用户自定义额外参数，支持默认值",
          items: {
            type: "object",
            title: "额外自定义参数",
            properties: {
              name: {
                type: 'string',
                title: "额外参数的name"
              },
              default: {
                type: 'string',
                title: "额外参数的默认值，可以为空"
              }
            }
          }
        }
      }
    },
    startval: defaultConfig
  });

  editor.on('change', () => {
    const apiConfig = editor.getValue()
    chrome.storage.sync.set({ apiConfig })
  });
}

chrome.storage.sync.get(['apiConfig'], function ({ apiConfig }) {
  init(apiConfig ? apiConfig : undefined)
})

const submitButton = document.getElementById('submit')
submitButton.addEventListener('click', function () {
  const apiConfig = editor.getValue()
  chrome.storage.sync.set({ apiConfig }, async function () {
    submitButton.innerText = '保存成功，刷新当前页面使配置生效'
    reload()
  })
});
async function reload() {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => {
      location.reload()
    },
  });
}