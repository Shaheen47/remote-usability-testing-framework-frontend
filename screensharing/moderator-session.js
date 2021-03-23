
//screensharing
var screenSharingSessionId="dsasT23F"
var screenSharingHubUrl="https://localhost:5005/DomHub"
var mirror
var screenConnection




 function joinSession() {
    joinScreensharingSession()
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

    screenConnection.invoke("joinSession",screenSharingSessionId)


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
