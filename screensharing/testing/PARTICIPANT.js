/* global $, JitsiMeetJS */


// screen sharing
const screenConnection = new signalR.HubConnectionBuilder()
    .withUrl("https://localhost:5001/Domhub")
    .configureLogging(signalR.LogLevel.Information)
    .build();

async function screenSharingstart() {
    try {
        await screenConnection.start();
        console.log("SignalR Connected.");
    } catch (err) {
        console.log(err);
        setTimeout(screenSharingstart, 5000);
    }
}

screenConnection.onclose(screenSharingstart);

// Start the connection.
screenSharingstart();

let user
let message

function sendMessage()
 {
     screenConnection.invoke("sendText", "participant", "Hi kid");
}

var mirrorClient;

function startMirroring() {

    var base=location.href.match(/^(.*\/)[^\/]*$/)[1];
    let a={'base':base}
    screenConnection.invoke("sendDom","participant",JSON.stringify(a))

    mirrorClient = new TreeMirrorClient( document.getElementById("mirror"), {
        
        initialize: function ( rootId, children) {
            let args=[rootId,children]
            let a=[{'f':'initialize'},{'args':args}]
            screenConnection.invoke("sendDom","participant",JSON.stringify(a))
/*                args: [rootId, children]*/
        },

        applyChanged: function (removed, addedOrMoved, attributes, text) {
            let args=[removed,addedOrMoved,attributes,text]
            let a=[{'f':'applyChanged'},{'args':args}]
            screenConnection.invoke("sendDom","participant",JSON.stringify(a))
      /*          args: [removed, addedOrMoved, attributes, text]*/
        }
    });
}


function change()
{
    const li = document.createElement("li");
    li.textContent = `"new": "newwww"`;
    document.getElementById("messageList").appendChild(li);
    
    
}

// mouse movement

/*document.addEventListener('mousemove',function (e)
{
    screenConnection.invoke("sendMousePosition","participant",e.x,e.y)
})*/

$(document).ready(function() {
    $('#mirror').mousemove(function() {
        var e = window.event;
        var posX = e.clientX;
        var posY = e.clientY;
        console.debug("mouse :",posX," ",posY)
        screenConnection.invoke("sendMousePosition","participant",e.x,e.y)
    });
});


// scrolling

$(document).ready(function() {
    $('#mirror').scroll(function() {
        let el=document.getElementById("mirror")
        console.debug(document.documentElement.scrollTop," ",document.documentElement.scrollLeft)
        screenConnection.invoke("sendScroll","participant",el.scrollTop)
    });
});