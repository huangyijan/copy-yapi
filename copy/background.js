chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (tab.status === 'complete' && changeInfo.status) {
    chrome.tabs.sendMessage(tabId, {
      message: { type: 'urlChange' },
    })
  }
  return true
});
