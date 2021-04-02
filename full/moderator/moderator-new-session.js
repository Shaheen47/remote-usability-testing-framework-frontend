
//screensharing
var screenSharingSessionId
var screenSharingHubUrl
var mirror
var screenConnection


//videoconferencing
var moderatorConferenceToken
var OV;
var Videosession;

// chat
var chatConnection
var chatSessionId
var chatHubUrl

// server
var urlBase="https://localhost:5001/"
/*var urlBase="https://localhost:5001/"*/


//
let styler

function createSession()
{
    var url=urlBase+"Session/";

    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 201) {
            var json = JSON.parse(xhr.responseText);
            document.getElementById("sessionIdInput").value=json.id;
        }
    };
    var data
    if(document.getElementById("recordCheckBox").checked===true)
        data=JSON.stringify({"isRecorded":true})
    else
        data=JSON.stringify({"isRecorded":false})
    xhr.send(data);
}


function joinSession() {
    var xhr = new XMLHttpRequest();
    var url = urlBase+"Session/join-as-moderator";
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 201) {
            var json = JSON.parse(xhr.responseText);
            console.debug(json)
            chatSessionId=json.chatSessionId
            chatHubUrl=json.chatHubUrl
            moderatorConferenceToken=json.moderatorConferenceToken
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
                console.debug(xhr.responseText)
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
        Videosession.subscribe(event.stream, "participanStream");
    });

    Videosession.connect(moderatorConferenceToken)
        .then(() => {
            var publisher = OV.initPublisher("ModeratorStream");
            Videosession.publish(publisher);
        })
        .catch(error => {
            console.log("There was an error connecting to the Videosession:", error.code, error.message);
        });
}


// chat

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
        styler.toggleStyle(x, ':hover');
    })

    screenConnection.on("mouseOut",(elementXpath)=> {
        var node=iframe.document.evaluate('/html/body/div'+elementXpath,iframe.document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        var x=node.singleNodeValue
        styler.toggleStyle(x, ':hover');

    })


    // scrolling



    screenConnection.on("sentScroll", (vertical) => {
        console.debug(vertical)
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
/*        if (msg[0].f === "initialize")
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
            leaveVideoSession()
            chatConnection.close()
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




function leaveVideoSession() {
    Videosession.disconnect();
}

window.onbeforeunload = function () {
    if (Videosession) Videosession.disconnect()
};


// new for mouse events
