
//screensharing
var screenSharingSessionId
var screenSharingHubUrl
var screenConnection


//videoconferencing
var participantConferenceToken
var OV;
var Videosession;

//sever
var urlBase="https://localhost:5001/"

var iframe;

function toggleVideoConference()
{
    var mirror=document.getElementById("mirror");
    // mirror.style.height = dh + '%';
    if(mirror.style.width==70 + '%')
        mirror.style.width = 95 + '%';
    else
        mirror.style.width = 70 + '%';
    var videoConference=document.getElementById("videoConference");
    if (videoConference.style.display === "none") {
        videoConference.style.display = "block";
    } else {
        videoConference.style.display = "none";
    }
    var button=document.getElementById("toggleVideoConferenceButton");
    if(button.innerText=='hide video conference')
        button.innerText='show video conference';
    else
        button.innerText='hide video conference';
}

 function joinSession() {

    // var websiteUrl=document.getElementById('websiteUrl').value
    //  var w=
     document.getElementById('mirrorIFrame').setAttribute("src",window.location.hostname);

    var xhr = new XMLHttpRequest();
    var url =urlBase+"Session/join-as-participant";
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

    // joining the session
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

    screenConnection.on("leaveSession", () => {
        screenConnection.connection.stop()
    })


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

    //send iframe  base
    // sendIframeBaseUrl();

    iframe.addEventListener('mouseup',mouseUp)

    iframe.addEventListener('mousedown',mouseDown)

    iframe.addEventListener('mouseover',mouseOver)

    iframe.addEventListener('mouseout',mouseOut)

    iframe.addEventListener('input',inputChanged)
    iframe.addEventListener('paste',inputChanged)


    // mirror

    mirrorClient = new TreeMirrorClient( iframe.document.documentElement, {
        initialize: function ( rootId, children) {
            var baseUrl=iframe.location.href.match(/^(.*\/)[^\/]*$/)[1];
            let args=[rootId,children]
            screenConnection.invoke("sendDomInitialization",screenSharingSessionId,JSON.stringify(args),baseUrl)
        },

        applyChanged: function (removed, addedOrMoved, attributes, text) {
            let args=[removed,addedOrMoved,attributes,text]
            screenConnection.invoke("sendDomChanges",screenSharingSessionId,JSON.stringify(args))
        }
    });
}

// should be called when page changes
function reMirror()
{


    //send clear command
    screenConnection.invoke("clearDom",screenSharingSessionId)


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

// function sendIframeBaseUrl()
// {
//
//     //send the base of the iframe page
//     var baseUrl=iframe.location.href.match(/^(.*\/)[^\/]*$/)[1];
//     screenConnection.invoke("sendBaseUrlChanged",screenSharingSessionId,baseUrl)
// }


function mouseUp()
{
    screenConnection.invoke("mouseUp",screenSharingSessionId)
}

function mouseDown()
{
    screenConnection.invoke("mouseDown",screenSharingSessionId)
}

function mouseOver(event)
{
    var path = getDomPath(event.target);
    screenConnection.invoke("mouseOver",screenSharingSessionId,path)
}

function mouseOut(event)
{
    var path = getDomPath(event.target);
    screenConnection.invoke("mouseOut",screenSharingSessionId,path)
}

function inputChanged(event)
{
    var path = getDomPath(event.target);
    var content=""
    if(event.target.type==='checkbox')
        content = String(event.target.checked)
    else if(event.target.type==='radio')
        content = String(event.target.checked)
/*    else if(event.target.type==='select')
        content = String(event.target.value)*/
    else if(event.target.type==='select-one')
        content = String(event.target.selectedIndex)
    else if(event.target.type==='select-multiple')
        content = String(event.target.value)
    else
        content= event.target.value
    screenConnection.invoke("inputChanged",screenSharingSessionId,path,content)
    console.info("inputChanged: ",content)
}

// closing


window.onbeforeunload = function () {
    if (Videosession) Videosession.disconnect()
};




// utilites


// modificated from https://gist.github.com/karlgroves/7544592
function getDomPath(el) {
    var stack = [];
    while ( el.parentNode != null ) {
        var sibCount = 0;
        var sibIndex = 0;
        for ( var i = 0; i < el.parentNode.childNodes.length; i++ ) {
            var sib = el.parentNode.childNodes[i];
            if ( sib.nodeName == el.nodeName ) {
                if ( sib === el ) {
                    sibIndex = sibCount;
                }
                sibCount++;
            }
        }
        if ( el.hasAttribute('id') && el.id != '' ) {

            stack.unshift(el.nodeName.toLowerCase() +"[@id='"+el.id+"']");
        } else if ( sibCount > 1 ) {
            stack.unshift(el.nodeName.toLowerCase() + '[' + (sibIndex+1) + ']');
        } else {
            stack.unshift(el.nodeName.toLowerCase());
        }
        el = el.parentNode;
    }
    stack=stack.slice(1); // removes the html element

    var xpath=""
    while(stack.length>0)
    {
        xpath=xpath+'/'+stack.shift()
    }
    return xpath
}
