/*
  Cole Blakley
  CSC 337
  Final Project

  This program creates an interactive NCAA Tournament bracket generator. By choosing
  a stat (e.g. win-loss percent, total rebounds), the program uses stat data from the
  server to decide the winner of each matchup in the tournament, automatically filling
  out the bracket as if the user chose each winner based on which team had the higher
  stat value. Additionally, users can save their generator brackets to the server, or
  load brackets already stored on the server.
*/
(function() {
    "use strict";
    //How many round are in the tournament (champion at end counts as 1 round)
    const ROUND_AMOUNT = 6;
    //Name of stat currently display on screen
    let currentStat = "";
    //siteUrl is the web address of the remote server
    const siteUrl = "http://march-madness-app.herokuapp.com:"+process.env.PORT;
    //const siteUrl = "http://localhost:3000";

    /** This function checks that the server responded with a success code. If it did,
        the promise was kept and the program uses the received data. If a failure, it
        lets the calling function know the error code */
    function checkStatus(response) {
        if (response.status >= 200 && response.status < 300) {
	    //Successful request; return the data
	    return response.text();
	} else if(response.status === 404) {
	    //Data requested wasn't found
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

    /** This function re-enables any disabled buttons representing the possible
        stat choices for the bracket generator to use */
    function resetButtons() {
        let statButtons = document.querySelectorAll("button.stat-button");
        for(let i=0; i<statButtons.length; i++) {
            statButtons[i].disabled = "";
        }
    }

    /** This function disables all stat buttons besides the one clicked, then starts
        generation of a new bracket for the clicked button's value */
    function selectStat() {
        //Disable all other stat selection buttons
        let statButtons = document.querySelectorAll("button.stat-button");
        for(let i=0; i<statButtons.length; i++) {
            if(statButtons[i] !== this) {
                statButtons[i].disabled = "disabled";
            }
        }
        //Show bracket with predictions based on this button's stat
        displayBracket(this.value);
    }

    /** This function recursively goes through each round of the NCAA tournament,
        starting from the 1st round, whose matchups are pre-determined. Based on the
        given stat and a given set of matchups (matchups is a 2D array, where each
        element is a pair of teams representing a matchup in the round), the function
        determines the winners of each matchup, which are then passed in an array 
        to displayWinners(), putting each winner onscreen */
    function findWinners(stat, roundNum, matchups) {
	//winners are the teams that move on to the next round
        let winners = [];
	//Find the winner of each matchup, display it
        for(let i=0; i<matchups.length; i++) {
	    //name1 and name2 are the teamnames of the teams in the current matchup
            let name1 = matchups[i][0];
            let name2 = matchups[i][1];
	    //Query server to determine who has higher stat for user-chosen stat type
            let url = siteUrl+"?mode=stat&stat="+stat+"&name1="+name1+"&name2="+name2;
            fetch(url)
                .then(checkStatus)
                .then(function(responseText) {
		    //Add the winner to the array of winning teams
                    winners.push(JSON.parse(responseText)[0].name.trim());
		    //Once a winner for every round collected, display them
                    if(i === matchups.length-1) {
                        //displayWinners() will put these teams onscreen, then
			//recursively call findWinners() for the next round
                        displayWinners(stat, roundNum, matchups, winners);
                    }
                })
                .catch(function(error) {
                    displayError(message);
            });
        }
    }

    /** This function displays the given array of winning teams, then calls
        findWinners(), passing in the winning teams - now placed into new
        matchups - as its matchups argument. By recursively finding/displaying
        the teams, the bracket is formed, narrowing down the teams by deciding
        the winners of each round until 1 champion is left */
    function displayWinners(stat, roundNum, matchups, winners) {
        //Divs for all rounds; contains several matchups
        let rounds = document.querySelectorAll("#main-content .round");
        let round = rounds[roundNum];
	//nextRound is a div column where all matchup boxes for a round belong
        let nextRound = document.createElement("div");
        nextRound.className = "round";
	//newMatchups is a 2D array, where each element is a pair of winners. These
	//are the matchups that the winners will play in for the next round
        let newMatchups = [];
	//Generate an array of new matchups by grouping teams into 2-team divs onscreen
        for(let i=0; i<round.children.length; i++) {
	    //name1 and name2 are the teamnames of the teams in the current matchup
            let name1 = round.children[i].firstChild.innerHTML;
            let name2 = round.children[i].lastChild.innerHTML;
            //Find the winner of the current matchup; only add the winner to screen
            let winner = "";
            if(winners.includes(name1)) {
                winner = name1;
            } else {
                winner = name2;
            }
            let winnerElement = document.createElement("p");
            winnerElement.innerHTML = winner;
            let foundSlot = false;
            let j = 0;
	    //Find next open slot in next round's div to insert winner
            while(!foundSlot && j<nextRound.children.length) {
		let matchupDiv = nextRound.children[j];
		//If matchup div in the next round has 1 or 2 open slots, add the
		//winner to that div
                if(matchupDiv.children.length < 2) {
                    matchupDiv.appendChild(winnerElement);
		    //Add team to array of matchups for next round
                    newMatchups[newMatchups.length-1].push(winner);
                    foundSlot = true;
                }
                j++;
            }
	    //If no available matchup divs for display, create a new div, add the
	    //winner to that div
            if(!foundSlot) {
                let matchup = document.createElement("div");
                matchup.className = "matchup";
                matchup.appendChild(winnerElement);
                nextRound.appendChild(matchup);
                newMatchups.push([winner]);
            }
        }
	//Once all winners added/matched-up in next round's column, add column to screen
	document.getElementById("main-content").appendChild(nextRound);
        if(roundNum < ROUND_AMOUNT-1) {
            //Recursively find winners for the next round
            findWinners(stat, roundNum+1, newMatchups);
        } else {
            //If bracket done, stop recursion, then check bracket against reality
            checkAccuracy();
        }
    }

    /** This function retrieves the initial 32 matchups (64 teams) of the 1st round
        and displays them onscreen. It then starts the recursive process of determining
        the winner of each round, adding the winners onscreen into new matchups for
        the next round, and then determining that round's winners */
    function displayBracket(stat) {
	//Set module-global indicator of currently-used stat
	currentStat = stat;
        document.getElementById("main-content").innerHTML = "";
        let url = siteUrl+"?mode=initial-matchups";
        fetch(url)
            .then(checkStatus)
            .then(function(responseText) {
                let initialMatchups = JSON.parse(responseText).matchups;
                let firstRound = document.createElement("div");
                firstRound.className = "round";
                //Add each matchup to the page, placing each in correct round column
                for(let i=0; i<initialMatchups.length; i++) {
                    let matchupData = initialMatchups[i];
                    let name1 = matchupData[0];
                    let name2 = matchupData[1];
                    let matchup = document.createElement("div");
                    matchup.className = "matchup";
                    let team1 = document.createElement("p");
                    team1.innerHTML = name1;
                    matchup.appendChild(team1);
                    let team2 = document.createElement("p");
                    team2.innerHTML = name2;
                    matchup.appendChild(team2);
                    firstRound.appendChild(matchup);
                }
                let mainContent = document.getElementById("main-content");
                mainContent.appendChild(firstRound);
                //Begin recursively building bracket for each round, starting with
		//Round 0, the first round
                findWinners(stat, 0, initialMatchups);
            })
            .catch(function(error) {
                displayError(message);
        });
    }

    /** This function returns an object containing the bracket currently represented
        in HTML on the page. The matchups key maps to a 2D array containing 3-element
        arrays in form [team1, team2, roundNumber]. It should contain a total of 63
        matchups (32 + 16 + 8 + 4 + 2 + 1) for a complete bracket */
    function getCurrentBracket() {
	let userBracket = {"matchups":[]};
        let rounds = document.querySelectorAll(".round");
        console.log(rounds);
        //For each round in the tournament, add a series of matchups
        for(let i=0; i<rounds.length; i++) {
            let round = rounds[i];
            //For each matchup in round, create an array containing the teams/round number
            for(let j=0; j<round.children.length; j++) {
                let matchupDiv = round.children[j];
                let matchup = [];
                //For each team in matchup
                for(let z=0; z<matchupDiv.children.length; z++) {
                   matchup.push(matchupDiv.children[z].innerHTML);
                }
                //Add round identifier
                matchup.push(i);
                userBracket.matchups.push(matchup);
            }
        }
	return userBracket;
    }

    /** This function steps through the currently-displayed bracket and checks if
        each team in each matchup ended up in that matchup in the real tournament.
        It then calculates/displays the percentage of teams guessed correctly */
    function checkAccuracy() {
        let userBracket = getCurrentBracket();
        console.log(userBracket);
        let url = siteUrl+"?mode=full-bracket";
        fetch(url)
            .then(checkStatus)
            .then(function(responseText) {
                //fullBracket is the actual tournament bracket
                let fullBracket = JSON.parse(responseText);
                let matchupsCorrect = 0;
                //Skip first 32 matchups; they are known, always accurately guessed
                for(let i=32; i<fullBracket.matchups.length; i++) {
                    console.log("User: " + userBracket.matchups[i]
                                + " | Real: " + fullBracket.matchups[i]);
                    //Check if each team in predicted matchup actually was in that matchup
                    for(let j=0; j<2; j++) {
                        if(fullBracket.matchups[i].includes(userBracket.matchups[i][j])) {
                            matchupsCorrect++;
                        }
                    }
                }
		//Show percentage (rounded to 2 decimals) guessed correctly onscreen
                let percentCorrect = document.getElementById("percent-correct");
                percentCorrect.innerHTML = ((matchupsCorrect / 125) * 100).toFixed(2);
            })
            .catch(function(error) {
                displayError(message);
        });
    }

    /** This function saves the currently-displayed bracket into a file on the
        server under a user-entered name */
    function saveBracket() {
	//Only save the bracket if something is onscreen
	if(currentStat !== "") {
	    let userName = document.getElementById("save-user-name").value;
	    const message = { "name": userName, "stat" : currentStat };
	    const fetchOptions = {
		method : 'POST',
		headers : {
		    'Accept' : 'application/json',
		    'Content-Type' : 'application/json'
		},
		body : JSON.stringify(message)
	    };
	    console.log(fetchOptions);
	    let url = siteUrl+process.env.PORT;
	    //Post the new bracket (as JSON) onto the server
	    fetch(url, fetchOptions)
		.then(checkStatus)
		.then(function(responseText) {
		    //Show success message to user
		    displayError(responseText);
		})
		.catch(function(error) {
		    //Tell user that bracket did not properly save
		    displayError(responseText);
		});
	}
    }

    /** This function retrieves a tournament bracket from the server under the
        user-given name, displaying it onscreen */
    function loadBracket() {
	let userName = document.getElementById("load-user-name").value;
	let url = siteUrl+"?mode=load-user&name="+userName;
	fetch(url)
	    .then(checkStatus)
	    .then(function(responseText) {
		displayBracket(responseText);
	    })
	    .catch(function(error) {
		displayError(error);
	});
    }

    /** When the page loads, this function binds the reset, save bracket, and
        load bracket buttons to their proper functions, and binds all stat
        buttons to display brackets based on their respective stats onscreen
        when clicked by the user */
    window.onload = function() {
        document.getElementById("reset-button").onclick = resetButtons;
	document.getElementById("save-button").onclick = saveBracket;
	document.getElementById("load-button").onclick = loadBracket;
        let statButtons = document.querySelectorAll("button.stat-button");
        for(let i=0; i<statButtons.length; i++) {
            statButtons[i].onclick = selectStat;
        }
    };
})();
