
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

    chatConnection.on("leaveSession", () => {
        chatConnection.connection.stop()
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
    var chatmessage=document.getElementById("chatMessage").value;
    chatConnection.invoke("sendMessage",'Moderator', chatmessage);
    document.getElementById("chatMessage").value="";
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



    createNewMirror();


    screenConnection.on("sentDom", (dom) => {
        var msg = JSON.parse(dom);
         handleScreensharingMessage(msg);
    });

    // mouse events

    screenConnection.on("sentMousePosition", (x,y) => {
        // var xOffset=document.getElementById("outerMirror").getBoundingClientRect().left
        // var yOffset=document.getElementById("outerMirror").getBoundingClientRect().top
        // var width=document.getElementById("outerMirror").getBoundingClientRect().width;
        // var height=document.getElementById("outerMirror").getBoundingClientRect().height;
        // width=width*x/100
        // height=height*y/100
        // width=width+xOffset
        // height=height+yOffset
        // document.getElementById("mousePointer").style.left = width+ 'px';
        // document.getElementById("mousePointer").style.top = height + 'px';



         // var mirrorX=parseInt(document.getElementById("outerMirror").style.width, 10)
         // var mirrorY=parseInt(document.getElementById("outerMirror").style.height,10)
        // var mirrorX=mirrorX*x/100 ;
        // var mirrorY=mirrorY*y/100;
        var width=document.getElementById("mirrorIFrame").contentWindow.document.getElementById("mirror").getBoundingClientRect().width
        var height=document.getElementById("mirrorIFrame").contentWindow.document.getElementById("mirror").getBoundingClientRect().height
        console.debug('recived X:',x)
        console.debug('recived Y:',y)
        var mirrorX=x*width/100;
        var mirrorY=y*height/100;
        console.debug('mirrorX:',mirrorX)
        console.debug('mirrorY:',mirrorY)

        // document.getElementById("mousePointer").style.left = mirrorX+ 'px';
        // document.getElementById("mousePointer").style.top = mirrorY + 'px';
        document.getElementById("mousePointer").style.left = x+ '%';
        document.getElementById("mousePointer").style.top = y + '%';


    })

    screenConnection.on("mouseUp",()=> {
        document.getElementById("mousePointer").src="../mouse-icons/011-mouse-1.svg";
    })

    screenConnection.on("mouseDown",()=> {
        document.getElementById("mousePointer").src="../mouse-icons/048-click.svg";
    })



    screenConnection.on("mouseOver",(elementXpath)=> {
        console.debug('mouseover begin')
        var node=iframe.document.evaluate('/html/body/div'+elementXpath,iframe.document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        var x=node.singleNodeValue
        styler.toggleStyle(x, ':hover');
        // console.debug('mouseOver end')
    })

    screenConnection.on("mouseOut",(elementXpath)=> {
        console.debug('mouseOut begin')
        var node=iframe.document.evaluate('/html/body/div'+elementXpath,iframe.document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        var x=node.singleNodeValue
        styler.toggleStyle(x, ':hover');
        // console.debug('mouseOut end')


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

    // scrolling

    screenConnection.on("sentScroll", (vertical) => {
        let el=document.getElementById("mirrorIFrame").contentWindow.document.getElementById("mirror")
        //let el=document.getElementById("mirrorIFrame").contentDocument
        // To set the scroll
        el.scrollTop = vertical;
    })



    screenConnection.on("leaveSession", () => {
        screenConnection.connection.stop()
    })

}

function createNewMirror()
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
                node.firstChild.href = 'http://localhost:3000';
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

async function handleScreensharingMessage(msg) {
    if (msg.clear) {
        clearScreensharingPage();
        createNewMirror();

    }

    else if (msg.base) {
    }
    else {
        await mirror[msg[0].f].apply(mirror, msg[1].args);
        if(msg[0].f==='initialize' || msg[1].args[1].length>0)
            await styler.loadDocumentStyles();
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

    // close chat session
    chatConnection.invoke("closeSession",chatSessionId);

    // close screensharing session
    screenConnection.invoke("closeSession",screenSharingSessionId);
}




function leaveVideoSession() {
    Videosession.disconnect();
}

window.onbeforeunload = function () {
    if (Videosession) Videosession.disconnect()
};


// new for mouse events
