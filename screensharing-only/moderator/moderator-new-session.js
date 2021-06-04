
//screensharing
var screenSharingSessionId
var screenSharingHubUrl
var mirror
var screenConnection


// server
var urlBase="https://localhost:5005/"
var urlWithoutRec=urlBase+"Session/create-session";
var urlWithRec=urlBase+"Session/create-session-with-recording";

//
let styler
let stylerInitialized=false

function createSession()
{

    var url;
    if(document.getElementById("recordCheckBox").checked===true)
        url=urlWithRec
    else
        url=urlWithoutRec
    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 201) {
            var json = JSON.parse(xhr.responseText);
            document.getElementById("sessionIdInput").value=json.sessionId;
            screenSharingSessionId=json.sessionId
            screenSharingHubUrl=json.hubUrl
        }
    };
    var data
    data=JSON.stringify("{}")
    xhr.send(data);
}


function joinSession() {
            styler = new PseudoStyler(document.getElementById("mirrorIFrame").contentWindow.document);
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



/////////////////// closing


function stopSession()
{
    var xhr = new XMLHttpRequest();
    var url = urlBase+"Session/"+document.getElementById("sessionIdInput").value;
    xhr.open("DELETE", url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 204) {
            var json = JSON.parse(xhr.responseText);
            //hide and show somethings
            screenConnection.close()
        }
        else
        {
            if(xhr.readyState === 4 && xhr.status === 400)
            {
                console.debug(xhr.responseText)
            }
        }
    };
    var data = "{}"
    xhr.send(data);
}




// new for mouse events