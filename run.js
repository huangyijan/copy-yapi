
var myNotification = function () {
  new Notification('你有一个新的通知呀', {
    body: '你有未读的新邮件', // 設定內容
  }); // 建立通知
}

var systemNotification = function () {
  if (Notification.permission === 'default' || Notification.permission === 'undefined') {
    Notification.requestPermission(function (permission) {
      // permission 可為「granted」（同意）、「denied」（拒絕）和「default」（未授權）
      // 在這裡可針對使用者的授權做處理

      console.log(permission)
      if (permission === 'granted') {
        // 使用者同意授權
        myNotification()

      }
    });
  } else {
    myNotification()
    console.log('已经有通知权限了')
  }

}

const sendData = {
  "appToken": "AT_ULAHhkpFz2qNxbSI5RFnE8B3PY3Cu0oz",
  "content": "hello daisy!you have a new mail in you mail web",
  "summary": "你有新邮件呀，快去看啦",//消息摘要，显示在微信聊天页面或者模版消息卡片上，限制长度100，可以不传，不传默认截取content前面的内容。
  "contentType": 1,//内容类型 1表示文字  2表示html(只发送body标签内部的数据即可，不包括body标签) 3表示markdown 
  "uids": [//发送目标的UID，是一个数组。注意uids和topicIds可以同时填写，也可以只填写一个。
    "UID_otkU4j6hA8qJCOxbRvpVoyMKQAJh"
  ],
  "url": "http://116.196.125.108/webmail/index.php?action=framesetsV2" //原文链接，可选参数
}

const setWxRequest = function () {
  var xhr = new XMLHttpRequest();   // new HttpRequest instance 
  var theUrl = "http://wxpusher.zjiecode.com/api/send/message";
  xhr.open("POST", theUrl);
  xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  xhr.send(JSON.stringify(sendData));

  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      location.reload()
    }
  }
 }

var main = () => {
  try {
    const unreadDom = document.getElementById("u_mail")
    if(!unreadDom) return 
    console.log('dom', unreadDom)
    const unReadCount = unreadDom.innerHTML
    console.log(unReadCount)
    if (/\d+/.test(unReadCount) || +unReadCount) setWxRequest()
  } catch (error) {
    console.log('error', error);
  }
  console.log('结束了，毁灭吧')
 
}

var timClock = null

var run = (updateTime = 1800000) => {
  clearTimeout(timClock)
  timClock = setTimeout(() => {
    main()
    // location.reload()
    console.log('运行中', new Date());
    location.reload()
  }, updateTime)
}



  

  run()