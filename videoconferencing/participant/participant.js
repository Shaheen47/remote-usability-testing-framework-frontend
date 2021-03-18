var OV;
var session;

let token;

function joinSession() {

    var xhr = new XMLHttpRequest();
    var url = "https://localhost:5001/Session/join-session-participant";
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
        session.subscribe(event.stream, "subscriber");
    });

    session.connect(token)
        .then(() => {
            var publisher = OV.initPublisher("publisher");
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
