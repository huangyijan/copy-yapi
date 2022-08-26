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
    if (projectRegex.test(location.href)) {
        const jsButton = getCopyButton('copyJs', "复制Js代码")
        const tsButton = getCopyButton('copyTs', '复制Ts代码')
        const tsRequestButton = getCopyButton('copyTsRequest', '复制Ts请求声明')
        const tsResponseButton = getCopyButton('copyTsResponse', '复制Ts回调声明')
        const titles = document.body.getElementsByClassName("interface-title")
        if (titles.length) {
            const title = titles?.[0]
            title.appendChild(jsButton)
            title.appendChild(tsButton)
            title.appendChild(tsRequestButton)
            title.appendChild(tsResponseButton)
            buttonClickListen()
            insertCustomScript()
        } else {
            setTimeout(() => {
                main()
            }, 1000);
        }
    }
}

function insertCustomScript() {
    var s = document.createElement('script')
    s.src = chrome.runtime.getURL("copy/custom.js")
    document.head.appendChild(s)
    s.onload = function () {
        s.remove()
    }
}

/** 注册全局变量 */
const registerGlobal = () => {

    /** 默认配置 */
    const defaultConfig = {
        "showCode": true,
        "isNeedType": false,
        "isNeedAxiosType": false,
        "dataParseName": "detailMsg",
        "outputStyle": "nameExport",
        "axiosName": "fetch",
        "basepath": "",
        "customParams": []
    }
    chrome.storage.sync.get(['apiConfig'], function ({ apiConfig }) {
        const { host, protocol } = window.location
        Object.assign(defaultConfig, apiConfig, { host, protocol })
        window.global = { apiConfig: defaultConfig }
    })

}

/** 获取服务名 */
const getServiceName = () => {
    const { href, host, protocol } = location
    const [, projectId] = menuRegex.exec(href)
    if (!projectId) return Promise.resolve('')
    if (global.apiConfig.basepath) return Promise.resolve(global.apiConfig.basepath)
    return new Promise(async (resolve) => {
        const serviceName = localStorage.getItem(`serviceName_${projectId}`)
        if (serviceName) resolve(serviceName)
        const res = await fetch(`${protocol}//${host}/api/project/get?id=${projectId}`)
        const { data, errcode } = await res.json()
        if (errcode || !data.basepath) resolve("")
        localStorage.setItem(`serviceName_${projectId}`, data.basepath)
        resolve(data.basepath)
    })
}
/** 监听按钮点击 */
async function buttonClickListen() {
    registerGlobal()
    const src = chrome.runtime.getURL("copy/yapi.js");
    const { JsApiItem, TsApiItem } = await import(src);
    const copyJsButton = document.getElementById("copyJs");
    const copyTsButton = document.getElementById("copyTs");
    const copyTsRequestButton = document.getElementById("copyTsRequest");
    const copyTsResponseButton = document.getElementById("copyTsResponse");
    const prefix = await getServiceName()
    copyJsButton.addEventListener('click', async () => {
        try {
            const data = await getApiItem()
            const JsItem = new JsApiItem(data, { prefix })
            const copyText = await orangeCopyText(JsItem)
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
            const copyText = await orangeCopyText(TsItem)
            await copyToClipboard(copyText)
            copyTsButton.innerText = '复制Ts代码成功'
        } catch (error) {
            alert(String(error))
        }
    })
    copyTsRequestButton.addEventListener('click', async () => {
        try {
            const data = await getApiItem()
            const TsItem = new TsApiItem(data, { prefix })
            let text = ''
            TsItem.paramsArr.map(item => {
                if (item.typeString) text += `${item.typeString}\n`
            })
            const copyText = await format(text)
            await copyToClipboard(copyText)
            copyTsRequestButton.innerText = '复制请求成功'
        } catch (error) {
            alert(String(error))
        }
    })
    copyTsResponseButton.addEventListener('click', async () => {
        try {
            const data = await getApiItem()
            const TsItem = new TsApiItem(data, { prefix })
            if (TsItem.returnData.typeString) {
                const copyText = await format(TsItem.returnData.typeString)
                await copyToClipboard(copyText)
                copyTsResponseButton.innerText = '复制回调成功'
            } else {
                copyTsResponseButton.innerText = '请求返回无法解析'
            }
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
async function orangeCopyText(item) {
    let text = ''
    text += `${item.methodNote}\n${item.methodStr}\n`
    if (!global.apiConfig.isNeedType) return text
    item.paramsArr.map(item => {
        if (item.typeString) text += `${item.typeString}\n`
    })
    if (item.returnData.typeString) text += item.returnData.typeString
    return format(text)
}

/** 格式化代码 */
async function format(text) {
    const src = chrome.runtime.getURL("copy/prettier.mjs");
    const TsSrc = chrome.runtime.getURL("copy/ts.mjs");
    const prettier = await import(src)
    const TsPlugin = await import(TsSrc)
    return prettier.default.format(text, {
        parser: 'typescript',
        plugins: TsPlugin,
        semi: false,
        printWidth: 150,
        tabWidth: 4
    })
}


/** 复制文本到粘贴板 */
function copyToClipboard(textToCopy) {
    if (global.apiConfig.showCode) showCode(textToCopy)
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

function showCode(code = '') {

    const editCodeDom = document.querySelector('#codeEditorId')
    if (editCodeDom) editCodeDom.style.display = 'none'

    const editButtonDom = document.querySelector("#editButtonId")
    if (editButtonDom) editButtonDom.style.display = 'block'

    const codeIdDom = document.querySelector('#codeWrap')
    const showWrapDom = document.querySelector('#showWrap')
    if (codeIdDom) {
        showWrapDom.style.display = 'block'
        return codeIdDom.innerText = code
    }

    const padDom = document.querySelector('.panel-view')
    const childDom = document.querySelector('.ant-row')
    const codeWrap = document.createElement('div')
    const preDom = document.createElement('pre')
    const codeDom = document.createElement('code')
    codeWrap.setAttribute('class', 'tui-editor-contents')
    codeWrap.setAttribute('id', 'showWrap')
    codeWrap.setAttribute('style', 'margin: 0px; padding: 0px 20px; float: none;')
    codeDom.setAttribute('id', 'codeWrap')
    codeDom.innerText = code
    preDom.appendChild(codeDom)
    codeWrap.appendChild(preDom)
    padDom.insertBefore(codeWrap, childDom)
}



document.onreadystatechange = () => {
    if (document.readyState === 'complete') {
        main()
    }
}


chrome.runtime.onMessage.addListener((request) => {
    if (request.message === 'urlChange') {
        main()
    }
});