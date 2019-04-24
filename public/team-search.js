/*
  Cole Blakley
  CSC 337
  Final Project

  This program creates an interactive page that allows users to enter a teamname
  into a search bar and see a table containing information about each player on
  that team, such as their name and position. If a teamname cannot be found or
  an error occurs, the user is informed with an oncreen message.
*/
(function() {
    "use strict";
    //siteUrl is the web address of the remote server
    const siteUrl = "http://march-madness-app.herokuapp.com";
    //const siteUrl = "http://localhost:3000";

    /** This function checks that the server responded with a success code. If it did,
        the promise was kept and the program uses the received data. If a failure, it
        lets the calling function know the error code */
    function checkStatus(response) {
        if (response.status >= 200 && response.status < 300) {
	    //Successful request; return the data
            return response.text();
	} else if(response.status === 404) {
	    //Data requested wasn't found; return the error code
	    return Promise.reject(new Error(response.status));
        } else {
            return Promise.reject(new Error(response.status+":"+response.statusText));
        }
    }

    /** This function places a given text message in the area above the page header,
        informing the user of any errors that may occur. Errors are added sequentially
        and are not cleared when this function is called */
    function displayError(message) {
	let errorArea = document.getElementById("error-area");
	let messageElement = document.createElement("p");
	messageElement.innerHTML = message;
	errorArea.appendChild(messageElement);
    }

    /** This function removes all rows besides the header row from the HTML table
        that contains the various stats about a team's players. */
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

    /** This function places a row containing the set of data about a given player
	into the onscreen table */
    function addTableRow(player) {
	let statTable = document.getElementById("stat-table");
	let row = document.createElement("tr");
	//Add each cell to the row; then, add the row to the table
        for(let j=0; j<player.length; j++) {
            let cell = document.createElement("td");
            cell.innerHTML = player[j];
            row.appendChild(cell);
        }
        statTable.appendChild(row);
    }

    /** This function attempts to get the set of player stats for the queried NCAA
	team, refreshing the onscreen table to show the requested team's stats. If
        the team isn't in the database, it shows an error message to the user */
    function selectTeam() {
	//Remove any existing data in the table
	clearStatTable();
	//Query the server for the user-inputted team name
        let teamName = document.querySelector("#search-area input").value;
        let url = siteUrl+"?mode=team&name="+teamName;
        fetch(url)
            .then(checkStatus)
            .then(function(responseText) {
		//On a success, clear any prior errors
		document.getElementById("error-area").innerHTML = "";
                let playersData = JSON.parse(responseText);
                //Add players' data to table; one player per row
                for(let i=0; i<playersData.length; i++) {
                    //Get simple array of all stats for a particular player
                    let player = Object.values(playersData[i]);
		    //Place row onsccreen containing data about the player
                    addTableRow(player);
                }
            })
            .catch(function(error) {
		if(error.message === "404") {
		    //Tell user if team wasn't in the tournament
		    displayError("Team '"+teamName+"' not found");
		}
                displayError(error);
        });
    }

    /** When the page loads, this function binds the search button to query the
        database for the player data of a user-given NCAA team */
    window.onload = function() {
        document.getElementById("team-search-button").onclick = selectTeam;
    };
})();
