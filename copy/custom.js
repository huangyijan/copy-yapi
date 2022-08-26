(function (window) {
    let editor = undefined
    let id = "codeEditorId" // 编辑器Id
    let editButtonId = "editButtonId" // 编辑器按钮
    /** 插入代码编辑器 */
    function getAceEditor(code = '请点击上方复制按钮获取代码') {
        const editorDom = document.getElementById(id)
        if (editorDom) {
            editorDom.style.display = 'block'
            editor.setValue(code)
            return
        }

        const aceEditor = document.createElement('div')
        aceEditor.style.width = '100%'
        aceEditor.setAttribute("id", id)
        const info = document.querySelector(".panel-view")
        const childDom = document.querySelector('.ant-row')
        info.insertBefore(aceEditor, childDom)
        editor = ace.edit(id)
        editor.setOptions({
            maxLines: Infinity
        })
        editor.setValue(code)
    }


    function insertButton() {
        const editButtonDom = document.createElement('button')
        editButtonDom.setAttribute('id', editButtonId)
        editButtonDom.setAttribute("class", "ant-btn btn-filter ant-btn-primary ant-btn-sm")
        editButtonDom.innerText = '编辑代码'
        editButtonDom.style.position = "absolute"
        editButtonDom.style.top = "30px"
        editButtonDom.style.right = "50px"
        editButtonDom.style.display = "none"
        const info = document.querySelector(".panel-view")
        info.style.position = 'relative'
        const childDom = document.querySelector('.ant-row')
        info.insertBefore(editButtonDom, childDom)
        editButtonDom.addEventListener('click', editCode)
    }


    function editCode() {
        const editButtonDom = document.getElementById(editButtonId)
        const showWrap = document.getElementById("showWrap")
        const code = document.getElementById('codeWrap').innerText
        editButtonDom.style.display = 'none'
        showWrap.style.display = 'none'
        getAceEditor(code)
    }

    insertButton()
})(window)