
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

function joinScreensharingSession()
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

    iframe= document.getElementById("mirrorIFrame").contentWindow;
    document.getElementById("mirrorIFrame").contentWindow.document.documentElement.addEventListener('mousemove',function (e)
    {
        var e = window.event;
        var posX = e.clientX;
        var posY = e.clientY;
        console.debug("mouse :",posX," ",posY)
        screenConnection.invoke("sendMousePosition","participant",screenSharingSessionId,e.x,e.y)
    })
    document.getElementById("mirrorIFrame").contentWindow.addEventListener('scroll',function (e)
    {
        let el=document.getElementById("mirrorIFrame").contentWindow.document.documentElement
        console.debug(el.scrollTop," ",el.scrollLeft)
        screenConnection.invoke("sendScroll","participant",screenSharingSessionId,el.scrollTop)
    })

    screenConnection.invoke("joinSession",screenSharingSessionId)

    startMirroring();
}


function startMirroring()
{
    mirrorClient = new TreeMirrorClient( document.getElementById("mirrorIFrame").contentWindow.document.documentElement, {
        initialize: function ( rootId, children) {
            let args=[rootId,children]
            let a=[{'f':'initialize'},{'args':args}]
            screenConnection.invoke("sendDom","participant",screenSharingSessionId,JSON.stringify(a))
            /*                args: [rootId, children]*/
        },

        applyChanged: function (removed, addedOrMoved, attributes, text) {
            let args=[removed,addedOrMoved,attributes,text]
            let a=[{'f':'applyChanged'},{'args':args}]
            console.debug("attributes",attributes)
            console.debug("addedOrMoved",addedOrMoved)
            console.debug("text",text)
            screenConnection.invoke("sendDom","participant",screenSharingSessionId,JSON.stringify(a))
            /*          args: [removed, addedOrMoved, attributes, text]*/
        }
    });
}


function reMirror()
{
    
    //send clear command
    let c={'clear':'clear'}
    screenConnection.invoke("sendDom","participant",screenSharingSessionId,JSON.stringify(c))
    
    //send the base of the page
    var base=location.href.match(/^(.*\/)[^\/]*$/)[1];
    let a={'base':base}
    screenConnection.invoke("sendDom","participant",screenSharingSessionId,JSON.stringify(a))
    
    mirrorClient = new TreeMirrorClient( document.getElementById("mirrorIFrame").contentWindow.document.documentElement, {
        initialize: function ( rootId, children) {
            let args=[rootId,children]
            let a=[{'f':'initialize'},{'args':args}]
            screenConnection.invoke("sendDom","participant",screenSharingSessionId,JSON.stringify(a))
            /*                args: [rootId, children]*/
        },

        applyChanged: function (removed, addedOrMoved, attributes, text) {
            let args=[removed,addedOrMoved,attributes,text]
            let a=[{'f':'applyChanged'},{'args':args}]
            console.debug("attributes",attributes)
            console.debug("addedOrMoved",addedOrMoved)
            console.debug("text",text)
            screenConnection.invoke("sendDom","participant",screenSharingSessionId,JSON.stringify(a))
            /*          args: [removed, addedOrMoved, attributes, text]*/
        }
    });
}













function leaveVideoSession() {
    Videosession.disconnect();
}

window.onbeforeunload = function () {
    if (Videosession) Videosession.disconnect()
};