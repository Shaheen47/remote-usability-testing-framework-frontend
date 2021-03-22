
//screensharing
var screenSharingSessionId="dsasT23F"
var screenSharingHubUrl="https://localhost:5005/DomHub"
var screenConnection
var iframe



 function joinSession() {
    joinScreensharingSession()
}


//Screensharing

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

    iframe= document.getElementById("mirrorIFrame").contentWindow;

    //add listeners

    // Usage:
    iframeURLChange(document.getElementById("mirrorIFrame"), function (newURL) {
    console.log("URL changed:", newURL);
    reMirror()
});
 



    iframe.document.documentElement.addEventListener('mousemove',function (e)
    {
        var e = window.event;
        var posX = e.clientX;
        var posY = e.clientY;
        console.debug("mouse :",posX," ",posY)
        screenConnection.invoke("sendMousePosition",screenSharingSessionId,e.x,e.y)
    })

    iframe.addEventListener('scroll',function (e)
    {
        let el=document.getElementById("mirrorIFrame").contentWindow.document.documentElement
        console.debug(el.scrollTop," ",el.scrollLeft)
        screenConnection.invoke("sendScroll",screenSharingSessionId,el.scrollTop)
    })

    // join the session
    screenConnection.invoke("joinSession",screenSharingSessionId)

    // start screensharing
    startMirroring();
}


function startMirroring()
{
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
    
    mirrorClient = new TreeMirrorClient( document.getElementById("mirrorIFrame").contentWindow.document.documentElement, {
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

