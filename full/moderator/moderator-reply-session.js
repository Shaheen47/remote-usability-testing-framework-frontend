
//screensharing
var screenSharingSessionId
var screenSharingHubUrl
var screenSharingReplyControllingHubUrl

var screenConnection
var screenReplyControllingConnection
var mirror

//video
var videoRecordingUrl

// server
var urlBase="https://localhost:5001/"


let styler


window.addEventListener("load", f);

function f()
{
    var queryString = window.location.search;
    var urlParams = new URLSearchParams(queryString);
    var sessionId = urlParams.get('sessionId');
    document.getElementById("sessionIdInput").value=sessionId;

}


 function prepareSessionReply()
{
    getSessionInfo()
    getChatMessage();
    joinScreensharingSession();
    prepearVideo()
    prepearScreenMirroringControlling()
}

 function getSessionInfo() {

    var url =urlBase+"Session/"+document.getElementById("sessionIdInput").value;
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

 async function  prepearScreenMirroringControlling() {

     // screenmirroring controlling
     screenReplyControllingConnection = new signalR.HubConnectionBuilder()
         .withUrl(screenSharingReplyControllingHubUrl)
         .withAutomaticReconnect()
         .configureLogging(signalR.LogLevel.Debug)
         .build();

     screenReplyControllingConnection.on("test", (x) => {
         console.debug(x);


     })
     try {
         await screenReplyControllingConnection.start();
         console.log("screen mirroring control connected.");
     } catch (err) {
         console.log(err);
     }
     screenReplyControllingConnection.invoke("startReply",screenSharingSessionId)


    /// video event listners for sync with screen mirroring
    var video = document.getElementById('videoId');

    video.addEventListener('playing', async function () {
        console.log('Video is playing ,position.' + video.currentTime);
        try {
            await screenReplyControllingConnection.invoke("continueReply", screenSharingSessionId)
        } catch (err) {
            console.error(err);
        }
    });
     video.addEventListener('pause', async function () {
         console.log('Video is paused ,position.' + video.currentTime);
         try {
             await screenReplyControllingConnection.invoke("pauseReply", screenSharingSessionId)
         } catch (err) {
             console.error(err);
         }
     });

        video.addEventListener('seeked', function() {
            console.log('Video is seeking a new position:'+Math.floor( video.currentTime*1000 ));
            screenReplyControllingConnection.invoke("seekReply",screenSharingSessionId, Math.floor( video.currentTime*1000 ))
        })

    /*    video.addEventListener('ended', function() {
            console.log('Video is ended,position.'+video.currentTime);
            screenReplyControllingConnection.invoke("stopReply",screenSharingSessionId)
        })*/

}

// chat
function getChatMessage()
{
    var url =urlBase+"Chat/"+document.getElementById("sessionIdInput").value;
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

    var iframe=document.getElementById("mirrorIFrame").contentWindow


    screenConnection.invoke("joinSessionAsSubscriber",screenSharingSessionId)

    styler = new PseudoStyler(iframe.document);




    // DOM change events


    screenConnection.on("domInitialization", (msg,baseUrl) => {
        createNewMirror(baseUrl);
        var initialDom = JSON.parse(msg);
        mirror['initialize'].apply(mirror,initialDom);
        styler.loadDocumentStyles();
    });

    screenConnection.on("domChanges", (msg) => {
        var domChanges = JSON.parse(msg);
        mirror['applyChanged'].apply(mirror,domChanges);
        if(domChanges[1].length>0)
            styler.loadDocumentStyles();
    });

    screenConnection.on("clearDom", () => {
        clearScreensharingPage();
    });

    // mouse


    screenConnection.on("mouseUp",()=> {
        document.getElementById("mousePointer").src="../mouse-icons/011-mouse-1.svg";
    })

    screenConnection.on("mouseDown",()=> {
        document.getElementById("mousePointer").src="../mouse-icons/048-click.svg";
    })

    // scrolling


    // inputs
    screenConnection.on("inputChanged",(elementXpath,inputContent)=> {
        var node = iframe.document.evaluate('/html/body/div' + elementXpath, iframe.document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        var x = node.singleNodeValue
        if(x.type==='checkbox')
        {
            if(inputContent==="true")
                x.checked=true
            else
                x.checked=false
        }
        else if(x.type==='radio')
            x.checked = inputContent
        else if(x.type==='select-one')
            x.selectedIndex = inputContent
        else
            x.value = inputContent
        console.info("inputChanged: ",inputContent," , ",elementXpath)
    })

    screenConnection.on("mouseOver",(elementXpath)=> {
        console.debug('mouseover begin')
        var node=iframe.document.evaluate('/html/body/div'+elementXpath,iframe.document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        var x=node.singleNodeValue
        styler.toggleStyle(x, ':hover');
        document.getElementById("mousePointer").style.left = (x.getBoundingClientRect().left+x.getBoundingClientRect().right)/2 +'px';
        document.getElementById("mousePointer").style.top = (x.getBoundingClientRect().top+x.getBoundingClientRect().bottom)/2+'px';
        x.scrollIntoView();
    })

    screenConnection.on("mouseOut",(elementXpath)=> {
        console.debug('mouseOut begin')
        var node=iframe.document.evaluate('/html/body/div'+elementXpath,iframe.document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        var x=node.singleNodeValue
        styler.toggleStyle(x, ':hover');
    })


}

function createNewMirror(baseUrl)
{
    var myFrameDoc = document.getElementById('mirrorIFrame').contentDocument;
    myFrameDoc.write('<div id="mirror" style="top: 0;left: 0; width:100%; height:100%;overflow: scroll ; position: relative">' +
        '</div>');

    let m=document.getElementById("mirrorIFrame").contentWindow.document.getElementById("mirror")
    mirror = new TreeMirror(m, {
        createElement: function(tagName) {
            if (tagName == 'SCRIPT') {
                var node = document.createElement('NO-SCRIPT');
                node.style.display = 'none';
                return node;
            }

            if (tagName == 'HEAD') {
                var node = document.createElement('HEAD');
                node.appendChild(document.createElement('BASE'));
                node.firstChild.href = baseUrl;
                return node;
            }
        }
    });

}

function clearScreensharingPage() {
    let m=document.getElementById("mirrorIFrame").contentWindow.document.getElementById("mirror")
    m.parentNode.removeChild(m);
}




//////////////// reply

