(function() {
    "use strict";
    const siteUrl = "http://march-madness-app.herokuapp.com:";
    function checkStatus(response) {
        if (response.status >= 200 && response.status < 300) {
            return response.text();
	} else if(response.status === 404) {
	    //Data requested wasn't found
	    return Promise.reject(new Error(response.status));
        } else {
            return Promise.reject(new Error(response.status+":"+response.statusText));
        }
    }

    function displayError(message) {
	let errorArea = document.getElementById("error-area");
	let messageElement = document.createElement("p");
	messageElement.innerHTML = message;
	errorArea.appendChild(messageElement);
    }

    function clearStatTable() {
        let dataRows = document.querySelectorAll("#stat-table tr");
        let statTable = document.getElementById("stat-table");
        if(dataRows.length > 1) {
            //Remove all rows except the first row, which has column headers
            for(let i=1; i<dataRows.length; i++) {
                statTable.removeChild(dataRows[i]);
            }
        }
    }

    function selectTeam() {
	clearStatTable();
        let teamName = document.querySelector("#search-area input").value;
        let url = siteUrl+process.env.PORT+"?mode=team&name="+teamName;
        fetch(url)
            .then(checkStatus)
            .then(function(responseText) {
		//Clear any errors;
		document.getElementById("error-area").innerHTML = "";
                let playersData = JSON.parse(responseText);
                let statTable = document.getElementById("stat-table");
                //Add players' data to table; one player per row
                for(let i=0; i<playersData.length; i++) {
                    //Get array of all stats for a particular player
                    let player = Object.values(playersData[i]);
                    let row = document.createElement("tr");
                    for(let j=0; j<player.length; j++) {
                        let cell = document.createElement("td");
                        cell.innerHTML = player[j];
                        row.appendChild(cell);
                    }
                    statTable.appendChild(row);
                }
            })
            .catch(function(error) {
		if(error.message === "404") {
		    displayError("Team '"+teamName+"' not found");
		}
                console.log(error);
        });
    }
    
    window.onload = function() {
        //TEAM STAT SEARCH MODE
        document.getElementById("team-search-button").onclick = selectTeam;
    };
})();
