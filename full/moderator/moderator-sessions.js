

var urlBase="https://localhost:5001/"

getSessions();

function getSessions()
{
    var url=urlBase+"Session";

    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState == XMLHttpRequest.DONE) {
            var data = JSON.parse(xhr.responseText);
            data.forEach(function(message) {
                appendRow(message.id,"s",message.sessionDate)
            });

        }
    }
    xhr.open('GET', url, true);
    xhr.send(null);
}

function replySession()
{
    var sessionId=document.getElementById("sessionIdInput").value;
    window.location.replace("moderator-reply-session.html?sessionId="+sessionId);
}

// append row to the HTML table
function appendRow(id,name,date) {
    var tbl = document.getElementById('sessions-table'), // table reference
        row = tbl.insertRow(tbl.rows.length),i;      // append table row
        createCell(row.insertCell(0), id);
        createCell(row.insertCell(1), name);
        createCell(row.insertCell(2), date);
}

// create DIV element and append to the table cell
function createCell(cell, text,) {
    var div = document.createElement('div'), // create DIV element
        txt = document.createTextNode(text); // create text node
    div.appendChild(txt);                    // append text node to the DIV
    cell.appendChild(div);                   // append DIV to the table cell
}
