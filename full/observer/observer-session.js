

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

//server
var urlBase="https://localhost:5001/"
/*var urlBase="https://localhost:5001/"*/

 function joinSession() {



    var xhr = new XMLHttpRequest();
    var url =urlBase+"Session/join-as-observer";
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

     //hide all
     document.getElementById("controlling").style.display = "none"
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


    // DOM change events


    screenConnection.on("domInitialization", (msg,baseUrl) => {
        createNewMirror(baseUrl);
        var initialDom = JSON.parse(msg);
        mirror['initialize'].apply(mirror,initialDom);
        styler.loadDocumentStyles();
    });

    screenConnection.on("domChanges", (msg) => {
        var domChanges = JSON.parse(msg);
        mirror['applyChanged'].apply(mirror,domChanges);
        if(domChanges[1].length>0)
            styler.loadDocumentStyles();
    });

    screenConnection.on("clearDom", () => {
        clearScreensharingPage();
        // createNewMirror();
    });


    // mouse events

    screenConnection.on("mouseUp",()=> {
        document.getElementById("mousePointer").src="mouse-icons/011-mouse-1.svg";
    })

    screenConnection.on("mouseDown",()=> {
        document.getElementById("mousePointer").src="mouse-icons/048-click.svg";
    })


    screenConnection.on("mouseOver",(elementXpath)=> {
        console.debug('mouseover begin')
        var node=iframe.document.evaluate('/html/body/div'+elementXpath,iframe.document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        var x=node.singleNodeValue
        styler.toggleStyle(x, ':hover');
        document.getElementById("mousePointer").style.left = (x.getBoundingClientRect().left+x.getBoundingClientRect().right)/2 +'px';
        document.getElementById("mousePointer").style.top = (x.getBoundingClientRect().top+x.getBoundingClientRect().bottom)/2+'px';
        x.scrollIntoView();
    })

    screenConnection.on("mouseOut",(elementXpath)=> {
        console.debug('mouseOut begin')
        var node=iframe.document.evaluate('/html/body/div'+elementXpath,iframe.document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        var x=node.singleNodeValue
        styler.toggleStyle(x, ':hover');
    })

    // inputs
    screenConnection.on("inputChanged",(elementXpath,inputContent)=> {
        var node = iframe.document.evaluate('/html/body/div' + elementXpath, iframe.document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        var x = node.singleNodeValue
        if(x.type==='checkbox')
        {
            if(inputContent==="true")
                x.checked=true
            else
                x.checked=false
        }
        else if(x.type==='radio')
            x.checked = inputContent
        else if(x.type==='select-one')
            x.selectedIndex = inputContent
        else
            x.value = inputContent
        console.info("inputChanged: ",inputContent," , ",elementXpath)
    })



    screenConnection.on("leaveSession", () => {
        screenConnection.connection.stop()
    })

}

function createNewMirror(baseUrl)
{
    var myFrameDoc = document.getElementById('mirrorIFrame').contentDocument;
    myFrameDoc.write('<div id="mirror" style="top: 0;left: 0; width:100%; height:100%;overflow: scroll ; position: relative">' +
        '</div>');

    let m=document.getElementById("mirrorIFrame").contentWindow.document.getElementById("mirror")
    mirror = new TreeMirror(m, {
        createElement: function(tagName) {
            if (tagName == 'SCRIPT') {
                var node = document.createElement('NO-SCRIPT');
                node.style.display = 'none';
                return node;
            }

            if (tagName == 'HEAD') {
                var node = document.createElement('HEAD');
                node.appendChild(document.createElement('BASE'));
                node.firstChild.href = baseUrl;
                return node;
            }
        }
    });

}

function clearScreensharingPage() {
    let m=document.getElementById("mirrorIFrame").contentWindow.document.getElementById("mirror")
    while (m.firstChild) {
        m.removeChild(m.firstChild);
    }
}

function clearScreensharingPage() {
    let m=document.getElementById("mirrorIFrame").contentWindow.document.getElementById("mirror")
    while (m.firstChild) {
        m.removeChild(m.firstChild);
    }
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

    chatConnection.on("leaveSession", () => {
        chatConnection.connection.stop()
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