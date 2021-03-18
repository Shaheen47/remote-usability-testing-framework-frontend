
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

/*
screenConnection.on("sentMessage", (user, message) => {
    const li = document.createElement("li");
    li.textContent = `${user}: ${message}`;
    document.getElementById("messageList").appendChild(li);
});
*/

/*
screenConnection.on("sentInitialDom", (user,rootid, message) => {
    document.getElementById("mirror").innerHTML=JSON.parse(message);
});
*/




// dom changes
var mirror

window.addEventListener('DOMContentLoaded', function() {
    createNewMirror();
/*    socket.onclose = function() {
        socket = new WebSocket(receiverURL);
    }*/
});

function clearPage() {
    while (document.getElementById("mirror").firstChild) {
        document.getElementById("mirror").removeChild(document.getElementById("mirror").firstChild);
    }
}

function handleMessage(msg) {
    if (msg.clear) {
        clearPage();
        createNewMirror();
    }
    else if (msg.base)
        base = msg.base;
    else
        /* mirror['initialize'].apply(mirror, msg[1].args);*/
        mirror[msg[0].f].apply(mirror, msg[1].args);
    console.debug("mirror[msg[0].f].apply(mirror, msg[1].args) called")
}

screenConnection.on("sentDom", (user,dom) => {
    var msg = JSON.parse(dom);
    console.debug("here we go2",msg)
    /*if (msg instanceof Array) {
        console.debug("here we go3",JSON.parse(subMessage))
        msg.forEach(function(subMessage) {
            console.debug("here we go3",JSON.parse(subMessage))
            handleMessage(JSON.parse(subMessage));
        });
    } else {*/
    handleMessage(msg);
    /*        }*/
});

// mouse movement

screenConnection.on("sentMousePosition", (user,x,y) => {
    document.getElementById("mousePointer").style.position = 'absolute';
    document.getElementById("mousePointer").style.left = x + 'px';
    document.getElementById("mousePointer").style.top = y + 'px';
    
})

// scrolling

    

screenConnection.on("sentScroll", (user,vertical) => {
    console.debug(vertical)
    let el=document.getElementById("mirror")
    // To set the scroll
    el.scrollTop = vertical;
})

function createNewMirror()
{
    var base;

    mirror = new TreeMirror(document.getElementById("mirror"), {
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