

var chatConnection

initChatConnection("https://localhost:5001/ChatHub")

async function initChatConnection(hubUrl)
{  
    chatConnection = new signalR.HubConnectionBuilder()
    .withUrl(hubUrl)
    .configureLogging(signalR.LogLevel.Information)
    .build();

    try {
      await chatConnection.start();
        console.log("SignalR Connected.");
    } catch (err) {
        console.log(err);
        setTimeout(screenSharingstart, 5000);
    }

    // chatConnection.onclose(initializeChat);

    chatConnection.on("chatMessageSent", (senderName,message) => {
        var messageList=document.getElementById("chatList");
        let li = document.createElement('li');
        li.textContent = senderName+" : "+ message;
        messageList.appendChild(li);
    })
}

function sendChatMessage()
{
    var sendername=document.getElementById("senderName").value;
    var chatmessage=document.getElementById("chatMessage").value;
    chatConnection.invoke("sendMessage",1,sendername, chatmessage);
    document.getElementById("chatMessage").value="";
}


