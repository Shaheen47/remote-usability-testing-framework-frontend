
//screensharing
var screenSharingSessionId
var screenSharingHubUrl
var screenConnection


//videoconferencing
var participantConferenceToken
var OV;
var Videosession;


 function joinSession() {


    var xhr = new XMLHttpRequest();
    var url = "https://localhost:5001/Session/join-as-participant";
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 201) {
            var json = JSON.parse(xhr.responseText);
            console.debug(json)
            participantConferenceToken=json.participantConferenceToken
            screenSharingSessionId=json.screenSharingSessionId
            screenSharingHubUrl=json.screenSharingHubUrl
            //hide and show somethings
            joinConferenceSession()
            joinScreensharingSession()

        }
    };
    var data = JSON.stringify({"sessionId":document.getElementById("sessionIdInput").value});
    xhr.send(data);
}


// videoConferencing

function joinConferenceSession()
{
    OV = new OpenVidu();
    Videosession = OV.initSession();

    Videosession.on("streamCreated", function (event) {
        Videosession.subscribe(event.stream, "participanStream");
    });

    Videosession.connect(participantConferenceToken)
        .then(() => {
            var publisher = OV.initPublisher("ModeratorStream");
            Videosession.publish(publisher);
        })
        .catch(error => {
            console.log("There was an error connecting to the Videosession:", error.code, error.message);
        });
}



//Screensharing


async function joinScreensharingSession()
{

    //foin the session
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

    screenConnection.invoke("joinSessionAsPublisher",screenSharingSessionId)


    // page change listener
    iframeURLChange(document.getElementById("mirrorIFrame"), function (newURL) {
        console.log("URL changed:", newURL);
        reMirror()
    });


    // start screensharing
    startMirroring();
}


function startMirroring()
{

    iframe= document.getElementById("mirrorIFrame").contentWindow;

    //scroll listeners
    iframe.addEventListener('scroll',scrollMirror)

    //mouse listener
    iframe.addEventListener('mousemove',mouseMirror)

    iframe.addEventListener('mouseup',mouseUp)

    iframe.addEventListener('mousedown',mouseDown)



    // mirror

    mirrorClient = new TreeMirrorClient( iframe.document.documentElement, {
        initialize: function ( rootId, children) {
            let args=[rootId,children]
            let a=[{'f':'initialize'},{'args':args}]
            screenConnection.invoke("sendDom",screenSharingSessionId,JSON.stringify(a))
            /*                args: [rootId, children]*/
        },

        applyChanged: function (removed, addedOrMoved, attributes, text) {
            let args=[removed,addedOrMoved,attributes,text]
            let a=[{'f':'applyChanged'},{'args':args}]
            console.debug("attributes",attributes)
            console.debug("addedOrMoved",addedOrMoved)
            console.debug("text",text)
            screenConnection.invoke("sendDom",screenSharingSessionId,JSON.stringify(a))
            /*          args: [removed, addedOrMoved, attributes, text]*/
        }
    });
}

// should be called when page changes
function reMirror()
{

    //send clear command
    let c={'clear':'clear'}
    screenConnection.invoke("sendDom",screenSharingSessionId,JSON.stringify(c))

    //send the base of the page
    var base=location.href.match(/^(.*\/)[^\/]*$/)[1];
    let a={'base':base}
    screenConnection.invoke("sendDom",screenSharingSessionId,JSON.stringify(a))

    iframe.removeEventListener('mousemove',mouseMirror)
    iframe.removeEventListener('scroll',scrollMirror)
    setTimeout(startMirroring, 500);

}



// source : https://gist.github.com/hdodov/a87c097216718655ead6cf2969b0dcfa
function iframeURLChange(iframe, callback) {
    var lastDispatched = null;

    var dispatchChange = function () {
        var newHref = iframe.contentWindow.location.href;

        if (newHref !== lastDispatched) {
            callback(newHref);
            lastDispatched = newHref;
        }
    };

    var unloadHandler = function () {
        // Timeout needed because the URL changes immediately after
        // the `unload` event is dispatched.
        setTimeout(dispatchChange, 0);
    };

    function attachUnload() {
        // Remove the unloadHandler in case it was already attached.
        // Otherwise, there will be two handlers, which is unnecessary.
        iframe.contentWindow.removeEventListener("unload", unloadHandler);
        iframe.contentWindow.addEventListener("unload", unloadHandler);
    }

    iframe.addEventListener("load", function () {
        attachUnload();

        // Just in case the change wasn't dispatched during the unload event...
        dispatchChange();
    });

    attachUnload();
}



// screensharing callbacks

function mouseMirror(e)
{
    /*var posX = e.clientX;
    var posY = e.clientY;
    var posX2 = e.offsetX
    var posY2 = e.offsetY
    var posX3 = e.pageX
    var posY3= e.pageY
    screenConnection.invoke("sendMousePosition",screenSharingSessionId,posX3,posY3)*/
    var e = window.event;
    var posX = e.clientX;
    var posY = e.clientY;
    console.debug("mouse :",posX," ",posY)
    screenConnection.invoke("sendMousePosition",screenSharingSessionId,e.x,e.y)

}

function scrollMirror(e)
{
    let el=iframe.document.documentElement
    console.debug(el.scrollTop," ",el.scrollLeft)
    screenConnection.invoke("sendScroll",screenSharingSessionId,el.scrollTop)
}

function mouseUp()
{
    console.debug("mouse up")
    screenConnection.invoke("mouseUp",screenSharingSessionId)
}

function mouseDown()
{
    console.debug("mouse down")
    screenConnection.invoke("mouseDown",screenSharingSessionId)
}

// closing





function leaveVideoSession() {
    Videosession.disconnect();
}

window.onbeforeunload = function () {
    if (Videosession) Videosession.disconnect()
};


