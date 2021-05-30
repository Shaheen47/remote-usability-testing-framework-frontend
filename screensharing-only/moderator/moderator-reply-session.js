
// server
var urlBase="https://localhost:5005"
//screensharing
var screenSharingSessionId
var screenSharingHubUrl=urlBase+"/ScreenMirroringHub"
var screenSharingReplyControllingHubUrl=urlBase+"/ScreenMirroringReplyControllingHub"

var screenConnection
var screenReplyControllingConnection
var mirror

//video
var videoRecordingUrl="1.mp4"


let styler
let stylerInitialized=false


 function prepareSessionReply()
{
    screenSharingSessionId=document.getElementById("sessionIdInput").value
    joinScreensharingSession();
    prepearVideo()
    prepearScreenMirroringControlling()
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
         console.log("screen mirroring controll Connected.");
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



    createNewMirror();


    screenConnection.on("sentDom", (dom) => {
        var msg = JSON.parse(dom);
        handleScreensharingMessage(msg);
    });

    // mouse events

    screenConnection.on("sentMousePosition", (x,y) => {
        document.getElementById("mousePointer").style.left = x + 'px';
        document.getElementById("mousePointer").style.top = y + 'px';

    })

    screenConnection.on("mouseUp",()=> {
        document.getElementById("mousePointer").src="../mouse-icons/011-mouse-1.svg";
    })

    screenConnection.on("mouseDown",()=> {
        document.getElementById("mousePointer").src="../mouse-icons/048-click.svg";
    })



    screenConnection.on("mouseOver",(elementXpath)=> {
        var node=iframe.document.evaluate('/html/body/div'+elementXpath,iframe.document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        var x=node.singleNodeValue
        if (stylerInitialized===false)
        {
            styler.loadDocumentStyles();
            stylerInitialized=true
        }
        styler.toggleStyle(x, ':hover');
    })

    screenConnection.on("mouseOut",(elementXpath)=> {
        var node=iframe.document.evaluate('/html/body/div'+elementXpath,iframe.document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        var x=node.singleNodeValue
        styler.toggleStyle(x, ':hover');

    })

    // inputs
    screenConnection.on("inputChanged",(elementXpath,inputContent)=> {
        var node = iframe.document.evaluate('/html/body/div' + elementXpath, iframe.document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        if (stylerInitialized===false)
        {
            styler.loadDocumentStyles();
            stylerInitialized=true
        }
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
    // scrolling

    screenConnection.on("sentScroll", (vertical) => {
        let el=document.getElementById("mirrorIFrame").contentWindow.document.getElementById("mirror")
        // To set the scroll
        el.scrollTop = vertical;
    })


}

function createNewMirror()
{
    var myFrameDoc = document.getElementById('mirrorIFrame').contentDocument;
    /* myFrameDoc.write('<html>');
     myFrameDoc.write('<head>');
     myFrameDoc.write('</head>');
     myFrameDoc.write('<body>');*/
    myFrameDoc.write('<div id="mirror" style="top: 0px;left: 0px; width:100%; height:100%;overflow: scroll ; position: relative"></div>');
    /*    myFrameDoc.write('</body>');
        myFrameDoc.write('</html>');*/

    let m=document.getElementById("mirrorIFrame").contentWindow.document.getElementById("mirror")
    /* mirror = new TreeMirror(document.getElementById("mirror"), {*/
    mirror = new TreeMirror(m);

}


function clearScreensharingPage() {
    let m=document.getElementById("mirrorIFrame").contentWindow.document.getElementById("mirror")
    while (m.firstChild) {
        m.removeChild(m.firstChild);
    }
}

async function handleScreensharingMessage(msg) {
    if (msg.clear) {
        clearScreensharingPage();
        createNewMirror();

    } else if (msg.base) {
        var myFrameDoc = document.getElementById('mirrorIFrame').contentDocument;
        var bt = myFrameDoc.createElement("base");
        bt.href = msg.base
        /*        bt.setAttribute(msg.base)*/
        myFrameDoc.getElementsByTagName("head")[0].appendChild(bt);
    } else {

        /* mirror['initialize'].apply(mirror, msg[1].args);*/
        await mirror[msg[0].f].apply(mirror, msg[1].args);
        /*if (msg[0].f === "initialize")
            await styler.loadDocumentStyles();*/
    }
}



//////////////// reply

