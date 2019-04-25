/*
  Cole Blakley
  CSC 337
  Final Project

  This program runs a web service that gives various data to main.js and team-search.js
  using an SQL database/JSON files. It has several "modes" of GET requests. "initial-matchups"
  mode sends the first 32 games of the tournament as JSON, "winner" determines the winner of
  a given matchup, "full-bracket" sends the correct bracket as JSON, "team" send the stats
  for all players on a given team, and "load-user" sends the stat name associated with a
  known user's name. Additionally, a POST request can be used to associate a user's name
  with a stat name, allowing them to regenerate their bracket at a later time.
*/
(function() {
    "use strict";
    const express = require("express");
    const app = express();
    const bodyParser = require("body-parser");
    const jsonParser = bodyParser.json();
    //Avoid CORS errors
    app.use(express.static("public"));
    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers",
                   "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });
    const fs = require("fs");
    const mysql = require("mysql");
    let connection = mysql.createConnection({
        host: "us-cdbr-iron-east-02.cleardb.net",
        database: "heroku_773aec2ba21032d",
        user: "b36475d0fffd42",
        password: "ed4df197",
    });

    /** This function queries the database to compare the values for 2 teams for
        a given stat, and sends the name of the winner to the client */
    function sendWinner(connection, res, name1, name2, stat) {
        connection.query("SELECT name FROM team_stats "+
                         "JOIN teams ON teams.id = team_stats.team_id "+
                         "WHERE name='"+name1+"' OR name='"+name2+
                         "' ORDER BY team_stats."+stat+" DESC LIMIT 1",
                         function(err, result, fields) {
                             if(err) {
                                 throw err;
                                 //Tell client that query ran into error
                                 res.sendStatus(500);
                             } else {
                                 //Otherwise, send winning team's name to client
                                 res.send(JSON.stringify(result));
                             }
                         });
    }

    /** This function queries the database to get a list of stats about all players
        on a given team (represented by teamId). It then sends this data to the client */
    function sendPlayerStats(connection, res, teamId) {
        connection.query("SELECT players.name, class, position, hometown, high_school "+
                         "FROM players JOIN teams ON teams.id = players.team_id "+
                         "WHERE teams.id = "+teamId,
                         function(err, result, fields){
                             if(err) throw err;
                             res.send(result);
                         });
    }

    connection.connect(function() {
	//Keep connection active so it isn't closed automatically by Heroku
	setInterval(maintainConnection, 20000);
	//Handle GET requests
        app.get('/', function(req, res){
            res.header("Access-Control-Allow-Origin", "*");
            if(req.query.mode === "initial-matchups") {
                //Send the client all of the matchups in round 0 (32 matchups)
                let initialMatchups = JSON.parse(fs.readFileSync("initial-matchups.json", "utf8"));
                res.send(JSON.stringify(initialMatchups));
            } else if(req.query.mode === "winner") {
                //Send the client the winner out of two given teams
                sendWinner(connection, res, req.query.name1, req.query.name2, req.query.stat);
            } else if(req.query.mode === "full-bracket") {
                //Send the client a JSON structure representing the full, correct tournament
                let fullBracket = JSON.parse(fs.readFileSync("matchups.json", "utf8"));
                res.send(JSON.stringify(fullBracket));
            } else if(req.query.mode === "team") {
                //Find the ID of a team with given name, then sends client that team's stats
                let teamName = req.query.name;
                connection.query("SELECT id FROM teams WHERE name = "+
                                 connection.escape(teamName), function(err, result, fields) {
                                     if(err) throw err;
                                     if(result[0]) {
                                         //If team id found, find team's player stats 
                                         let teamId = result[0].id;
                                         sendPlayerStats(connection, res, teamId);
                                     } else {
                                         //Tell client that the teamname not found
                                         res.sendStatus(404);
                                     }
                                 });
            } else if(req.query.mode === "load-user") {
                //Send the client a JSON file representing a saved bracket with the
                //given name
                fs.readFile("user-brackets/"+req.query.name
                                           +".json", "utf8", function(err, data) {
                    if(err) {
                        //Tell client if user's bracket not founf
                        res.sendStatus(404);
                    } else {
                        //If found, send the bracket to the user
                        res.send(JSON.stringify(data));
                    }
                });
            }
        });
	//Handle client POSTing a new bracket to be saved
	app.post('/', jsonParser, function(req, res) {
            //When the client wants to save a bracket, write it into a JSON file
            res.header("Access-Control-Allow-Origin", "*");
            let userStat = req.body.stat;
            fs.writeFile("user-brackets/"+req.body.name+".json", userStat, function(err) {
                if(err) {
                    //Bracket failed to save correctly
                    throw err;
                    res.sendStatus(500);
		} else {
                    res.status(200);
                    res.send("Bracket saved sucessfully");
		}
            });
	});
	
    });
    
    /** Make sure connection stays alive on Heroku (otherwise times out without user
        activity)*/
    function maintainConnection() {
	connection.query('SELECT 1');
    }
    app.listen(process.env.PORT || 3000);
})();
