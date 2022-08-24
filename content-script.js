const projectRegex = /\/interface\/api\/(\d+)/
const menuRegex = /\/project\/(\d+)\/interface\/api\/\d+$/

/** 插入按钮 */
function getCopyButton(id, text) {
    const button = document.createElement('button')
    button.innerText = text
    button.setAttribute("class", "ant-btn btn-filter ant-btn-primary")
    button.setAttribute("id", id)
    button.style.marginLeft = "10px"
    button.style.float = "right"
    return button
}

/** 入口库方法 */
function main() {
    if (document.getElementById("copyJs")) return
    const jsButton = getCopyButton('copyJs', "复制Js代码")
    const tsButton = getCopyButton('copyTs', '复制Ts代码')
    const titles = document.body.getElementsByClassName("interface-title")
    if (titles.length && projectRegex.test(location.href)) {
        const title = titles?.[0]
        title.appendChild(jsButton)
        title.appendChild(tsButton)
        buttonClickListen()
    }
}

/** 注册全局变量 */
const registerGlobal = () => {
    /** 默认配置 */
    const apiConfig = {
        "isNeedType": false,
        "isNeedAxiosType": false,
        "isNeedSecondType": false,
        "dataParseName": "",
        "outputStyle": "nameExport",
        "axiosName": "fetch"
    }
    const { host, protocol } = window.location
    window.global = { apiConfig: Object.assign({}, apiConfig, { host, protocol }) }
}

/** 获取服务名 */
const getServiceName = () => {
    const { href, host, protocol } = location
    const [, projectId] = menuRegex.exec(location.href)
    if (!projectId) return Promise.resolve('')
    return new Promise(async (resolve, reject) => {
        const serviceName = localStorage.getItem(`serviceName_${projectId}`)
        if (serviceName) resolve(serviceName)
        const res = await fetch(`${protocol}//${host}/api/project/get?id=${projectId}`)
        const { data, errcode } = await res.json()
        if (errcode || !data.basepath) reject('请求失败')
        localStorage.setItem(`serviceName_${projectId}`, data.basepath)
        resolve(data.basepath)
    })
}
/** 监听按钮点击 */
async function buttonClickListen() {
    registerGlobal()
    const src = chrome.runtime.getURL("aomi-yapi.js");
    const { JsApiItem, TsApiItem } = await import(src);
    const copyJsButton = document.getElementById("copyJs");
    const copyTsButton = document.getElementById("copyTs");
    const prefix = await getServiceName()
    copyJsButton.addEventListener('click', async () => {
        try {
            const data = await getApiItem()
            const JsItem = new JsApiItem(data, { prefix })
            const copyText = orangeCopyText(JsItem)
            console.log(copyText);
            await copyToClipboard(copyText)
            copyJsButton.innerText = '复制JS代码成功'
        } catch (error) {
            alert(String(error))
        }
    })
    copyTsButton.addEventListener('click', async () => {
        try {
            const data = await getApiItem()
            const TsItem = new TsApiItem(data, { prefix })
            const copyText = orangeCopyText(TsItem)
            console.log(copyText);
            await copyToClipboard(copyText)
            copyTsButton.innerText = '复制Ts代码成功'
        } catch (error) {
            alert(String(error))
        }
    })

}

/** 通用获取请求数据方法 */
function getApiItem() {
    return new Promise(async (resolve, reject) => {
        const { host, protocol, href } = window.location
        if (projectRegex.test(href)) {
            const [, apiId] = projectRegex.exec(href)
            const res = await fetch(`${protocol}//${host}/api/interface/get?id=${apiId}`)
            const { data, errcode } = await res.json()
            if (errcode) reject('请求失败')
            resolve(data)
        } else {
            reject('地址有误')
        }
    })
}

/** 获取api文本 */
function orangeCopyText(item) {
    let text = ''
    text += `${item.methodNote}\n${item.methodStr}`
    if (!global.apiConfig.isNeedType) return text
    item.paramsArr.map(item => {
        if (item.typeString) text += item.typeString
    })
    if (item.returnData.typeString) text += item.returnData.typeString
    return text
}



/** 复制文本到粘贴板 */
function copyToClipboard(textToCopy) {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(textToCopy)
    } else {
        const textArea = document.createElement('textarea')
        textArea.value = textToCopy
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        return new Promise((resolve, reject) => {
            document.execCommand('copy') ? resolve() : reject(new Error())
            textArea.remove()
        })
    }
}


setTimeout(() => {
    main()
}, 1000);

chrome.runtime.onMessage.addListener((request, sender, reply) => {
    if (request.message === 'urlChange') {
        main()
    }
});