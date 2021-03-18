var OV;
var session;

let token;

function joinSession() {

    var xhr = new XMLHttpRequest();
    var url = "https://localhost:5001/Session/join-session-moderator";
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 201) {
            var json = JSON.parse(xhr.responseText);
            console.log(json.token + ", ");
            token=json.token
            joinVideo()
        }
    };
    var data = JSON.stringify({"sessionName":document.getElementById("sessionId").value});
    xhr.send(data);

}

function joinVideo()
{
    OV = new OpenVidu();
    session = OV.initSession();

    session.on("streamCreated", function (event) {
        session.subscribe(event.stream, "participanStream");
    });

    session.connect(token)
        .then(() => {
            var publisher = OV.initPublisher("ModeratorStream");
            session.publish(publisher);
        })
        .catch(error => {
            console.log("There was an error connecting to the session:", error.code, error.message);
        });
}

function leaveSession() {
    session.disconnect();
}

window.onbeforeunload = function () {
    if (session) session.disconnect()
};


function createSession()
{
    var xhr = new XMLHttpRequest();
    var url = "https://localhost:5001/Session/create-session";
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 201) {
            var json = JSON.parse(xhr.responseText);
            var sessionName=json.sessionName
            document.getElementById("sessionId").value=sessionName
            
        }
    };
  /*  var data = JSON.stringify({"sessionName":document.getElementById("sessionId").value});*/
    var data="{}"
    xhr.send(data);
}


function startRecordSession()
{
    var xhr = new XMLHttpRequest();
    var url = "https://localhost:5001/Recording/start-record";
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 201) {
            var json = JSON.parse(xhr.responseText);
            var sessionName=json.sessionName
            document.getElementById("sessionId").value=sessionName

        }
    };
    /*  var data = JSON.stringify({"sessionName":document.getElementById("sessionId").value});*/
    var data = JSON.stringify({"sessionName":document.getElementById("sessionId").value});
    xhr.send(data);
}

function stopRecordSession()
{
    var xhr = new XMLHttpRequest();
    var url = "https://localhost:5001/Recording/stop-record";
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            var json = JSON.parse(xhr.responseText);
           console.debug(json.url)

        }
    };
    /*  var data = JSON.stringify({"sessionName":document.getElementById("sessionId").value});*/
    var data = JSON.stringify({"sessionName":document.getElementById("sessionId").value});
    xhr.send(data);
}
