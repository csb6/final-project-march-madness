(function() {
    "use strict";
    //How many round are in the tournament
    const ROUND_AMOUNT = 6;
    //Name of stat currently display on screen
    let currentStat = "";
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

    function resetButtons() {
        let statButtons = document.querySelectorAll("button.stat-button");
        for(let i=0; i<statButtons.length; i++) {
            statButtons[i].disabled = "";
        }
    }

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

    function findWinners(stat, roundNum, matchups) {
        let winners = [];
        for(let i=0; i<matchups.length; i++) {
            let name1 = matchups[i][0];
            let name2 = matchups[i][1];
            let url = siteUrl+process.env.PORT+"?mode=stat&stat="+stat+"&name1="+name1+
                "&name2="+name2;
            fetch(url)
                .then(checkStatus)
                .then(function(responseText) {
                    winners.push(JSON.parse(responseText)[0].name.trim());
                    if(i === matchups.length-1) {
                        //Recursively display the winners after finding them
                        displayWinners(stat, roundNum, matchups, winners);
                    }
                })
                .catch(function(error) {
                    console.log(error);
            });
        }
    }

    function displayWinners(stat, roundNum, matchups, winners) {
        //Divs for all rounds; contains several matchups
        let rounds = document.querySelectorAll("#main-content .round");
        let round = rounds[roundNum];
        let nextRound = document.createElement("div");
        nextRound.className = "round";
        let newMatchups = [];
        for(let i=0; i<round.children.length; i++) {
            let name1 = round.children[i].firstChild.innerHTML;
            let name2 = round.children[i].lastChild.innerHTML;
            //Find the winner using the matchup's 2 teams and a given stat
            let winner = "";
            if(winners.includes(name1)) {
                winner = name1;
            } else {
                winner = name2;
            }
            let teamText = document.createElement("p");
            teamText.innerHTML = winner;
            //Find location in next round's column to insert teamname
            let foundSlot = false;
            let j = 0;
            while(!foundSlot && j<nextRound.children.length) {
                if(nextRound.children[j].children.length < 2) {
                    nextRound.children[j].appendChild(teamText);
                    newMatchups[newMatchups.length-1].push(winner);
                    foundSlot = true;
                }
                j++;
            }
            if(!foundSlot) {
                let matchup = document.createElement("div");
                matchup.className = "matchup";
                matchup.appendChild(teamText);
                nextRound.appendChild(matchup);
                newMatchups.push([winner]);
            }
            let mainContent = document.getElementById("main-content");
            mainContent.appendChild(nextRound);
        }
        if(roundNum < ROUND_AMOUNT-1) {
            //Recursively find winners for the next round
            findWinners(stat, roundNum+1, newMatchups);
        } else {
            //If bracket done, stop, check accuracy
            checkAccuracy();
        }
    }

    function displayBracket(stat) {
	//Set module-global indicator of currently-used stat
	currentStat = stat;
        document.getElementById("main-content").innerHTML = "";
        let url = siteUrl+process.env.PORT+"?mode=initial-matchups";
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
                //Build bracket for each round
                findWinners(stat, 0, initialMatchups);
            })
            .catch(function(error) {
                console.log(error);
        });
    }

    function getCurrentBracket() {
	let userBracket = {"matchups":[]};
        let rounds = document.querySelectorAll(".round");
        console.log(rounds);
        //For each round in the tournament
        for(let i=0; i<rounds.length; i++) {
            let round = rounds[i];
            //For each matchup in round
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

    function checkAccuracy() {
        let userBracket = getCurrentBracket();
        console.log(userBracket);
        let url = siteUrl+process.env.PORT+"?mode=full-bracket";
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
                let percentCorrect = document.getElementById("percent-correct");
                percentCorrect.innerHTML = ((matchupsCorrect / 127) * 100).toFixed(2);
            })
            .catch(function(error) {
                console.log(error);
        });
    }

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
	    fetch(url, fetchOptions)
		.then(checkStatus)
		.then(function(responseText) {
		    console.log(responseText);
		})
		.catch(function(error) {
		    console.log(error);
		});
	}
    }

    function loadBracket() {
	let userName = document.getElementById("load-user-name").value;
	let url = siteUrl+process.env.PORT+"?mode=load-user&name="+userName;
	fetch(url)
	    .then(checkStatus)
	    .then(function(responseText) {
		displayBracket(responseText);
	    })
	    .catch(function(error) {
		console.log(error);
	});
    }

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
