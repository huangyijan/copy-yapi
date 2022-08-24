
let TabId = null
let time = 0

/** 获取通用请求头 */
const getHeader = (token, userId) => {
  const HeaderConfig = {
    Cookie: `_yapi_token=${token}; _yapi_uid=${userId}`,
    Accept: 'application/json, text/plain, */*'
  }
  return HeaderConfig
}

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (tab.status === 'complete' && changeInfo.status) {
    chrome.tabs.sendMessage(tabId, {
      message: 'urlChange',
      url: changeInfo.url
    })
  }
});

chrome.runtime.onMessage.addListener((request, sender, reply) => {
  const { type, href } = request.message
  console.log(request);
  Promise.all([chrome.cookies.get({ name: "_yapi_uid", url: href }), chrome.cookies.get({ name: "_yapi_token", url: href })])
    .then(([yapiUId, yapiToken]) => {
      reply(getHeader(yapiUId.value, yapiToken.value));
    })
  return true
});