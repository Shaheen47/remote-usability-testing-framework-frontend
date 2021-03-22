

var screenSharingSessionId
var screenSharingHubUrl


//videoconferencing
var observerConferenceToken
var OV;
var Videosession;
var streamCounter=1;

// chat
var chatConnection
var chatSessionId
var chatHubUrl


 function joinSession() {
    var xhr = new XMLHttpRequest();
    var url = "https://localhost:5001/Session/join-as-observer";
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 201) {
            var json = JSON.parse(xhr.responseText);
            console.info(json)
            chatSessionId=json.chatSessionId
            chatHubUrl=json.chatHubUrl
            observerConferenceToken=json.observerConferencingToken
            screenSharingSessionId=json.screenSharingSessionId
            screenSharingHubUrl=json.screenSharingHubUrl
            //hide and show somethings
            joinConferenceSession()
            joinChatSession(chatHubUrl)
            joinScreensharingSession()

        }
        else 
        {
            if(xhr.readyState === 4 && xhr.status === 400)
            {
                console.info(xhr.responseText)
            }
        }
    };
    var data = JSON.stringify({"sessionId":document.getElementById("sessionIdInput").value});
    xhr.send(data);
}


function joinConferenceSession()
{
    OV = new OpenVidu();
    Videosession = OV.initSession();

    Videosession.on("streamCreated", function (event) {
        if(streamCounter===1)
        {
         Videosession.subscribe(event.stream, "ModeratorStream");
         streamCounter=2
        }
        else
        {
            Videosession.subscribe(event.stream, "participanStream");
        }
        
    });

    Videosession.connect(observerConferenceToken)
        .catch(error => {
            console.log("There was an error connecting to the Videosession:", error.code, error.message);
        });
}


// screensharing

// screensharing

async function joinScreensharingSession()
{
    screenConnection = new signalR.HubConnectionBuilder()
    .withUrl(screenSharingHubUrl)
    .configureLogging(signalR.LogLevel.Information)
    .build();

    try {
        await screenConnection.start();
        console.info("screensharing Connected.");
    } catch (err) {
        console.info(err);
        setTimeout(5000);
    }

    createNewMirror();

    screenConnection.invoke("joinSession",screenSharingSessionId)


    screenConnection.on("sentDom", (user,dom) => {
        var msg = JSON.parse(dom);
        console.info("here we go2",msg)
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

}

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

function clearScreensharingPage() {
    while (document.getElementById("mirror").firstChild) {
        document.getElementById("mirror").removeChild(document.getElementById("mirror").firstChild);
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

//////////////


async function joinChatSession(chatHubUrl)
{  
    chatConnection = new signalR.HubConnectionBuilder()
    .withUrl(chatHubUrl)
    .configureLogging(signalR.LogLevel.Information)
    .build();

    try {
      await chatConnection.start();
        console.log("Chat Connected.");
    } catch (err) {
        console.log(err);
        setTimeout(5000);
    }

    // chatConnection.onclose(initializeChat);


    // messages listeners

    chatConnection.on("userJoined", (message) => {
        var messageList=document.getElementById("chatList");
        let li = document.createElement('li');
        li.textContent = "an Observer has joined";
        messageList.appendChild(li);
    })

    chatConnection.on("userLeft", (message) => {
        var messageList=document.getElementById("chatList");
        let li = document.createElement('li');
        li.textContent = "an Observer has left";
        messageList.appendChild(li);
    })

    chatConnection.on("messageSent", (senderName,message) => {
        var messageList=document.getElementById("chatList");
        let li = document.createElement('li');
        li.textContent = senderName+" : "+ message;
        messageList.appendChild(li);
    })

    //connect with the session
    chatConnection.invoke("joinSession",chatSessionId);
}

function sendChatMessage()
{
    var sendername=document.getElementById("senderName").value;
    var chatmessage=document.getElementById("chatMessage").value;
    chatConnection.invoke("sendMessage",chatSessionId,sendername, chatmessage);
    document.getElementById("chatMessage").value="";
}




function leaveVideoSession() {
    Videosession.disconnect();
}

window.onbeforeunload = function () {
    if (Videosession) Videosession.disconnect()
};