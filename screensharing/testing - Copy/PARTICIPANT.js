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

var mirrorClient;
var iframe
function startMirroring() {

    iframe= document.getElementById("mirrorIFrame").contentWindow;
    document.getElementById("mirrorIFrame").contentWindow.document.documentElement.addEventListener('mousemove',function (e)
    {
        var e = window.event;
        var posX = e.clientX;
        var posY = e.clientY;
        console.debug("mouse :",posX," ",posY)
        screenConnection.invoke("sendMousePosition","participant",e.x,e.y)
    })
    document.getElementById("mirrorIFrame").contentWindow.addEventListener('scroll',function (e)
    {
        let el=document.getElementById("mirrorIFrame").contentWindow.document.documentElement
        console.debug(el.scrollTop," ",el.scrollLeft)
        screenConnection.invoke("sendScroll","participant",el.scrollTop)
    })




    mirrorClient = new TreeMirrorClient( document.getElementById("mirrorIFrame").contentWindow.document.documentElement, {
        initialize: function ( rootId, children) {
            let args=[rootId,children]
            let a=[{'f':'initialize'},{'args':args}]
            screenConnection.invoke("sendDom","participant",JSON.stringify(a))
            /*                args: [rootId, children]*/
        },

        applyChanged: function (removed, addedOrMoved, attributes, text) {
            let args=[removed,addedOrMoved,attributes,text]
            let a=[{'f':'applyChanged'},{'args':args}]
            console.debug("attributes",attributes)
            console.debug("addedOrMoved",addedOrMoved)
            console.debug("text",text)
            screenConnection.invoke("sendDom","participant",JSON.stringify(a))
            /*          args: [removed, addedOrMoved, attributes, text]*/
        }
    });
}


// mouse movement

/*document.addEventListener('mousemove',function (e)
{
    screenConnection.invoke("sendMousePosition","participant",e.x,e.y)
})*/



/*
$(document).ready(function() {
    $('#iframe').mousemove(function() {
        var e = window.event;
        var posX = e.clientX;
        var posY = e.clientY;
        console.debug("mouse :",posX," ",posY)
        screenConnection.invoke("sendMousePosition","participant",e.x,e.y)
    });
});
*/


// scrolling

/*
$(document).ready(function() {
    $('#iframe').scroll(function() {
        let el=document.getElementById("mirror")
        console.debug(document.documentElement.scrollTop," ",document.documentElement.scrollLeft)
        screenConnection.invoke("sendScroll","participant",el.scrollTop)
    });
});
*/


/*
$(document).mousemove(function(e){
    var x = e.pageX - this.offsetLeft;
    var y = e.pageY - this.offsetTop;
    console.debug("relative mouse",e.pageX," ",e.pageY)
}); 
*/
function change()
{
    const li = document.createElement("li");
    li.textContent = `"new": "newwww"`;
    document.getElementById("messageList").appendChild(li);


}