/** 默认配置 */
const defaultConfig = {
  "isNeedType": false,
  "isNeedAxiosType": false,
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
  editor = new JSONEditor(document.getElementById('editor_config'), {
    disable_collapse: true,
    disable_properties: true,
    schema: {
      type: "object",
      title: "API 全局配置项",
      properties: {
        isNeedType: {
          title: "isNeedType-是否需要参数类型补充",
          type: "boolean",
        },
        isNeedAxiosType: {
          title: "isNeedAxiosType-是否需要Axios参数类型补充",
          type: "boolean",
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
          enum: ["nameExport", "defaultExport", "anonymousExport"]
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
}

chrome.storage.sync.get(['apiConfig'], function ({ apiConfig }) {
  console.log(apiConfig);
  if (apiConfig) init(apiConfig ? apiConfig : undefined)
})

const submitButton = document.getElementById('submit')
// Hook up the submit button to log to the console
submitButton.addEventListener('click', function () {
  // Get the value from the editor
  console.log(editor.getValue());
  const apiConfig = editor.getValue()
  chrome.storage.sync.set({ apiConfig }, async function () {
    submitButton.innerText = '保存成功，刷新当前页面使配置生效'
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        location.reload()
      },
    });
  })
});