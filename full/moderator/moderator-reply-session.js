
//screensharing

//screensharing
var screenSharingSessionId
var screenSharingHubUrl
var screenSharingReplyControllingHubUrl

var screenConnection
var screenReplyControllingConnection
var mirror

//video
var videoRecordingUrl

//chat

 function prepareSessionReply()
{
    getSessionInfo()
    getChatMessage();
    joinScreensharingSession();
    prepearVideo()
}

 function getSessionInfo() {

    var url = "https://localhost:5001/Session/"+document.getElementById("sessionIdInput").value;
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState == XMLHttpRequest.DONE) {
            var json = JSON.parse(xhr.responseText);
            console.debug(json)
            screenSharingSessionId=json.screenSharingSessionId;
            screenSharingHubUrl=json.screenSharingReplyHubUrl;
            videoRecordingUrl=json.videoRecordingUrl;
            screenSharingReplyControllingHubUrl=json.screenSharingReplyControllingHubUrl;

        }
    }
    xhr.open('GET', url, false);
    xhr.send(null);


}

function replySession() {

    replyScreenMirrorSession();
    //start video
    var video = document.getElementById('videoId');
    video.play()
}


// chat

function getChatMessage()
{
    var url = "https://localhost:5001/Chat/"+document.getElementById("sessionIdInput").value;
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState == XMLHttpRequest.DONE) {
            var chat = JSON.parse(xhr.responseText);
            chat.forEach(function(message) {
                var messageList=document.getElementById("chatList");
                let li = document.createElement('li');
                li.textContent = message.timestamp+":"+message.sender+" : "+message.message;
                messageList.appendChild(li);
            });

        }
    }
    xhr.open('GET', url, true);
    xhr.send(null);
}


// video
function  prepearVideo()
{
    var video = document.getElementById('videoId');
    var source = document.createElement('source');
    source.setAttribute('src', videoRecordingUrl);
    video.appendChild(source);
}

// screensharing

async function joinScreensharingSession()
{
    screenConnection = new signalR.HubConnectionBuilder()
        .withUrl(screenSharingHubUrl)
        .configureLogging(signalR.LogLevel.Information)
        .build();

    try {
        await screenConnection.start();
        console.log("screensharing Connected.");
    } catch (err) {
        console.log(err);
        setTimeout(5000);
    }

    screenConnection.invoke("joinSessionAsSubscriber",screenSharingSessionId)


    createNewMirror();


    screenConnection.on("sentDom", (dom) => {
        var msg = JSON.parse(dom);
        console.debug("here we go2",msg)
        /*if (msg instanceof Array) {
            console.debug("here we go3",JSON.parse(subMessage))
            msg.forEach(function(subMessage) {
                console.debug("here we go3",JSON.parse(subMessage))
                handleMessage(JSON.parse(subMessage));
            });
        } else {*/
        handleScreensharingMessage(msg);
        /*        }*/
    });

    // mouse movement

    screenConnection.on("sentMousePosition", (x,y) => {
        document.getElementById("mousePointer").style.left = x + 'px';
        document.getElementById("mousePointer").style.top = y + 'px';


    })

    // scrolling



    screenConnection.on("sentScroll", (vertical) => {
        console.debug(vertical)
        let el=document.getElementById("mirrorIFrame").contentWindow.document.getElementById("mirror")
        // To set the scroll
        el.scrollTop = vertical;
    })



    // screenmirroring controlling
    screenReplyControllingConnection = new signalR.HubConnectionBuilder()
        .withUrl(screenSharingReplyControllingHubUrl)
        .configureLogging(signalR.LogLevel.Information)
        .build();

    try {
        await screenReplyControllingConnection.start();
        console.log("screen reply Controlling Connected.");
    } catch (err) {
        console.log(err);
        setTimeout(5000);
    }


}

function createNewMirror()
{
    var base;
    var myFrameDoc = document.getElementById('mirrorIFrame').contentDocument;
    myFrameDoc.write('<html>');
    myFrameDoc.write('<head>');
    myFrameDoc.write('</head>');
    myFrameDoc.write('<body>');
    myFrameDoc.write('<div id="mirror" style="top: 0px;left: 0px; width:100%; height:100%;overflow: scroll ; position: relative"></div>');
    myFrameDoc.write('</body>');
    myFrameDoc.write('</html>');

    let m=document.getElementById("mirrorIFrame").contentWindow.document.getElementById("mirror")
    /* mirror = new TreeMirror(document.getElementById("mirror"), {*/
    mirror = new TreeMirror(m, {
        createElement: function (tagName) {
            if (tagName == 'SCRIPT') {
                var node = document.createElement('NO-SCRIPT');
                node.style.display = 'none';
                return node;
            }

            if (tagName == 'HEAD') {
                var node = document.createElement('HEAD');
                node.appendChild(document.createElement('BASE'));
                node.firstChild.href = base;
                return node;
            }
        }
    });

}

function clearScreensharingPage() {
    let m=document.getElementById("mirrorIFrame").contentWindow.document.getElementById("mirror")
    while (m.firstChild) {
        m.removeChild(m.firstChild);
    }
}

function handleScreensharingMessage(msg) {
    if (msg.clear) {
        clearScreensharingPage();
        createNewMirror();
    }
    else if (msg.base)
        base = msg.base;
    else
        /* mirror['initialize'].apply(mirror, msg[1].args);*/
        mirror[msg[0].f].apply(mirror, msg[1].args);
    console.debug("mirror[msg[0].f].apply(mirror, msg[1].args) called")
}



//////////////// reply

function replyScreenMirrorSession() {
    var xhr = new XMLHttpRequest();
    var url = "https://localhost:5001/Session/reply-screensharing";
    xhr.open("POST", url, false);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            console.debug(json)
            //hide and show somethings
        } else {
            if (xhr.readyState === 4 && xhr.status === 400) {
                console.debug(xhr.responseText)
            }
        }
    };
    var data = JSON.stringify({"sessionId": document.getElementById("sessionIdInput").value});
    xhr.send(data);
}



/// video event listners for sync with screen mirroring

var video=document.getElementById('videoId');




video.addEventListener('play', function() {
    console.log('Video is at a new position.'+video.currentTime);
    screenReplyControllingConnection.invoke("continueReply",screenSharingSessionId)
})

video.addEventListener('pause', function() {
    console.log('Video is at a new position.'+video.currentTime);
    screenReplyControllingConnection.invoke("pauseReply",screenSharingSessionId)
})

video.addEventListener('seeking', function() {
    console.log('Video is at a new position.'+video.currentTime);
    screenReplyControllingConnection.invoke("seekReply",screenSharingSessionId,video.currentTime)
})

video.addEventListener('ended', function() {
    console.log('Video is at a new position.'+video.currentTime);
    screenReplyControllingConnection.invoke("stopReply",screenSharingSessionId)
})