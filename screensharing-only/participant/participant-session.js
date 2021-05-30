
//screensharing
var screenSharingSessionId
var screenSharingHubUrl
var screenConnection



//sever
var urlBase="https://localhost:5005/"

 function joinSession() {
     screenSharingSessionId=document.getElementById("sessionIdInput").value
     screenSharingHubUrl="https://localhost:5005/ScreenMirroringHubWithRecording"
    joinScreensharingSession()
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

    iframe.addEventListener('mouseover',mouseOver)

    iframe.addEventListener('mouseout',mouseOut)

    iframe.addEventListener('input',inputChanged)
    iframe.addEventListener('paste',inputChanged)

    //send iframe  base
    sendIframeBaseUrl();

    // mirror

    mirrorClient = new TreeMirrorClient( iframe.document.documentElement, {
        initialize: function ( rootId, children) {
            let args=[rootId,children]
            let a=[{'f':'initialize'},{'args':args}]
            screenConnection.invoke("sendDom",screenSharingSessionId,JSON.stringify(a))
        },

        applyChanged: function (removed, addedOrMoved, attributes, text) {
            let args=[removed,addedOrMoved,attributes,text]
            let a=[{'f':'applyChanged'},{'args':args}]
/*            console.info("attributes",attributes)
            console.info("addedOrMoved",addedOrMoved)
            console.info("text",text)*/
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

function sendIframeBaseUrl()
{
    //send the base of the iframe page
    var base=iframe.location.href.match(/^(.*\/)[^\/]*$/)[1];
    let a={'base':base}
    screenConnection.invoke("sendDom",screenSharingSessionId,JSON.stringify(a))
}

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
/*    console.debug("mouse :",posX," ",posY)*/
    screenConnection.invoke("sendMousePosition",screenSharingSessionId,e.x,e.y)

}

function scrollMirror(e)
{
    let el=iframe.document.documentElement
/*    console.debug(el.scrollTop," ",el.scrollLeft)*/
    screenConnection.invoke("sendScroll",screenSharingSessionId,el.scrollTop)
}

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
